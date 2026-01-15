"""Monitoring endpoints."""

from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_user, UserContext
from shared.schemas import PaginatedResponse, SuccessResponse

from ..schemas import (
    SystemHealthResponse, ServiceStatus, MetricsResponse,
    AlertCreate, AlertResponse, AlertConfigUpdate,
)
from .. import crud

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


@router.get("/health", response_model=SystemHealthResponse)
async def get_system_health(
    current_user: UserContext = Depends(get_current_user),
):
    """Get overall system health status."""
    # In production, this would check actual service health
    services = [
        ServiceStatus(name="rbac-service", status="healthy", uptime_seconds=3600, last_check=datetime.utcnow()),
        ServiceStatus(name="user-onboarding-service", status="healthy", uptime_seconds=3600, last_check=datetime.utcnow()),
        ServiceStatus(name="template-service", status="healthy", uptime_seconds=3600, last_check=datetime.utcnow()),
        ServiceStatus(name="logs-service", status="healthy", uptime_seconds=3600, last_check=datetime.utcnow()),
        ServiceStatus(name="postgresql", status="healthy", uptime_seconds=7200, last_check=datetime.utcnow()),
    ]
    return SystemHealthResponse(
        status="healthy",
        services=services,
        timestamp=datetime.utcnow(),
    )


@router.get("/services", response_model=list[ServiceStatus])
async def get_services_status(
    current_user: UserContext = Depends(get_current_user),
):
    """Get status of all services."""
    # In production, this would query actual service health endpoints
    return [
        ServiceStatus(name="rbac-service", status="healthy", uptime_seconds=3600, last_check=datetime.utcnow()),
        ServiceStatus(name="user-onboarding-service", status="healthy", uptime_seconds=3600, last_check=datetime.utcnow()),
        ServiceStatus(name="template-service", status="healthy", uptime_seconds=3600, last_check=datetime.utcnow()),
        ServiceStatus(name="logs-service", status="healthy", uptime_seconds=3600, last_check=datetime.utcnow()),
    ]


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics(
    current_user: UserContext = Depends(get_current_user),
):
    """Get system performance metrics."""
    # In production, this would collect actual metrics
    return MetricsResponse(
        cpu_usage=45.2,
        memory_usage=62.8,
        disk_usage=35.5,
        active_connections=127,
        requests_per_minute=450.5,
        timestamp=datetime.utcnow(),
    )


@router.get("/alerts", response_model=PaginatedResponse[AlertResponse])
async def get_alerts(
    acknowledged: Optional[bool] = Query(None),
    severity: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get system alerts."""
    skip = (page - 1) * page_size
    alerts, total = await crud.get_alerts(db, acknowledged, severity, skip, page_size)
    return PaginatedResponse.create(items=alerts, total=total, page=page, page_size=page_size)


@router.post("/alerts", response_model=AlertResponse, status_code=201)
async def create_alert(
    data: AlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Create a new alert."""
    alert = await crud.create_alert(db, data)
    return alert


@router.post("/alerts/{alert_id}/ack", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Acknowledge an alert."""
    alert = await crud.acknowledge_alert(db, alert_id, current_user.user_id)
    return alert


@router.put("/alerts/config", response_model=SuccessResponse)
async def configure_alerts(
    data: AlertConfigUpdate,
    current_user: UserContext = Depends(get_current_user),
):
    """Configure alert rules and thresholds."""
    # In production, this would save to configuration store
    return SuccessResponse(
        message="Alert configuration updated",
        data={"thresholds": data.thresholds, "channels": data.notification_channels},
    )
