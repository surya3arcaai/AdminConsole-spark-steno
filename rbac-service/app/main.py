"""
Main FastAPI application for RBAC Service.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.database import init_db, close_db
from shared.middleware import LoggingMiddleware, ErrorHandlingMiddleware
from shared.schemas import HealthResponse

from .config import settings
from .routers import roles_router, permissions_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()


# Create FastAPI application
app = FastAPI(
    title="RBAC Service",
    description="Role-Based Access Control service for Arca Spark Admin Console",
    version=settings.service_version,
    lifespan=lifespan,
    root_path="/api/v1/rbac",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add custom middleware
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(LoggingMiddleware)

# Include routers
app.include_router(roles_router)
app.include_router(permissions_router)


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    """
    return HealthResponse(
        service=settings.service_name,
        version=settings.service_version,
    )


@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint.
    """
    return {
        "service": settings.service_name,
        "version": settings.service_version,
        "docs": "/docs",
    }
