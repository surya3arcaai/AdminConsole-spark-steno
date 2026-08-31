"""
Configuration settings for RBAC Service.
"""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Service
    service_name: str = "rbac-service"
    service_version: str = "1.0.0"
    service_port: int = 8001
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://postgres:Password%40123@192.168.112.6:31155/arca-spark"

    # JWT
    jwt_secret_key: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
