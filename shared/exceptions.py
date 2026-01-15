"""
Custom exceptions for Arca Spark Admin Console.
"""

from typing import Optional, Any, Dict


class ArcaSparkException(Exception):
    """Base exception for all Arca Spark errors."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or "INTERNAL_ERROR"
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for JSON response."""
        return {
            "error": True,
            "error_code": self.error_code,
            "message": self.message,
            "details": self.details,
        }


class NotFoundException(ArcaSparkException):
    """Resource not found exception."""

    def __init__(
        self,
        resource: str,
        identifier: Optional[Any] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        message = f"{resource} not found"
        if identifier:
            message = f"{resource} with id '{identifier}' not found"
        super().__init__(
            message=message,
            status_code=404,
            error_code="NOT_FOUND",
            details=details,
        )


class UnauthorizedException(ArcaSparkException):
    """Authentication failed exception."""

    def __init__(
        self,
        message: str = "Authentication required",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            status_code=401,
            error_code="UNAUTHORIZED",
            details=details,
        )


class ForbiddenException(ArcaSparkException):
    """Authorization failed exception."""

    def __init__(
        self,
        message: str = "Access denied",
        required_permission: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        if required_permission:
            message = f"Access denied. Required permission: {required_permission}"
        super().__init__(
            message=message,
            status_code=403,
            error_code="FORBIDDEN",
            details=details,
        )


class ValidationException(ArcaSparkException):
    """Validation error exception."""

    def __init__(
        self,
        message: str = "Validation error",
        field: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        if field:
            message = f"Validation error on field '{field}': {message}"
        super().__init__(
            message=message,
            status_code=422,
            error_code="VALIDATION_ERROR",
            details=details,
        )


class ConflictException(ArcaSparkException):
    """Resource conflict exception (e.g., duplicate entry)."""

    def __init__(
        self,
        message: str = "Resource conflict",
        resource: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        if resource:
            message = f"{resource} already exists"
        super().__init__(
            message=message,
            status_code=409,
            error_code="CONFLICT",
            details=details,
        )


class BadRequestException(ArcaSparkException):
    """Bad request exception."""

    def __init__(
        self,
        message: str = "Bad request",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            status_code=400,
            error_code="BAD_REQUEST",
            details=details,
        )
