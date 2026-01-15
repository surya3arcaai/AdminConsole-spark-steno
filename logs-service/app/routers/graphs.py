"""Graph and dashboard endpoints."""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_user, UserContext

from ..schemas import (
    DashboardDataResponse, TimeSeriesResponse, TimeSeriesDataPoint,
    AggregationResponse, GraphConfigCreate, GraphConfigResponse,
)
from .. import crud

router = APIRouter(prefix="/graphs", tags=["Graphs"])


@router.get("/dashboard", response_model=DashboardDataResponse)
async def get_dashboard_data(
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get aggregated dashboard data."""
    data = await crud.get_dashboard_data(db)
    return DashboardDataResponse(**data)


@router.get("/{graph_type}", response_model=TimeSeriesResponse)
async def get_graph_data(
    graph_type: str,
    hours: int = Query(24, ge=1, le=720),
    current_user: UserContext = Depends(get_current_user),
):
    """Get data for a specific graph type."""
    # Generate sample time series data
    now = datetime.utcnow()
    data_points = []
    for i in range(min(hours, 24)):
        timestamp = now - timedelta(hours=i)
        value = 50 + (i % 10) * 5  # Sample data
        data_points.append(TimeSeriesDataPoint(timestamp=timestamp, value=value))

    return TimeSeriesResponse(metric=graph_type, data=data_points)


@router.get("/timeseries", response_model=TimeSeriesResponse)
async def get_time_series_data(
    metric: str = Query(..., description="Metric name"),
    hours: int = Query(24, ge=1, le=720),
    current_user: UserContext = Depends(get_current_user),
):
    """Get time-series data for a specific metric."""
    now = datetime.utcnow()
    data_points = []
    for i in range(min(hours, 48)):
        timestamp = now - timedelta(hours=i)
        value = 100 - (i * 2) + (i % 5) * 10  # Sample data pattern
        data_points.append(TimeSeriesDataPoint(timestamp=timestamp, value=max(0, value)))

    return TimeSeriesResponse(metric=metric, data=data_points)


@router.get("/aggregations", response_model=list[AggregationResponse])
async def get_aggregations(
    period: str = Query("day", pattern="^(hour|day|week|month)$"),
    current_user: UserContext = Depends(get_current_user),
):
    """Get aggregated metrics."""
    return [
        AggregationResponse(metric="total_requests", value=15420, period=period, comparison=5.2),
        AggregationResponse(metric="error_rate", value=2.3, period=period, comparison=-0.5),
        AggregationResponse(metric="avg_response_time", value=45.2, period=period, comparison=-3.1),
        AggregationResponse(metric="active_users", value=234, period=period, comparison=12.5),
    ]


@router.post("/custom", response_model=GraphConfigResponse, status_code=201)
async def create_custom_graph(
    data: GraphConfigCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Create a custom graph configuration."""
    config = await crud.create_graph_config(db, data, current_user.user_id)
    return config


@router.get("/config", response_model=list[GraphConfigResponse])
async def get_graph_configs(
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get all graph configurations."""
    configs = await crud.get_graph_configs(db)
    return configs
