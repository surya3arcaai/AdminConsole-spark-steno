"""Main FastAPI application for Logs Service."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.database import init_db, close_db
from shared.middleware import LoggingMiddleware, ErrorHandlingMiddleware
from shared.schemas import HealthResponse

from .config import settings
from .routers import monitoring_router, integration_router, transcripts_router, exports_router, graphs_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="Logs Service",
    description="Logging, monitoring, and analytics service for Arca Spark Admin Console",
    version=settings.service_version,
    lifespan=lifespan,
    root_path="/api/v1/logs",
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

app.include_router(monitoring_router)
app.include_router(integration_router)
app.include_router(transcripts_router)
app.include_router(exports_router)
app.include_router(graphs_router)


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
