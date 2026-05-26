"""Pluggable storage backend - local filesystem now, S3-ready."""
from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path
from typing import BinaryIO

import aiofiles

from app.core.config import settings

logger = logging.getLogger(__name__)


class LocalStorage:
    """Stores files on the local filesystem and exposes them via /uploads."""

    def __init__(self, base_dir: str, public_base: str):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        # Public base e.g. http://localhost:8000/uploads
        self.public_base = public_base.rstrip("/")

    def _build_paths(self, ref_num: str, angle: str, filename: str) -> tuple[Path, str]:
        ext = Path(filename).suffix.lower() or ".jpg"
        safe_ref = "".join(c for c in ref_num if c.isalnum() or c in ("-", "_")) or "inspection"
        unique = uuid.uuid4().hex[:12]
        rel_dir = Path(safe_ref)
        abs_dir = self.base_dir / rel_dir
        abs_dir.mkdir(parents=True, exist_ok=True)
        rel_path = rel_dir / f"{angle}_{unique}{ext}"
        abs_path = self.base_dir / rel_path
        public_url = f"{self.public_base}/{rel_path.as_posix()}"
        return abs_path, public_url

    async def save(self, ref_num: str, angle: str, filename: str, data: bytes) -> tuple[str, str]:
        abs_path, public_url = self._build_paths(ref_num, angle, filename)
        async with aiofiles.open(abs_path, "wb") as f:
            await f.write(data)
        logger.info("Saved upload to %s (%d bytes)", abs_path, len(data))
        return str(abs_path), public_url

    def delete(self, storage_path: str) -> None:
        try:
            if storage_path and os.path.exists(storage_path):
                os.remove(storage_path)
        except OSError as exc:
            logger.warning("Failed to delete %s: %s", storage_path, exc)


class S3Storage:
    """S3 backend (skeleton - finish wiring when migrating)."""

    def __init__(self, bucket: str, region: str, public_base: str | None = None):
        import boto3  # imported lazily

        self.bucket = bucket
        self.region = region
        self.client = boto3.client("s3", region_name=region)
        self.public_base = public_base or f"https://{bucket}.s3.{region}.amazonaws.com"

    async def save(self, ref_num: str, angle: str, filename: str, data: bytes) -> tuple[str, str]:
        ext = Path(filename).suffix.lower() or ".jpg"
        unique = uuid.uuid4().hex[:12]
        safe_ref = "".join(c for c in ref_num if c.isalnum() or c in ("-", "_")) or "inspection"
        key = f"{safe_ref}/{angle}_{unique}{ext}"
        # boto3 is sync; in production wrap with asyncio.to_thread.
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data,
                               ContentType=_content_type_for(ext))
        return f"s3://{self.bucket}/{key}", f"{self.public_base}/{key}"

    def delete(self, storage_path: str) -> None:
        if not storage_path.startswith("s3://"):
            return
        _, _, rest = storage_path.partition("s3://")
        _, _, key = rest.partition("/")
        self.client.delete_object(Bucket=self.bucket, Key=key)


def _content_type_for(ext: str) -> str:
    return {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }.get(ext.lower(), "application/octet-stream")


def get_storage():
    """Factory - returns the storage backend configured for this deployment."""
    if settings.USE_S3 and settings.AWS_S3_BUCKET:
        return S3Storage(settings.AWS_S3_BUCKET, settings.AWS_REGION)
    return LocalStorage(settings.UPLOAD_DIR, public_base=f"{settings.API_BASE_URL}/uploads")
