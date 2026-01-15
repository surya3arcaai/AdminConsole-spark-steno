"""
SQLAlchemy models for Template Service.
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
    JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from shared.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class TemplateType(enum.Enum):
    CLINICAL = "clinical"
    DISCHARGE = "discharge"


class TemplateStatus(enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class Template(Base):
    """Template model for clinical and discharge summaries."""

    __tablename__ = "templates"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    type = Column(SQLEnum(TemplateType), nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=False)  # Jinja2 template content
    variables_schema = Column(JSON, default=dict)  # Schema for template variables
    version = Column(Integer, default=1, nullable=False)
    status = Column(SQLEnum(TemplateStatus), default=TemplateStatus.DRAFT, nullable=False)
    created_by = Column(String(100), nullable=True)  # External user ID
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    versions = relationship("TemplateVersion", back_populates="template", cascade="all, delete-orphan")


class TemplateVersion(Base):
    """Template version history."""

    __tablename__ = "template_versions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=generate_uuid)
    template_id = Column(UUID(as_uuid=False), ForeignKey("templates.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    variables_schema = Column(JSON, default=dict)
    created_by = Column(String(100), nullable=True)  # External user ID
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    template = relationship("Template", back_populates="versions")
