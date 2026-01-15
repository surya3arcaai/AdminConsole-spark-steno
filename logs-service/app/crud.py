"""CRUD operations for Logs Service."""

from typing import List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from .models import (
    APILog, ContainerLog, DBLog, Transcript, Alert, ExportJob, GraphConfig,
    LogLevel, AlertSeverity, ExportStatus, ExportFormat
)
from .schemas import (
    APILogCreate, ContainerLogCreate, DBLogCreate, TranscriptCreate,
    AlertCreate, ExportRequest, GraphConfigCreate,
)
from shared.exceptions import NotFoundException


# ============== API Logs CRUD ==============

async def create_api_log(db: AsyncSession, data: APILogCreate) -> APILog:
    log = APILog(**data.model_dump())
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log


async def get_api_logs(
    db: AsyncSession,
    service: Optional[str] = None,
    status_code: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[APILog], int]:
    query = select(APILog)
    count_query = select(func.count(APILog.id))

    if service:
        query = query.where(APILog.service == service)
        count_query = count_query.where(APILog.service == service)
    if status_code:
        query = query.where(APILog.status_code == status_code)
        count_query = count_query.where(APILog.status_code == status_code)
    if start_date:
        query = query.where(APILog.timestamp >= start_date)
        count_query = count_query.where(APILog.timestamp >= start_date)
    if end_date:
        query = query.where(APILog.timestamp <= end_date)
        count_query = count_query.where(APILog.timestamp <= end_date)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(APILog.timestamp.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def get_api_stats(
    db: AsyncSession,
    start_date: datetime,
    end_date: datetime,
) -> dict:
    result = await db.execute(
        select(
            func.count(APILog.id).label("total"),
            func.avg(APILog.latency_ms).label("avg_latency"),
            func.count(APILog.id).filter(APILog.status_code >= 400).label("errors"),
        ).where(
            and_(APILog.timestamp >= start_date, APILog.timestamp <= end_date)
        )
    )
    row = result.first()
    total = row.total or 0
    errors = row.errors or 0
    return {
        "total_requests": total,
        "success_rate": ((total - errors) / total * 100) if total > 0 else 100,
        "avg_latency_ms": row.avg_latency or 0,
        "error_count": errors,
    }


async def get_api_errors(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[APILog], int]:
    query = select(APILog).where(APILog.status_code >= 400)
    count_query = select(func.count(APILog.id)).where(APILog.status_code >= 400)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(APILog.timestamp.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


# ============== Container Logs CRUD ==============

async def create_container_log(db: AsyncSession, data: ContainerLogCreate) -> ContainerLog:
    log = ContainerLog(
        container_id=data.container_id,
        container_name=data.container_name,
        log_level=LogLevel(data.log_level),
        message=data.message,
        log_metadata=data.log_metadata,
    )
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log


async def get_container_logs(
    db: AsyncSession,
    container_id: Optional[str] = None,
    log_level: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[ContainerLog], int]:
    query = select(ContainerLog)
    count_query = select(func.count(ContainerLog.id))

    if container_id:
        query = query.where(ContainerLog.container_id == container_id)
        count_query = count_query.where(ContainerLog.container_id == container_id)
    if log_level:
        query = query.where(ContainerLog.log_level == LogLevel(log_level))
        count_query = count_query.where(ContainerLog.log_level == LogLevel(log_level))

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(ContainerLog.timestamp.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


# ============== DB Logs CRUD ==============

async def create_db_log(db: AsyncSession, data: DBLogCreate) -> DBLog:
    is_slow = data.execution_time_ms > 1000  # > 1 second is slow
    log = DBLog(
        database_name=data.database_name,
        query=data.query,
        execution_time_ms=data.execution_time_ms,
        rows_affected=data.rows_affected,
        is_slow_query=is_slow,
    )
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log


async def get_db_logs(
    db: AsyncSession,
    database_name: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[DBLog], int]:
    query = select(DBLog)
    count_query = select(func.count(DBLog.id))

    if database_name:
        query = query.where(DBLog.database_name == database_name)
        count_query = count_query.where(DBLog.database_name == database_name)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(DBLog.timestamp.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def get_slow_queries(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[DBLog], int]:
    query = select(DBLog).where(DBLog.is_slow_query == True)
    count_query = select(func.count(DBLog.id)).where(DBLog.is_slow_query == True)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(DBLog.execution_time_ms.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


# ============== Transcript CRUD ==============

async def create_transcript(db: AsyncSession, data: TranscriptCreate) -> Transcript:
    transcript = Transcript(**data.model_dump())
    db.add(transcript)
    await db.flush()
    await db.refresh(transcript)
    return transcript


async def get_transcript(db: AsyncSession, transcript_id: str) -> Transcript:
    result = await db.execute(select(Transcript).where(Transcript.id == transcript_id))
    transcript = result.scalar_one_or_none()
    if not transcript:
        raise NotFoundException("Transcript", transcript_id)
    return transcript


async def get_transcripts(
    db: AsyncSession,
    user_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[Transcript], int]:
    query = select(Transcript)
    count_query = select(func.count(Transcript.id))

    if user_id:
        query = query.where(Transcript.user_id == user_id)
        count_query = count_query.where(Transcript.user_id == user_id)
    if start_date:
        query = query.where(Transcript.created_at >= start_date)
        count_query = count_query.where(Transcript.created_at >= start_date)
    if end_date:
        query = query.where(Transcript.created_at <= end_date)
        count_query = count_query.where(Transcript.created_at <= end_date)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(Transcript.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def search_transcripts(
    db: AsyncSession,
    query_text: str,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[Transcript], int]:
    search = f"%{query_text}%"
    query = select(Transcript).where(Transcript.content.ilike(search))
    count_query = select(func.count(Transcript.id)).where(Transcript.content.ilike(search))

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(Transcript.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


# ============== Alert CRUD ==============

async def create_alert(db: AsyncSession, data: AlertCreate) -> Alert:
    alert = Alert(
        type=data.type,
        severity=AlertSeverity(data.severity),
        source=data.source,
        message=data.message,
        details=data.details,
    )
    db.add(alert)
    await db.flush()
    await db.refresh(alert)
    return alert


async def get_alerts(
    db: AsyncSession,
    acknowledged: Optional[bool] = None,
    severity: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[Alert], int]:
    query = select(Alert)
    count_query = select(func.count(Alert.id))

    if acknowledged is not None:
        query = query.where(Alert.acknowledged == acknowledged)
        count_query = count_query.where(Alert.acknowledged == acknowledged)
    if severity:
        query = query.where(Alert.severity == AlertSeverity(severity))
        count_query = count_query.where(Alert.severity == AlertSeverity(severity))

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(Alert.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def acknowledge_alert(
    db: AsyncSession,
    alert_id: str,
    acknowledged_by: str,
) -> Alert:
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise NotFoundException("Alert", alert_id)

    alert.acknowledged = True
    alert.acknowledged_by = acknowledged_by
    alert.acknowledged_at = datetime.utcnow()
    await db.flush()
    await db.refresh(alert)
    return alert


# ============== Export CRUD ==============

async def create_export_job(
    db: AsyncSession,
    data: ExportRequest,
    created_by: str,
) -> ExportJob:
    job = ExportJob(
        type=data.type,
        format=ExportFormat(data.format),
        filters=data.filters,
        created_by=created_by,
    )
    db.add(job)
    await db.flush()
    await db.refresh(job)
    return job


async def get_export_job(db: AsyncSession, job_id: str) -> ExportJob:
    result = await db.execute(select(ExportJob).where(ExportJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise NotFoundException("Export job", job_id)
    return job


async def update_export_job_status(
    db: AsyncSession,
    job_id: str,
    status: str,
    file_path: Optional[str] = None,
    error_message: Optional[str] = None,
) -> ExportJob:
    job = await get_export_job(db, job_id)
    job.status = ExportStatus(status)
    if file_path:
        job.file_path = file_path
    if error_message:
        job.error_message = error_message
    if status == "completed":
        job.completed_at = datetime.utcnow()
    await db.flush()
    await db.refresh(job)
    return job


# ============== Graph Config CRUD ==============

async def create_graph_config(
    db: AsyncSession,
    data: GraphConfigCreate,
    created_by: str,
) -> GraphConfig:
    config = GraphConfig(
        name=data.name,
        type=data.type,
        config=data.config,
        created_by=created_by,
    )
    db.add(config)
    await db.flush()
    await db.refresh(config)
    return config


async def get_graph_configs(db: AsyncSession) -> List[GraphConfig]:
    result = await db.execute(select(GraphConfig).order_by(GraphConfig.name))
    return list(result.scalars().all())


async def get_dashboard_data(db: AsyncSession) -> dict:
    """Get aggregated dashboard data."""
    now = datetime.utcnow()
    hour_ago = now - timedelta(hours=1)

    # Get request stats
    api_result = await db.execute(
        select(
            func.count(APILog.id).label("total"),
            func.count(APILog.id).filter(APILog.status_code >= 400).label("errors"),
            func.avg(APILog.latency_ms).label("avg_latency"),
        ).where(APILog.timestamp >= hour_ago)
    )
    api_row = api_result.first()

    # Get active alerts
    alerts_result = await db.execute(
        select(func.count(Alert.id)).where(Alert.acknowledged == False)
    )
    alerts_count = alerts_result.scalar() or 0

    # Get unique users (from transcripts in last hour)
    users_result = await db.execute(
        select(func.count(func.distinct(Transcript.user_id))).where(
            Transcript.created_at >= hour_ago
        )
    )
    active_users = users_result.scalar() or 0

    total = api_row.total or 0
    errors = api_row.errors or 0

    return {
        "total_requests": total,
        "error_rate": (errors / total * 100) if total > 0 else 0,
        "avg_response_time_ms": api_row.avg_latency or 0,
        "active_users": active_users,
        "alerts_count": alerts_count,
        "timestamp": now,
    }
