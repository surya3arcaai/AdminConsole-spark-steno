"""
Shared utilities package for Arca Spark Admin Console microservices.
"""

from .auth import get_current_user, verify_token, UserContext
from .database import get_db, AsyncSessionLocal, engine
from .exceptions import (
    ArcaSparkException,
    NotFoundException,
    UnauthorizedException,
    ForbiddenException,
    ValidationException,
    ConflictException,
)
from .middleware import LoggingMiddleware, ErrorHandlingMiddleware
from .schemas import (
    PaginationParams,
    PaginatedResponse,
    SuccessResponse,
    ErrorResponse,
)

__all__ = [
    # Auth
    "get_current_user",
    "verify_token",
    "UserContext",
    # Database
    "get_db",
    "AsyncSessionLocal",
    "engine",
    # Exceptions
    "ArcaSparkException",
    "NotFoundException",
    "UnauthorizedException",
    "ForbiddenException",
    "ValidationException",
    "ConflictException",
    # Middleware
    "LoggingMiddleware",
    "ErrorHandlingMiddleware",
    # Schemas
    "PaginationParams",
    "PaginatedResponse",
    "SuccessResponse",
    "ErrorResponse",
]
