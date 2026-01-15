"""RBAC Service routers."""

from .roles import router as roles_router
from .permissions import router as permissions_router

__all__ = ["roles_router", "permissions_router"]
