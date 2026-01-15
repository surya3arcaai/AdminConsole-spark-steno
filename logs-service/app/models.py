"""SQLAlchemy models for Logs Service."""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
import enum

from shared.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class LogLevel(enum.Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertSeverity(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ExportStatus(enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ExportFormat(enum.Enum):
    CSV = "csv"
    JSON = "json"
    PDF = "pdf"


# ============== API Logs ==============

class APILog(Base):
    """API request/response logs."""

    __tablename__ = "api_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    service = Column(String(100), nullable=False, index=True)
    endpoint = Column(String(500), nullable=False, index=True)
    method = Column(String(10), nullable=False)
    status_code = Column(Integer, nullable=False, index=True)
    latency_ms = Column(Float, nullable=False)
    request_id = Column(String(100), nullable=True, index=True)
    user_id = Column(String(100), nullable=True, index=True)  # External user ID
    request_body = Column(Text, nullable=True)
    response_body = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


# ============== Container Logs ==============

class ContainerLog(Base):
    """Container/service logs."""

    __tablename__ = "container_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    container_id = Column(String(100), nullable=False, index=True)
    container_name = Column(String(200), nullable=False, index=True)
    log_level = Column(SQLEnum(LogLevel), default=LogLevel.INFO, nullable=False, index=True)
    message = Column(Text, nullable=False)
    log_metadata = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


# ============== Database Logs ==============

class DBLog(Base):
    """Database query logs."""

    __tablename__ = "db_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    database_name = Column(String(100), nullable=False, index=True)
    query = Column(Text, nullable=False)
    execution_time_ms = Column(Float, nullable=False)
    rows_affected = Column(Integer, nullable=True)
    is_slow_query = Column(Boolean, default=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


# ============== Transcripts ==============

class Transcript(Base):
    """Session transcripts."""

    __tablename__ = "transcripts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    user_id = Column(String(100), nullable=False, index=True)  # External user ID
    session_id = Column(String(100), nullable=False, index=True)
    content = Column(Text, nullable=False)
    log_metadata = Column(JSON, default=dict)
    duration_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


# ============== Alerts ==============

class Alert(Base):
    """System alerts."""

    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    type = Column(String(100), nullable=False, index=True)
    severity = Column(SQLEnum(AlertSeverity), nullable=False, index=True)
    source = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    details = Column(JSON, default=dict)
    acknowledged = Column(Boolean, default=False, index=True)
    acknowledged_by = Column(String(100), nullable=True)  # External user ID
    acknowledged_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


# ============== Export Jobs ==============

class ExportJob(Base):
    """Log export jobs."""

    __tablename__ = "export_jobs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    type = Column(String(50), nullable=False)  # api_logs, transcripts, etc.
    format = Column(SQLEnum(ExportFormat), nullable=False)
    filters = Column(JSON, default=dict)
    status = Column(SQLEnum(ExportStatus), default=ExportStatus.PENDING, nullable=False, index=True)
    file_path = Column(String(500), nullable=True)
    error_message = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=True)  # External user ID
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)


# ============== Graph Configs ==============

class GraphConfig(Base):
    """Custom graph configurations."""

    __tablename__ = "graph_configs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False)
    type = Column(String(50), nullable=False)  # line, bar, pie, etc.
    config = Column(JSON, default=dict)  # Data source, filters, etc.
    created_by = Column(String(100), nullable=True)  # External user ID
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
