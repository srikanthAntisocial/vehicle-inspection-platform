"""CamCom webhook receiver.

This endpoint is hit by CamCom servers - no JWT auth required.
We validate a shared secret in the X-CamCom-Signature header instead.
"""
from __future__ import annotations

import hmac
import json
import logging
from datetime import datetime, timezone
from hashlib import sha256
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models import (
    Assessment,
    CAMCOM_STATUS_MAP,
    Inspection,
    InspectionStatus,
    RoiImage,
    WebhookLog,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _verify_signature(body: bytes, signature: str | None) -> bool:
    if not settings.CAMCOM_WEBHOOK_SECRET:
        # If no secret is configured, treat any payload as valid (dev only).
        return True
    if not signature:
        return False
    expected = hmac.new(
        settings.CAMCOM_WEBHOOK_SECRET.encode("utf-8"), body, sha256
    ).hexdigest()
    # Accept both "<hex>" and "sha256=<hex>" formats.
    candidate = signature.lower().removeprefix("sha256=").strip()
    return hmac.compare_digest(expected, candidate)


def _extract_ref_num(payload: dict[str, Any]) -> str | None:
    """CamCom's callback shape varies a bit between deployments."""
    for path in (
        ("ref_num",),
        ("data", "ref_num"),
        ("vehicle", "ref_num"),
        ("assessment_report", "ref_num"),
    ):
        node: Any = payload
        for key in path:
            if not isinstance(node, dict):
                node = None
                break
            node = node.get(key)
        if isinstance(node, str) and node:
            return node
    return None


def _extract_status_code(payload: dict[str, Any]) -> int | None:
    for path in (("status",), ("data", "status"), ("assessment_report", "status")):
        node: Any = payload
        for key in path:
            if not isinstance(node, dict):
                node = None
                break
            node = node.get(key)
        if isinstance(node, int):
            return node
        if isinstance(node, str) and node.isdigit():
            return int(node)
    return None


@router.post("/camcom", status_code=status.HTTP_200_OK)
async def camcom_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    x_camcom_signature: Annotated[str | None, Header(alias="X-CamCom-Signature")] = None,
):
    body = await request.body()
    try:
        payload: dict[str, Any] = json.loads(body or b"{}")
    except json.JSONDecodeError:
        payload = {}

    signature_valid = _verify_signature(body, x_camcom_signature)
    log = WebhookLog(
        ref_num=_extract_ref_num(payload),
        source_ip=request.client.host if request.client else None,
        signature_valid=signature_valid,
        processed=False,
        payload=payload,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)

    if not signature_valid:
        logger.warning("Rejected webhook: bad signature (ref=%s)", log.ref_num)
        return JSONResponse(status_code=401, content={"detail": "Invalid signature"})

    ref_num = log.ref_num
    if not ref_num:
        log.error = "Missing ref_num in payload"
        await db.commit()
        return JSONResponse(status_code=400, content={"detail": "ref_num required"})

    result = await db.execute(select(Inspection).where(Inspection.ref_num == ref_num))
    inspection = result.scalar_one_or_none()
    if inspection is None:
        log.error = f"No inspection found for ref_num {ref_num}"
        await db.commit()
        return JSONResponse(status_code=404, content={"detail": "Inspection not found"})

    log.inspection_id = inspection.id
    try:
        await _apply_payload(db, inspection, payload)
        log.processed = True
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to apply webhook for %s", ref_num)
        log.error = str(exc)
        inspection.status = InspectionStatus.FAILED
        inspection.error_message = f"Webhook processing failed: {exc}"
        await db.commit()
        return JSONResponse(status_code=500, content={"detail": str(exc)})

    return {"ok": True, "ref_num": ref_num, "status": inspection.status}


async def _apply_payload(db: AsyncSession, inspection: Inspection, payload: dict[str, Any]) -> None:
    """Maps the CamCom callback into our database tables."""
    status_code = _extract_status_code(payload)
    if status_code is not None:
        inspection.camcom_status_code = status_code
        mapped = CAMCOM_STATUS_MAP.get(status_code)
        if mapped is not None:
            inspection.status = mapped
            if mapped == InspectionStatus.COMPLETED:
                inspection.completed_at = datetime.now(timezone.utc)
            if mapped == InspectionStatus.FAILED:
                inspection.error_message = "CamCom reported failure (status 6)"

    # Reviewer information (free-form)
    reviewer = payload.get("reviewer") or (payload.get("assessment_report") or {}).get("reviewer")
    if reviewer:
        inspection.reviewer_info = json.dumps(reviewer, ensure_ascii=False)

    # Replace ROI images
    roi_list = payload.get("roi_images") or (payload.get("data") or {}).get("roi_images") or []
    if roi_list:
        await db.execute(
            RoiImage.__table__.delete().where(RoiImage.inspection_id == inspection.id)
        )
        for item in roi_list:
            if isinstance(item, str):
                db.add(RoiImage(inspection_id=inspection.id, image_url=item))
                continue
            if not isinstance(item, dict):
                continue
            db.add(RoiImage(
                inspection_id=inspection.id,
                angle=item.get("angle") or item.get("view"),
                label=item.get("label") or item.get("name"),
                image_url=item.get("url") or item.get("image_url") or item.get("image", ""),
                description=item.get("description"),
            ))

    # Replace assessments
    assessment_list = (
        payload.get("assessment")
        or (payload.get("assessment_report") or {}).get("assessment")
        or (payload.get("data") or {}).get("assessment")
        or []
    )
    if assessment_list:
        await db.execute(
            Assessment.__table__.delete().where(Assessment.inspection_id == inspection.id)
        )
        for item in assessment_list:
            if not isinstance(item, dict):
                continue
            pictures = item.get("pictures") or item.get("images") or []
            if isinstance(pictures, dict):
                pictures = list(pictures.values())
            pictures = [p for p in pictures if isinstance(p, str)]
            db.add(Assessment(
                inspection_id=inspection.id,
                part_name=str(item.get("part_name") or item.get("part") or "unknown"),
                action=item.get("action"),
                dam_type=item.get("dam_type") or item.get("damage_type"),
                intensity=item.get("intensity") or item.get("severity"),
                confidence=_safe_float(item.get("confidence") or item.get("score")),
                pictures=pictures or None,
                raw=item,
                notes=item.get("notes"),
            ))


def _safe_float(v: Any) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None
