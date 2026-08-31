"""
Main FastAPI application for User Onboarding Service.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.database import init_db, close_db
from shared.middleware import LoggingMiddleware, ErrorHandlingMiddleware
from shared.schemas import HealthResponse

from .config import settings
from .routers import users_router, demographics_router, audio_router
from . import models


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    await init_db()
    yield
    await close_db()


# Create FastAPI application
app = FastAPI(
    title="User Onboarding Service",
    description="User management and onboarding service for Arca Spark Admin Console",
    version=settings.service_version,
    lifespan=lifespan,
    root_path="/api/v1/users",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add custom middleware
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(LoggingMiddleware)


# Define health check BEFORE routers to prevent /{user_id} from catching /health
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        service=settings.service_name,
        version=settings.service_version,
    )


# Include routers AFTER health check to prevent /{user_id} from matching /health
# Note: users_router has GET / for listing users, so no app-level root endpoint needed
app.include_router(users_router)
app.include_router(demographics_router)
app.include_router(audio_router)