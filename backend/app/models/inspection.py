"""Inspection model - top-level entity for a vehicle inspection."""
import enum
from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class InspectionStatus(str, enum.Enum):
    """Mirrors CamCom status codes plus our local lifecycle."""
    DRAFT = "draft"               # created, not yet uploaded
    UPLOADING = "uploading"       # images being sent
    INITIATED = "initiated"       # CamCom status 1
    IN_PROGRESS = "in_progress"   # CamCom status 2
    COMPLETED = "completed"       # CamCom status 3
    FAILED = "failed"             # CamCom status 6


# Map raw integer status codes from CamCom to our enum.
CAMCOM_STATUS_MAP = {
    1: InspectionStatus.INITIATED,
    2: InspectionStatus.IN_PROGRESS,
    3: InspectionStatus.COMPLETED,
    6: InspectionStatus.FAILED,
}


class Inspection(Base):
    __tablename__ = "inspections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ref_num: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    vehicle_number: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    vehicle_model: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[InspectionStatus] = mapped_column(
        SAEnum(InspectionStatus, name="inspection_status"),
        default=InspectionStatus.DRAFT,
        nullable=False,
        index=True,
    )
    camcom_status_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    camcom_inspection_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    camcom_session_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reviewer_info: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    uploaded_images: Mapped[List["UploadedImage"]] = relationship(  # type: ignore[name-defined] # noqa: F821
        "UploadedImage", back_populates="inspection", cascade="all, delete-orphan"
    )
    roi_images: Mapped[List["RoiImage"]] = relationship(  # type: ignore[name-defined] # noqa: F821
        "RoiImage", back_populates="inspection", cascade="all, delete-orphan"
    )
    assessments: Mapped[List["Assessment"]] = relationship(  # type: ignore[name-defined] # noqa: F821
        "Assessment", back_populates="inspection", cascade="all, delete-orphan"
    )
    webhook_logs: Mapped[List["WebhookLog"]] = relationship(  # type: ignore[name-defined] # noqa: F821
        "WebhookLog", back_populates="inspection", cascade="all, delete-orphan"
    )
