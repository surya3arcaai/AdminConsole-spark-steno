"""Template Service routers."""

from .clinical import router as clinical_router
from .discharge import router as discharge_router
from .common import router as common_router

__all__ = ["clinical_router", "discharge_router", "common_router"]
