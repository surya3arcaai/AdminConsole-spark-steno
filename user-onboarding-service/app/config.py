"""
Configuration settings for User Onboarding Service.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Service
    service_name: str = "user-onboarding-service"
    service_version: str = "1.0.0"
    service_port: int = 8002
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://arca_admin:arca_secret_2026@localhost:5432/arca_spark_db"

    # JWT
    jwt_secret_key: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"

    # Audio settings
    max_audio_size_mb: int = 5
    allowed_audio_formats: list = ["wav", "mp3", "m4a", "ogg"]

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
