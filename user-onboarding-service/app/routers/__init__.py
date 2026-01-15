"""User Onboarding Service routers."""

from .users import router as users_router
from .demographics import router as demographics_router
from .audio import router as audio_router

__all__ = ["users_router", "demographics_router", "audio_router"]
