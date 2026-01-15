"""Configuration settings for Logs Service."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    service_name: str = "logs-service"
    service_version: str = "1.0.0"
    service_port: int = 8004
    debug: bool = False

    database_url: str = "postgresql+asyncpg://arca_admin:arca_secret_2026@localhost:5432/arca_spark_db"

    jwt_secret_key: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"

    exports_dir: str = "/app/exports"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
