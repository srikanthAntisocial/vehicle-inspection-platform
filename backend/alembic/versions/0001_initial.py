"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2025-01-01 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    inspection_status = sa.Enum(
        "draft", "uploading", "initiated", "in_progress", "completed", "failed",
        name="inspection_status",
    )
    inspection_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "inspections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ref_num", sa.String(64), nullable=False, unique=True),
        sa.Column("vehicle_number", sa.String(64), nullable=False),
        sa.Column("customer_name", sa.String(255), nullable=False),
        sa.Column("vehicle_model", sa.String(255), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", inspection_status, nullable=False, server_default="draft"),
        sa.Column("camcom_status_code", sa.Integer(), nullable=True),
        sa.Column("camcom_inspection_url", sa.String(1024), nullable=True),
        sa.Column("camcom_session_id", sa.String(255), nullable=True),
        sa.Column("reviewer_info", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_inspections_ref_num", "inspections", ["ref_num"], unique=True)
    op.create_index("ix_inspections_vehicle_number", "inspections", ["vehicle_number"])
    op.create_index("ix_inspections_status", "inspections", ["status"])

    op.create_table(
        "uploaded_images",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("inspection_id", sa.Integer(), sa.ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False),
        sa.Column("angle", sa.String(32), nullable=False),
        sa.Column("original_filename", sa.String(512), nullable=False),
        sa.Column("storage_path", sa.String(1024), nullable=False),
        sa.Column("public_url", sa.String(1024), nullable=False),
        sa.Column("content_type", sa.String(64), nullable=False, server_default="image/jpeg"),
        sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("camcom_upload_status", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_uploaded_images_inspection_id", "uploaded_images", ["inspection_id"])
    op.create_index("ix_uploaded_images_angle", "uploaded_images", ["angle"])

    op.create_table(
        "roi_images",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("inspection_id", sa.Integer(), sa.ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False),
        sa.Column("angle", sa.String(64), nullable=True),
        sa.Column("label", sa.String(255), nullable=True),
        sa.Column("image_url", sa.String(1024), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_roi_images_inspection_id", "roi_images", ["inspection_id"])
    op.create_index("ix_roi_images_angle", "roi_images", ["angle"])

    op.create_table(
        "assessments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("inspection_id", sa.Integer(), sa.ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False),
        sa.Column("part_name", sa.String(255), nullable=False),
        sa.Column("action", sa.String(64), nullable=True),
        sa.Column("dam_type", sa.String(255), nullable=True),
        sa.Column("intensity", sa.String(64), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("pictures", sa.JSON(), nullable=True),
        sa.Column("raw", sa.JSON(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_assessments_inspection_id", "assessments", ["inspection_id"])
    op.create_index("ix_assessments_part_name", "assessments", ["part_name"])

    op.create_table(
        "webhook_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("inspection_id", sa.Integer(), sa.ForeignKey("inspections.id", ondelete="SET NULL"), nullable=True),
        sa.Column("ref_num", sa.String(64), nullable=True),
        sa.Column("source_ip", sa.String(64), nullable=True),
        sa.Column("signature_valid", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("processed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_webhook_logs_inspection_id", "webhook_logs", ["inspection_id"])
    op.create_index("ix_webhook_logs_ref_num", "webhook_logs", ["ref_num"])


def downgrade() -> None:
    op.drop_table("webhook_logs")
    op.drop_table("assessments")
    op.drop_table("roi_images")
    op.drop_table("uploaded_images")
    op.drop_table("inspections")
    op.drop_table("users")
    sa.Enum(name="inspection_status").drop(op.get_bind(), checkfirst=True)
