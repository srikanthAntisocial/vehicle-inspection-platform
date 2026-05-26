"""Inspections API: CRUD + image upload + CamCom submission."""
from __future__ import annotations

import logging
from typing import Annotated, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import (
    Inspection,
    InspectionStatus,
    UploadedImage,
    User,
    VEHICLE_ANGLES,
)
from app.schemas.inspection import (
    InspectionCreate,
    InspectionDetail,
    InspectionListResponse,
    InspectionRead,
    InspectionUpdate,
    UploadedImageRead,
)
from app.services.camcom import CamComError, get_camcom
from app.services.storage import get_storage
from app.utils.image_validation import validate_image

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _load_inspection(db: AsyncSession, inspection_id: int) -> Inspection:
    result = await db.execute(
        select(Inspection)
        .where(Inspection.id == inspection_id)
        .options(
            selectinload(Inspection.uploaded_images),
            selectinload(Inspection.roi_images),
            selectinload(Inspection.assessments),
        )
    )
    inspection = result.scalar_one_or_none()
    if inspection is None:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return inspection


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("", response_model=InspectionRead, status_code=201)
async def create_inspection(
    payload: InspectionCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new inspection in DRAFT state. The CamCom session is created
    later when the user actually submits images, so a draft can be edited."""
    existing = await db.execute(select(Inspection).where(Inspection.ref_num == payload.ref_num))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="ref_num already exists")

    inspection = Inspection(
        ref_num=payload.ref_num,
        vehicle_number=payload.vehicle_number,
        customer_name=payload.customer_name,
        vehicle_model=payload.vehicle_model,
        notes=payload.notes,
        status=InspectionStatus.DRAFT,
        created_by=current_user.id,
    )
    db.add(inspection)
    await db.commit()
    await db.refresh(inspection)
    return InspectionRead.model_validate(inspection)


@router.get("", response_model=InspectionListResponse)
async def list_inspections(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[InspectionStatus] = Query(None, alias="status"),
    search: Optional[str] = Query(None, description="Search vehicle/customer/ref_num"),
):
    query = select(Inspection)
    count_query = select(func.count(Inspection.id))

    if status_filter:
        query = query.where(Inspection.status == status_filter)
        count_query = count_query.where(Inspection.status == status_filter)
    if search:
        like = f"%{search.lower()}%"
        condition = (
            func.lower(Inspection.ref_num).like(like)
            | func.lower(Inspection.vehicle_number).like(like)
            | func.lower(Inspection.customer_name).like(like)
            | func.lower(Inspection.vehicle_model).like(like)
        )
        query = query.where(condition)
        count_query = count_query.where(condition)

    total = (await db.execute(count_query)).scalar_one()
    query = query.order_by(Inspection.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    items = (await db.execute(query)).scalars().all()
    return InspectionListResponse(
        items=[InspectionRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{inspection_id}", response_model=InspectionDetail)
async def get_inspection(
    inspection_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    inspection = await _load_inspection(db, inspection_id)
    return InspectionDetail.model_validate(inspection)


@router.put("/{inspection_id}", response_model=InspectionRead)
async def update_inspection(
    inspection_id: int,
    payload: InspectionUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    inspection = await _load_inspection(db, inspection_id)
    if inspection.status not in (InspectionStatus.DRAFT, InspectionStatus.FAILED):
        raise HTTPException(status_code=400, detail="Inspection cannot be edited in its current state")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(inspection, field, value)
    await db.commit()
    await db.refresh(inspection)
    return InspectionRead.model_validate(inspection)


@router.delete("/{inspection_id}", status_code=204)
async def delete_inspection(
    inspection_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    inspection = await _load_inspection(db, inspection_id)
    storage = get_storage()
    for img in inspection.uploaded_images:
        storage.delete(img.storage_path)
    await db.delete(inspection)
    await db.commit()


@router.post("/{inspection_id}/images", response_model=UploadedImageRead, status_code=201)
async def upload_image(
    inspection_id: int,
    angle: Annotated[str, Form(...)],
    file: Annotated[UploadFile, File(...)],
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Upload (or replace) a single angle image for an inspection.

    Storing locally first - CamCom upload happens on /submit.
    """
    if angle not in VEHICLE_ANGLES:
        raise HTTPException(status_code=400, detail=f"Unknown angle '{angle}'")

    inspection = await _load_inspection(db, inspection_id)
    if inspection.status not in (InspectionStatus.DRAFT, InspectionStatus.FAILED):
        raise HTTPException(status_code=400, detail="Cannot modify images in current state")

    content = await file.read()
    width, height, error = validate_image(content, file.content_type or "")
    if error:
        raise HTTPException(status_code=400, detail=error)

    storage = get_storage()
    storage_path, public_url = await storage.save(
        inspection.ref_num, angle, file.filename or f"{angle}.jpg", content
    )

    # Replace any existing image for this angle.
    existing = next((img for img in inspection.uploaded_images if img.angle == angle), None)
    if existing:
        storage.delete(existing.storage_path)
        await db.delete(existing)
        await db.flush()

    image = UploadedImage(
        inspection_id=inspection.id,
        angle=angle,
        original_filename=file.filename or f"{angle}.jpg",
        storage_path=storage_path,
        public_url=public_url,
        content_type=file.content_type or "image/jpeg",
        size_bytes=len(content),
        width=width,
        height=height,
    )
    db.add(image)
    await db.commit()
    await db.refresh(image)
    return UploadedImageRead.model_validate(image)


@router.delete("/{inspection_id}/images/{image_id}", status_code=204)
async def delete_image(
    inspection_id: int,
    image_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    inspection = await _load_inspection(db, inspection_id)
    image = next((i for i in inspection.uploaded_images if i.id == image_id), None)
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found")
    storage = get_storage()
    storage.delete(image.storage_path)
    await db.delete(image)
    await db.commit()


@router.post("/{inspection_id}/submit", response_model=InspectionRead)
async def submit_inspection(
    inspection_id: int,
    background: BackgroundTasks,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Push the inspection to CamCom:

    1. Ensure all 11 angles are present.
    2. Get inspection URL from CamCom (/gen-trinetra-url).
    3. Upload each image (in background).
    4. Set status to INITIATED. The webhook will move it to COMPLETED / FAILED.
    """
    inspection = await _load_inspection(db, inspection_id)
    if inspection.status not in (InspectionStatus.DRAFT, InspectionStatus.FAILED):
        raise HTTPException(status_code=400, detail="Inspection already submitted")

    angles_present = {img.angle for img in inspection.uploaded_images}
    missing = [a for a in VEHICLE_ANGLES if a not in angles_present]
    if missing:
        raise HTTPException(
            status_code=400,
            detail={"message": "Missing required angles", "missing": missing},
        )

    camcom = get_camcom()
    try:
        gen_response = await camcom.generate_inspection_url(inspection.ref_num)
    except CamComError as exc:
        inspection.status = InspectionStatus.FAILED
        inspection.error_message = str(exc)
        await db.commit()
        raise HTTPException(status_code=502, detail=f"CamCom gen-url failed: {exc}")

    inspection.camcom_inspection_url = (
        gen_response.get("inspection_url")
        or gen_response.get("url")
        or (gen_response.get("data") or {}).get("url")
    )
    inspection.camcom_session_id = (
        gen_response.get("session_id") or (gen_response.get("data") or {}).get("session_id")
    )
    inspection.status = InspectionStatus.UPLOADING
    inspection.error_message = None
    await db.commit()
    await db.refresh(inspection)

    # Capture data needed by background task before session closes.
    image_payloads: List[tuple[int, str, str, str, str]] = [
        (img.id, img.angle, img.original_filename, img.storage_path, img.content_type)
        for img in inspection.uploaded_images
    ]
    upload_target = inspection.camcom_inspection_url or ""

    background.add_task(
        _push_images_to_camcom,
        inspection_id=inspection.id,
        ref_num=inspection.ref_num,
        upload_url=upload_target,
        image_payloads=image_payloads,
    )

    return InspectionRead.model_validate(inspection)


async def _push_images_to_camcom(
    inspection_id: int,
    ref_num: str,
    upload_url: str,
    image_payloads: List[tuple[int, str, str, str, str]],
) -> None:
    """Background job that streams the local files to CamCom.

    Each tuple is (image_id, angle, filename, storage_path, content_type).
    """
    from app.db.session import AsyncSessionLocal

    camcom = get_camcom()
    async with AsyncSessionLocal() as db:
        inspection_q = await db.execute(select(Inspection).where(Inspection.id == inspection_id))
        inspection = inspection_q.scalar_one_or_none()
        if inspection is None:
            logger.error("Inspection %s missing during upload", inspection_id)
            return

        had_error = False
        for image_id, angle, filename, storage_path, content_type in image_payloads:
            try:
                with open(storage_path, "rb") as f:
                    data = f.read()
                await camcom.upload_image(
                    upload_url=upload_url,
                    ref_num=ref_num,
                    angle=angle,
                    filename=filename,
                    content=data,
                    content_type=content_type or "image/jpeg",
                )
                img_q = await db.execute(select(UploadedImage).where(UploadedImage.id == image_id))
                img = img_q.scalar_one_or_none()
                if img is not None:
                    img.camcom_upload_status = "ok"
            except CamComError as exc:
                logger.error("CamCom upload failed for %s/%s: %s", ref_num, angle, exc)
                had_error = True
                img_q = await db.execute(select(UploadedImage).where(UploadedImage.id == image_id))
                img = img_q.scalar_one_or_none()
                if img is not None:
                    img.camcom_upload_status = f"failed: {exc}"
            except FileNotFoundError:
                logger.error("Local file missing for image %s", image_id)
                had_error = True

        if had_error:
            inspection.status = InspectionStatus.FAILED
            inspection.error_message = "One or more images failed to upload to CamCom"
        else:
            inspection.status = InspectionStatus.INITIATED
            inspection.camcom_status_code = 1
        await db.commit()
        logger.info("Background upload finished for ref %s (errors=%s)", ref_num, had_error)


@router.get("/meta/angles", response_model=List[str])
async def list_angles(current_user: Annotated[User, Depends(get_current_user)]):
    """Returns the canonical list of vehicle angles required for a submission."""
    return VEHICLE_ANGLES
