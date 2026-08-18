"""
Configuration settings for User Onboarding Service.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Service
    service_name: str = "user-onboarding-service"
    service_version: str = "1.0.0"
    service_port: int = 8005
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://postgres:Password%40123@192.168.112.6:31155/arca-spark"

    # JWT
    jwt_secret_key: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"

    # Audio settings
    max_audio_size_mb: int = 5
    allowed_audio_formats: list = ["wav", "mp3", "m4a", "ogg"]

    # Keycloak Configuration
    keycloak_server_url: str = "http://192.168.112.6:31636"
    keycloak_realm: str = "arca-spark"
    keycloak_client_id: str = "arca-spark"
    keycloak_client_secret: str = "ihdp5bhmgBsd1kWEYeyJxHeDrf7ln5ji"
    keycloak_admin_username: str = "admin"
    keycloak_admin_password: str = "Password@123"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
