"""Application configuration loaded from environment variables."""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application settings."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # General
    PROJECT_NAME: str = "Vehicle Inspection Platform"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_BASE_URL: str = "http://localhost:8000"

    # Security
    SECRET_KEY: str = "change-me-in-production-please-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/vehicle_inspection"
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/vehicle_inspection"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # CamCom integration
    CAMCOM_BASE_URL: str = "https://api.camcom.example.com"
    CAMCOM_LOGIN_PATH: str = "/client_login"
    CAMCOM_GEN_URL_PATH: str = "/gen-trinetra-url"
    CAMCOM_UPLOAD_PATH: str = "/uploads"
    CAMCOM_EMAIL: str = "your-camcom-account@example.com"
    CAMCOM_PASSWORD: str = "change-me"
    CAMCOM_WEBHOOK_SECRET: str = "change-me-webhook-secret"

    # Storage
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 25

    # AWS (prepared, optional)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    AWS_REGION: str = "us-east-1"
    USE_S3: bool = False

    # Bootstrap admin (created on first startup if none exists)
    BOOTSTRAP_ADMIN_EMAIL: str = "admin@example.com"
    BOOTSTRAP_ADMIN_PASSWORD: str = "admin1234"
    BOOTSTRAP_ADMIN_NAME: str = "Administrator"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
