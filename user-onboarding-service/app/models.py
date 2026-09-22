"""
SQLAlchemy models for User Onboarding Service.
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    DateTime,
    Date,
    Integer,
    ForeignKey,
    LargeBinary,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from shared.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"
    active = "active"
    inactive = "inactive"
    pending = "pending"
    suspended = "suspended"


class Department(Base):
    """Department model."""

    __tablename__ = "departments"

    id = Column(String(255), primary_key=True, default=generate_uuid)
    name = Column(String(200), unique=True, nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    users = relationship("User", back_populates="department")


class Hospital(Base):
    """Hospital model."""

    __tablename__ = "hospitals"

    id = Column(String(255), primary_key=True, default=generate_uuid)
    name = Column(String(200), unique=True, nullable=False, index=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    users = relationship("User", back_populates="hospital")


# Backward compatibility alias
Location = Hospital


class Specialization(Base):
    """Specialization model for medical specialties."""

    __tablename__ = "specializations"

    id = Column(String(255), primary_key=True, default=generate_uuid)
    name = Column(String(200), unique=True, nullable=False, index=True)
    category = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    users = relationship("User", back_populates="specialization")


class EIDConfig(Base):
    """Configuration for Employee ID generation."""

    __tablename__ = "eid_config"

    id = Column(String(255), primary_key=True, default=generate_uuid)
    prefix = Column(String(20), default="EMP", nullable=False)
    sequence_start = Column(Integer, default=1000, nullable=False)
    current_sequence = Column(Integer, default=1000, nullable=False)
    pattern = Column(String(100), default="{prefix}{sequence:06d}", nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class User(Base):
    """User model."""

    __tablename__ = "users"

    id = Column(String(255), primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    eid = Column(String(50), unique=True, nullable=True, index=True)
    phone = Column(String(20), nullable=True)
    status = Column(String(50), default="pending", nullable=False)

    # Demographics
    department_id = Column(String(255), ForeignKey("departments.id"), nullable=True)
    hospital_id = Column(String(255), ForeignKey("hospitals.id"), nullable=True)
    specialization_id = Column(String(255), ForeignKey("specializations.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    department = relationship("Department", back_populates="users")
    hospital = relationship("Hospital", back_populates="users")
    specialization = relationship("Specialization", back_populates="users")

    @property
    def location_id(self):
        return self.hospital_id

    @location_id.setter
    def location_id(self, val):
        self.hospital_id = val

    @property
    def location(self):
        return self.hospital
    registration = relationship("Registration", back_populates="user", uselist=False, cascade="all, delete-orphan", passive_deletes=True)
    audio_samples = relationship("AudioSample", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    supervisor_assignment = relationship(
        "SupervisorAssignment",
        back_populates="user",
        foreign_keys="SupervisorAssignment.user_id",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    reportees = relationship(
        "SupervisorAssignment",
        back_populates="supervisor",
        foreign_keys="SupervisorAssignment.supervisor_id",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Registration(Base):
    """Medical registration details from council."""

    __tablename__ = "registrations"

    id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    registration_number = Column(String(100), unique=True, nullable=False, index=True)
    council_name = Column(String(200), nullable=False)
    verified = Column(Boolean, default=False, nullable=False)
    verified_at = Column(DateTime, nullable=True)
    expiry_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="registration")


class SupervisorAssignment(Base):
    """Supervisor-reportee assignment."""

    __tablename__ = "supervisor_assignments"

    id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    supervisor_id = Column(String(255), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    assigned_by = Column(String(100), nullable=True)  # External user ID who made the assignment

    # Relationships
    user = relationship("User", back_populates="supervisor_assignment", foreign_keys=[user_id])
    supervisor = relationship("User", back_populates="reportees", foreign_keys=[supervisor_id])


class AudioSample(Base):
    """Audio sample for voice recognition."""

    __tablename__ = "audio_samples"

    id = Column(String(255), primary_key=True, default=generate_uuid)
    user_id = Column(String(255), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_data = Column(LargeBinary, nullable=False)  # Audio stored in database
    duration_seconds = Column(Integer, nullable=True)
    format = Column(String(20), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    validated = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="audio_samples")