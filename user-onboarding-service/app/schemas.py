"""
Pydantic schemas for User Onboarding Service.
"""

from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# ============== Department Schemas ==============

class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentResponse(DepartmentBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============== Location Schemas ==============

class LocationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)


class LocationCreate(LocationBase):
    pass


class LocationResponse(LocationBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============== Specialization Schemas ==============

class SpecializationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category: Optional[str] = Field(None, max_length=100)


class SpecializationCreate(SpecializationBase):
    pass


class SpecializationResponse(SpecializationBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============== Demographics Response ==============

class DemographicsResponse(BaseModel):
    departments: List[DepartmentResponse]
    locations: List[LocationResponse]
    specializations: List[SpecializationResponse]


# ============== EID Schemas ==============

class EIDConfigBase(BaseModel):
    prefix: str = Field(default="EMP", max_length=20)
    sequence_start: int = Field(default=1000, ge=0)
    pattern: str = Field(default="{prefix}{sequence:06d}", max_length=100)


class EIDConfigUpdate(BaseModel):
    prefix: Optional[str] = Field(None, max_length=20)
    pattern: Optional[str] = Field(None, max_length=100)


class EIDConfigResponse(EIDConfigBase):
    id: str
    current_sequence: int
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class EIDGenerateResponse(BaseModel):
    eid: str


class EIDValidateResponse(BaseModel):
    eid: str
    is_valid: bool
    is_available: bool


# ============== User Schemas ==============

class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)


class UserCreate(UserBase):
    department_id: Optional[str] = None
    location_id: Optional[str] = None
    specialization_id: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    status: Optional[str] = None


class UserDemographicsUpdate(BaseModel):
    department_id: Optional[str] = None
    location_id: Optional[str] = None
    specialization_id: Optional[str] = None


class UserResponse(UserBase):
    id: str
    eid: Optional[str]
    status: str
    department_id: Optional[str]
    location_id: Optional[str]
    specialization_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserDetailResponse(UserResponse):
    department: Optional[DepartmentResponse]
    location: Optional[LocationResponse]
    specialization: Optional[SpecializationResponse]


# ============== Registration Schemas ==============

class RegistrationBase(BaseModel):
    registration_number: str = Field(..., min_length=1, max_length=100)
    council_name: str = Field(..., min_length=1, max_length=200)
    expiry_date: Optional[date] = None


class RegistrationCreate(RegistrationBase):
    pass


class RegistrationUpdate(BaseModel):
    registration_number: Optional[str] = Field(None, min_length=1, max_length=100)
    council_name: Optional[str] = Field(None, min_length=1, max_length=200)
    expiry_date: Optional[date] = None


class RegistrationResponse(RegistrationBase):
    id: str
    user_id: str
    verified: bool
    verified_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VerifyRegistrationResponse(BaseModel):
    registration_number: str
    verified: bool
    verified_at: Optional[datetime]
    message: str


# ============== Supervisor Schemas ==============

class SupervisorAssignRequest(BaseModel):
    supervisor_id: str


class SupervisorResponse(BaseModel):
    id: str
    user_id: str
    supervisor_id: Optional[str]
    supervisor_name: Optional[str]
    assigned_at: datetime
    assigned_by: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class ReporteeResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    assigned_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============== Audio Sample Schemas ==============

class AudioSampleBase(BaseModel):
    filename: str
    format: str
    size_bytes: int
    duration_seconds: Optional[int] = None


class AudioSampleResponse(AudioSampleBase):
    id: str
    user_id: str
    validated: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AudioSampleValidateResponse(BaseModel):
    id: str
    validated: bool
    message: str


# ============== Search Schema ==============

class UserSearchParams(BaseModel):
    query: Optional[str] = None
    department_id: Optional[str] = None
    location_id: Optional[str] = None
    specialization_id: Optional[str] = None
    status: Optional[str] = None
