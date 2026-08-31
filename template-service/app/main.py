"""
Main FastAPI application for Template Service.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.database import init_db, close_db, AsyncSessionLocal
from shared.middleware import LoggingMiddleware, ErrorHandlingMiddleware
from shared.schemas import HealthResponse

from .config import settings
from .routers import clinical_router, discharge_router, common_router
from . import models
from .crud import seed_default_templates


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    await init_db()
    async with AsyncSessionLocal() as session:
        await seed_default_templates(session)
    yield
    await close_db()


app = FastAPI(
    title="Template Service",
    description="Clinical and discharge summary template service for Arca Spark Admin Console",
    version=settings.service_version,
    lifespan=lifespan,
    root_path="/api/v1/templates",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(LoggingMiddleware)

app.include_router(common_router)
app.include_router(clinical_router)
app.include_router(discharge_router)


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        service=settings.service_name,
        version=settings.service_version,
    )


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {
        "service": settings.service_name,
        "version": settings.service_version,
        "docs": "/docs",
    }
