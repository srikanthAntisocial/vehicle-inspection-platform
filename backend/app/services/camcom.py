"""CamCom API integration service.

Encapsulates:
  - POST /client_login         -> obtain JWT
  - POST /gen-trinetra-url     -> create inspection session, get upload URL
  - POST <uploads>             -> upload each captured image

Tokens are cached in-memory; production should persist them in Redis or DB
with expiry tracking. Failures are logged but do not crash the app.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class CamComError(Exception):
    """Wraps any error from CamCom upstream APIs."""


class CamComService:
    def __init__(
        self,
        base_url: Optional[str] = None,
        email: Optional[str] = None,
        password: Optional[str] = None,
        timeout: float = 30.0,
    ):
        self.base_url = (base_url or settings.CAMCOM_BASE_URL).rstrip("/")
        self.email = email or settings.CAMCOM_EMAIL
        self.password = password or settings.CAMCOM_PASSWORD
        self.timeout = timeout

        self._token: Optional[str] = None
        self._token_expires_at: float = 0.0
        self._lock = asyncio.Lock()

    async def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        url = f"{self.base_url}{path}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.request(method, url, **kwargs)
            except httpx.HTTPError as exc:
                logger.exception("CamCom request failed: %s %s", method, url)
                raise CamComError(f"Network error calling CamCom: {exc}") from exc
        return response

    async def login(self, force: bool = False) -> str:
        """Authenticate and return a JWT, caching it until just before expiry."""
        async with self._lock:
            now = time.time()
            if self._token and not force and now < self._token_expires_at - 30:
                return self._token

            logger.info("Logging into CamCom as %s", self.email)
            payload = {"email": self.email, "password": self.password}
            response = await self._request("POST", settings.CAMCOM_LOGIN_PATH, json=payload)
            if response.status_code >= 400:
                raise CamComError(f"CamCom login failed: {response.status_code} {response.text}")
            data = response.json() if response.content else {}

            # Be tolerant of different response shapes.
            token = (
                data.get("token")
                or data.get("access_token")
                or data.get("jwt")
                or (data.get("data") or {}).get("token")
            )
            if not token:
                raise CamComError(f"CamCom login response missing token: {data}")

            # CamCom doesn't always return an explicit expiry; assume 1 hour.
            self._token = token
            self._token_expires_at = now + int(data.get("expires_in", 3600))
            return self._token

    async def _authed_headers(self) -> dict[str, str]:
        token = await self.login()
        return {"Authorization": f"Bearer {token}"}

    async def generate_inspection_url(self, ref_num: str) -> dict[str, Any]:
        """Call /gen-trinetra-url to create an inspection session for the ref."""
        headers = await self._authed_headers()
        payload = {"ref_num": ref_num}
        response = await self._request(
            "POST", settings.CAMCOM_GEN_URL_PATH, headers=headers, json=payload
        )
        if response.status_code == 401:
            # Token may have expired; refresh and retry once.
            headers = {"Authorization": f"Bearer {await self.login(force=True)}"}
            response = await self._request(
                "POST", settings.CAMCOM_GEN_URL_PATH, headers=headers, json=payload
            )
        if response.status_code >= 400:
            raise CamComError(
                f"gen-trinetra-url failed: {response.status_code} {response.text}"
            )
        data = response.json() if response.content else {}
        logger.info("CamCom inspection URL generated for ref %s", ref_num)
        return data

    async def upload_image(
        self,
        upload_url: str,
        ref_num: str,
        angle: str,
        filename: str,
        content: bytes,
        content_type: str = "image/jpeg",
    ) -> dict[str, Any]:
        """Upload a single image to the CamCom Uploads API.

        `upload_url` is either:
          - a full URL returned by gen-trinetra-url, or
          - falsy, in which case we fall back to CAMCOM_UPLOAD_PATH.
        """
        headers = await self._authed_headers()
        target = upload_url or f"{self.base_url}{settings.CAMCOM_UPLOAD_PATH}"
        files = {"file": (filename, content, content_type)}
        data = {"ref_num": ref_num, "angle": angle}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(target, headers=headers, files=files, data=data)
            except httpx.HTTPError as exc:
                logger.exception("CamCom upload failed for %s/%s", ref_num, angle)
                raise CamComError(f"Network error uploading to CamCom: {exc}") from exc
        if response.status_code >= 400:
            raise CamComError(
                f"CamCom upload failed for {angle}: {response.status_code} {response.text}"
            )
        return response.json() if response.content else {"status": "ok"}


# Singleton-ish accessor (re-use the same instance to share the token cache).
_camcom_singleton: Optional[CamComService] = None


def get_camcom() -> CamComService:
    global _camcom_singleton
    if _camcom_singleton is None:
        _camcom_singleton = CamComService()
    return _camcom_singleton
