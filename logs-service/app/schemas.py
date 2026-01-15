"""Pydantic schemas for Logs Service."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


# ============== Monitoring Schemas ==============

class ServiceStatus(BaseModel):
    name: str
    status: str  # healthy, unhealthy, unknown
    uptime_seconds: Optional[int] = None
    last_check: datetime


class SystemHealthResponse(BaseModel):
    status: str
    services: List[ServiceStatus]
    timestamp: datetime


class MetricsResponse(BaseModel):
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    active_connections: int
    requests_per_minute: float
    timestamp: datetime


# ============== API Logs Schemas ==============

class APILogCreate(BaseModel):
    service: str = Field(..., max_length=100)
    endpoint: str = Field(..., max_length=500)
    method: str = Field(..., max_length=10)
    status_code: int
    latency_ms: float
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    request_body: Optional[str] = None
    response_body: Optional[str] = None
    error_message: Optional[str] = None


class APILogResponse(APILogCreate):
    id: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class APIStatsResponse(BaseModel):
    total_requests: int
    success_rate: float
    avg_latency_ms: float
    error_count: int
    period_start: datetime
    period_end: datetime


class APILatencyResponse(BaseModel):
    endpoint: str
    avg_latency_ms: float
    min_latency_ms: float
    max_latency_ms: float
    p95_latency_ms: float
    request_count: int


# ============== Container Logs Schemas ==============

class ContainerLogCreate(BaseModel):
    container_id: str = Field(..., max_length=100)
    container_name: str = Field(..., max_length=200)
    log_level: str = "info"
    message: str
    log_metadata: Dict[str, Any] = Field(default_factory=dict)


class ContainerLogResponse(ContainerLogCreate):
    id: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class ContainerStatusResponse(BaseModel):
    container_id: str
    container_name: str
    status: str
    cpu_usage: float
    memory_usage_mb: float
    uptime_seconds: int


class ContainerMetricsResponse(BaseModel):
    container_id: str
    cpu_history: List[Dict[str, Any]]
    memory_history: List[Dict[str, Any]]
    network_io: Dict[str, Any]


# ============== DB Logs Schemas ==============

class DBLogCreate(BaseModel):
    database_name: str = Field(..., max_length=100)
    query: str
    execution_time_ms: float
    rows_affected: Optional[int] = None


class DBLogResponse(DBLogCreate):
    id: str
    is_slow_query: bool
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class DBConnectionsResponse(BaseModel):
    database_name: str
    active_connections: int
    idle_connections: int
    max_connections: int


class DBMetricsResponse(BaseModel):
    database_name: str
    total_queries: int
    avg_query_time_ms: float
    slow_query_count: int
    connection_pool_usage: float


# ============== Transcript Schemas ==============

class TranscriptCreate(BaseModel):
    user_id: str
    session_id: str
    content: str
    log_metadata: Dict[str, Any] = Field(default_factory=dict)
    duration_seconds: Optional[int] = None


class TranscriptResponse(TranscriptCreate):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TranscriptSearchParams(BaseModel):
    query: Optional[str] = None
    user_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


# ============== Alert Schemas ==============

class AlertCreate(BaseModel):
    type: str = Field(..., max_length=100)
    severity: str
    source: str = Field(..., max_length=200)
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)


class AlertResponse(AlertCreate):
    id: str
    acknowledged: bool
    acknowledged_by: Optional[str]
    acknowledged_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertConfigUpdate(BaseModel):
    thresholds: Dict[str, Any] = Field(default_factory=dict)
    notification_channels: List[str] = Field(default_factory=list)
    enabled: bool = True


# ============== Export Schemas ==============

class ExportRequest(BaseModel):
    type: str  # api_logs, transcripts, etc.
    format: str = "csv"
    filters: Dict[str, Any] = Field(default_factory=dict)


class ExportResponse(BaseModel):
    id: str
    type: str
    format: str
    status: str
    file_path: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class ExportFormatResponse(BaseModel):
    formats: List[str]
    types: List[str]


class ScheduledExportCreate(BaseModel):
    type: str
    format: str
    filters: Dict[str, Any] = Field(default_factory=dict)
    schedule: str  # cron expression


# ============== Graph Schemas ==============

class GraphConfigCreate(BaseModel):
    name: str = Field(..., max_length=200)
    type: str = Field(..., max_length=50)
    config: Dict[str, Any] = Field(default_factory=dict)


class GraphConfigResponse(GraphConfigCreate):
    id: str
    created_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardDataResponse(BaseModel):
    total_requests: int
    error_rate: float
    avg_response_time_ms: float
    active_users: int
    alerts_count: int
    timestamp: datetime


class TimeSeriesDataPoint(BaseModel):
    timestamp: datetime
    value: float


class TimeSeriesResponse(BaseModel):
    metric: str
    data: List[TimeSeriesDataPoint]


class AggregationResponse(BaseModel):
    metric: str
    value: float
    period: str
    comparison: Optional[float] = None  # % change from previous period
