"""Assessment / damage findings returned by CamCom AI."""
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    inspection_id: Mapped[int] = mapped_column(
        ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    part_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    action: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)         # Repair / Replace
    dam_type: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)      # damage type
    intensity: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)      # severity
    confidence: Mapped[Optional[float]] = mapped_column(nullable=True)
    pictures: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)            # list of image URLs
    raw: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)                 # raw segment from callback
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    inspection = relationship("Inspection", back_populates="assessments")
