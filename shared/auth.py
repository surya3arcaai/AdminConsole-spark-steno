"""
JWT authentication utilities for Arca Spark Admin Console.
Validates tokens issued by the Arca Spark frontend.
"""

import os
from datetime import datetime
from typing import Optional, List
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

# Security scheme
security = HTTPBearer()

# Configuration from environment
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


@dataclass
class UserContext:
    """User context extracted from JWT token."""
    user_id: str
    email: Optional[str] = None
    roles: List[str] = None
    permissions: List[str] = None

    def __post_init__(self):
        if self.roles is None:
            self.roles = []
        if self.permissions is None:
            self.permissions = []

    def has_role(self, role: str) -> bool:
        """Check if user has a specific role."""
        return role in self.roles

    def has_permission(self, permission: str) -> bool:
        """Check if user has a specific permission."""
        return permission in self.permissions

    def has_any_role(self, roles: List[str]) -> bool:
        """Check if user has any of the specified roles."""
        return any(role in self.roles for role in roles)


def verify_token(token: str) -> dict:
    """
    Verify and decode a JWT token.

    Args:
        token: The JWT token string

    Returns:
        Decoded token payload

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UserContext:
    """
    Dependency to get the current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer token from request header

    Returns:
        UserContext with user information

    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    payload = verify_token(token)

    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user identifier",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return UserContext(
        user_id=user_id,
        email=payload.get("email"),
        roles=payload.get("roles", []),
        permissions=payload.get("permissions", []),
    )


def require_roles(*required_roles: str):
    """
    Dependency factory to require specific roles.

    Args:
        required_roles: Role names that are required (any of them)

    Returns:
        Dependency function that validates roles
    """
    async def role_checker(user: UserContext = Depends(get_current_user)) -> UserContext:
        if not user.has_any_role(list(required_roles)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required roles: {', '.join(required_roles)}",
            )
        return user
    return role_checker


def require_permissions(*required_permissions: str):
    """
    Dependency factory to require specific permissions.

    Args:
        required_permissions: Permission names that are required (all of them)

    Returns:
        Dependency function that validates permissions
    """
    async def permission_checker(user: UserContext = Depends(get_current_user)) -> UserContext:
        missing = [p for p in required_permissions if not user.has_permission(p)]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permissions: {', '.join(missing)}",
            )
        return user
    return permission_checker
