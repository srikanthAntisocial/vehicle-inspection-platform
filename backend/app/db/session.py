"""Async SQLAlchemy engine + session setup."""
import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Declarative base shared by all ORM models."""
    pass


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Create tables (used in dev; production should rely on Alembic)."""
    # Import models so they register on Base.metadata
    from app.models import user, inspection, uploaded_image, roi_image, assessment, webhook_log  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed an initial admin user if the table is empty.
    from sqlalchemy import select
    from app.core.security import hash_password
    from app.models.user import User

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).limit(1))
        existing = result.scalar_one_or_none()
        if existing is None:
            admin = User(
                email=settings.BOOTSTRAP_ADMIN_EMAIL,
                hashed_password=hash_password(settings.BOOTSTRAP_ADMIN_PASSWORD),
                full_name=settings.BOOTSTRAP_ADMIN_NAME,
                is_active=True,
                is_admin=True,
            )
            session.add(admin)
            await session.commit()
            logger.info("Bootstrap admin user created: %s", admin.email)
