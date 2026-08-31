"""
Configuration settings for Template Service.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    service_name: str = "template-service"
    service_version: str = "1.0.0"
    service_port: int = 8003
    debug: bool = False

    database_url: str = "postgresql+asyncpg://postgres:Password%40123@192.168.112.6:31155/arca-spark"

    jwt_secret_key: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
