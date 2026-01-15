"""Integration interface endpoints (APIs, Containers, DBs)."""

from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_user, UserContext
from shared.schemas import PaginatedResponse

from ..schemas import (
    APILogCreate, APILogResponse, APIStatsResponse, APILatencyResponse,
    ContainerLogCreate, ContainerLogResponse, ContainerStatusResponse, ContainerMetricsResponse,
    DBLogCreate, DBLogResponse, DBConnectionsResponse, DBMetricsResponse,
)
from .. import crud

router = APIRouter(prefix="/integration", tags=["Integration"])


# ============== API Logs ==============

@router.get("/apis", response_model=PaginatedResponse[APILogResponse])
async def get_api_logs(
    service: Optional[str] = None,
    status_code: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get API logs."""
    skip = (page - 1) * page_size
    logs, total = await crud.get_api_logs(db, service, status_code, skip=skip, limit=page_size)
    return PaginatedResponse.create(items=logs, total=total, page=page, page_size=page_size)


@router.post("/apis", response_model=APILogResponse, status_code=201)
async def create_api_log(
    data: APILogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Create an API log entry."""
    log = await crud.create_api_log(db, data)
    return log


@router.get("/apis/stats", response_model=APIStatsResponse)
async def get_api_stats(
    hours: int = Query(24, ge=1, le=720),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get API statistics for the specified time period."""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(hours=hours)
    stats = await crud.get_api_stats(db, start_date, end_date)
    return APIStatsResponse(
        **stats,
        period_start=start_date,
        period_end=end_date,
    )


@router.get("/apis/errors", response_model=PaginatedResponse[APILogResponse])
async def get_api_errors(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get API error logs (status >= 400)."""
    skip = (page - 1) * page_size
    logs, total = await crud.get_api_errors(db, skip, page_size)
    return PaginatedResponse.create(items=logs, total=total, page=page, page_size=page_size)


@router.get("/apis/latency", response_model=list[APILatencyResponse])
async def get_api_latency(
    current_user: UserContext = Depends(get_current_user),
):
    """Get API latency metrics by endpoint."""
    # In production, this would aggregate from api_logs
    return [
        APILatencyResponse(
            endpoint="/api/v1/users",
            avg_latency_ms=45.2,
            min_latency_ms=12.0,
            max_latency_ms=250.0,
            p95_latency_ms=120.0,
            request_count=1500,
        ),
        APILatencyResponse(
            endpoint="/api/v1/templates",
            avg_latency_ms=32.1,
            min_latency_ms=8.0,
            max_latency_ms=180.0,
            p95_latency_ms=95.0,
            request_count=800,
        ),
    ]


# ============== Container Logs ==============

@router.get("/containers", response_model=PaginatedResponse[ContainerLogResponse])
async def get_container_logs(
    container_id: Optional[str] = None,
    log_level: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get container logs."""
    skip = (page - 1) * page_size
    logs, total = await crud.get_container_logs(db, container_id, log_level, skip, page_size)
    return PaginatedResponse.create(items=logs, total=total, page=page, page_size=page_size)


@router.post("/containers", response_model=ContainerLogResponse, status_code=201)
async def create_container_log(
    data: ContainerLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Create a container log entry."""
    log = await crud.create_container_log(db, data)
    return log


@router.get("/containers/{container_id}/status", response_model=ContainerStatusResponse)
async def get_container_status(
    container_id: str,
    current_user: UserContext = Depends(get_current_user),
):
    """Get status for a specific container."""
    # In production, this would query Docker/K8s API
    return ContainerStatusResponse(
        container_id=container_id,
        container_name=f"arca_{container_id}",
        status="running",
        cpu_usage=25.5,
        memory_usage_mb=512.0,
        uptime_seconds=86400,
    )


@router.get("/containers/{container_id}/metrics", response_model=ContainerMetricsResponse)
async def get_container_metrics(
    container_id: str,
    current_user: UserContext = Depends(get_current_user),
):
    """Get metrics history for a container."""
    # In production, this would query metrics store
    return ContainerMetricsResponse(
        container_id=container_id,
        cpu_history=[
            {"timestamp": datetime.utcnow().isoformat(), "value": 25.5},
        ],
        memory_history=[
            {"timestamp": datetime.utcnow().isoformat(), "value": 512.0},
        ],
        network_io={"bytes_sent": 1024000, "bytes_received": 2048000},
    )


# ============== Database Logs ==============

@router.get("/databases", response_model=PaginatedResponse[DBLogResponse])
async def get_db_logs(
    database_name: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get database query logs."""
    skip = (page - 1) * page_size
    logs, total = await crud.get_db_logs(db, database_name, skip, page_size)
    return PaginatedResponse.create(items=logs, total=total, page=page, page_size=page_size)


@router.post("/databases", response_model=DBLogResponse, status_code=201)
async def create_db_log(
    data: DBLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Create a database log entry."""
    log = await crud.create_db_log(db, data)
    return log


@router.get("/databases/connections", response_model=list[DBConnectionsResponse])
async def get_db_connections(
    current_user: UserContext = Depends(get_current_user),
):
    """Get database connection status."""
    # In production, this would query PostgreSQL pg_stat
    return [
        DBConnectionsResponse(
            database_name="arca_spark_db",
            active_connections=15,
            idle_connections=5,
            max_connections=100,
        ),
    ]


@router.get("/databases/slow-queries", response_model=PaginatedResponse[DBLogResponse])
async def get_slow_queries(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get slow database queries."""
    skip = (page - 1) * page_size
    logs, total = await crud.get_slow_queries(db, skip, page_size)
    return PaginatedResponse.create(items=logs, total=total, page=page, page_size=page_size)


@router.get("/databases/metrics", response_model=list[DBMetricsResponse])
async def get_db_metrics(
    current_user: UserContext = Depends(get_current_user),
):
    """Get database performance metrics."""
    # In production, this would aggregate from db_logs
    return [
        DBMetricsResponse(
            database_name="arca_spark_db",
            total_queries=15000,
            avg_query_time_ms=25.5,
            slow_query_count=12,
            connection_pool_usage=0.75,
        ),
    ]
