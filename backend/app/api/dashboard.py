"""Dashboard summary stats."""
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Inspection, InspectionStatus, User
from app.schemas.inspection import DashboardStats, InspectionRead

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    total = (await db.execute(select(func.count(Inspection.id)))).scalar_one()

    async def count_for(s: InspectionStatus) -> int:
        return (
            await db.execute(select(func.count(Inspection.id)).where(Inspection.status == s))
        ).scalar_one()

    draft = await count_for(InspectionStatus.DRAFT)
    initiated = await count_for(InspectionStatus.INITIATED) + await count_for(InspectionStatus.UPLOADING)
    in_progress = await count_for(InspectionStatus.IN_PROGRESS)
    completed = await count_for(InspectionStatus.COMPLETED)
    failed = await count_for(InspectionStatus.FAILED)

    recent_q = await db.execute(
        select(Inspection).order_by(Inspection.created_at.desc()).limit(5)
    )
    recent = [InspectionRead.model_validate(i) for i in recent_q.scalars().all()]

    return DashboardStats(
        total=total,
        draft=draft,
        initiated=initiated,
        in_progress=in_progress,
        completed=completed,
        failed=failed,
        recent=recent,
    )
