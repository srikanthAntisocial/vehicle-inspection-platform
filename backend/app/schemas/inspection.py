"""Pydantic schemas for inspections, images, ROI, and assessments."""
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.inspection import InspectionStatus


class InspectionCreate(BaseModel):
    ref_num: str = Field(min_length=1, max_length=64)
    vehicle_number: str = Field(min_length=1, max_length=64)
    customer_name: str = Field(min_length=1, max_length=255)
    vehicle_model: str = Field(min_length=1, max_length=255)
    notes: Optional[str] = None


class InspectionUpdate(BaseModel):
    vehicle_number: Optional[str] = None
    customer_name: Optional[str] = None
    vehicle_model: Optional[str] = None
    notes: Optional[str] = None


class UploadedImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    angle: str
    original_filename: str
    public_url: str
    content_type: str
    size_bytes: int
    width: Optional[int] = None
    height: Optional[int] = None
    camcom_upload_status: Optional[str] = None
    created_at: datetime


class RoiImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    angle: Optional[str] = None
    label: Optional[str] = None
    image_url: str
    description: Optional[str] = None
    created_at: datetime


class AssessmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    part_name: str
    action: Optional[str] = None
    dam_type: Optional[str] = None
    intensity: Optional[str] = None
    confidence: Optional[float] = None
    pictures: Optional[List[str]] = None
    notes: Optional[str] = None
    created_at: datetime


class InspectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ref_num: str
    vehicle_number: str
    customer_name: str
    vehicle_model: str
    notes: Optional[str] = None
    status: InspectionStatus
    camcom_status_code: Optional[int] = None
    camcom_inspection_url: Optional[str] = None
    reviewer_info: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


class InspectionDetail(InspectionRead):
    uploaded_images: List[UploadedImageRead] = []
    roi_images: List[RoiImageRead] = []
    assessments: List[AssessmentRead] = []


class InspectionListResponse(BaseModel):
    items: List[InspectionRead]
    total: int
    page: int
    page_size: int


class DashboardStats(BaseModel):
    total: int
    draft: int
    initiated: int
    in_progress: int
    completed: int
    failed: int
    recent: List[InspectionRead]


class WebhookPayload(BaseModel):
    """Loose schema for the CamCom callback - we accept extra fields."""
    model_config = ConfigDict(extra="allow")

    ref_num: Optional[str] = None
    status: Optional[int] = None
    vehicle: Optional[dict[str, Any]] = None
    uploads: Optional[list[dict[str, Any]]] = None
    roi_images: Optional[list[dict[str, Any]]] = None
    assessment: Optional[list[dict[str, Any]]] = None
    assessment_report: Optional[dict[str, Any]] = None
    reviewer: Optional[dict[str, Any]] = None
