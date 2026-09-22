"""
Pydantic schemas for RBAC Service.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


# ============== Permission Schemas ==============

class PermissionBase(BaseModel):
    """Base schema for permission."""
    name: str = Field(..., min_length=1, max_length=100, description="Permission name")
    module: str = Field(..., min_length=1, max_length=100, description="Module name (e.g., users, templates)")
    action: str = Field(..., min_length=1, max_length=50, description="Action (e.g., create, read, update, delete)")
    description: Optional[str] = Field(None, description="Permission description")


class PermissionCreate(PermissionBase):
    """Schema for creating a permission."""
    pass


class PermissionUpdate(BaseModel):
    """Schema for updating a permission."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None


class PermissionResponse(PermissionBase):
    """Schema for permission response."""
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============== Role Schemas ==============

class RoleBase(BaseModel):
    """Base schema for role."""
    name: str = Field(..., min_length=1, max_length=100, description="Role name")
    description: Optional[str] = Field(None, description="Role description")


class RoleCreate(RoleBase):
    """Schema for creating a role."""
    permission_ids: Optional[List[str]] = Field(default=[], description="List of permission IDs to assign")


class RoleUpdate(BaseModel):
    """Schema for updating a role."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None


class RoleResponse(RoleBase):
    """Schema for role response."""
    id: str
    is_system: bool
    created_at: datetime
    updated_at: datetime
    permissions: List[PermissionResponse] = []

    model_config = ConfigDict(from_attributes=True)


class RoleSummaryResponse(BaseModel):
    """Schema for role summary (without permissions)."""
    id: str
    name: str
    description: Optional[str]
    is_system: bool

    model_config = ConfigDict(from_attributes=True)


# ============== User Role Schemas ==============

class UserRoleAssign(BaseModel):
    """Schema for assigning a role to a user."""
    role_id: str = Field(..., description="Role ID to assign")


class UserRoleResponse(BaseModel):
    """Schema for user role response."""
    id: str
    user_id: str
    role_id: str
    role_name: str
    assigned_at: datetime
    assigned_by: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class UserRolesResponse(BaseModel):
    """Schema for listing all roles of a user."""
    user_id: str
    roles: List[RoleSummaryResponse]


# ============== Access Validation Schemas ==============

class AccessValidationRequest(BaseModel):
    """Schema for validating user access."""
    user_id: str = Field(..., description="User ID to validate")
    required_permissions: Optional[List[str]] = Field(default=[], description="Permissions to check")
    required_roles: Optional[List[str]] = Field(default=[], description="Roles to check")


class AccessValidationResponse(BaseModel):
    """Schema for access validation response."""
    user_id: str
    has_access: bool
    user_roles: List[str]
    user_permissions: List[str]
    missing_permissions: List[str] = []
    missing_roles: List[str] = []


# ============== Role Permission Management ==============

class RolePermissionUpdate(BaseModel):
    """Schema for updating role permissions."""
    permission_ids: List[str] = Field(..., description="List of permission IDs")


# ============== System Role Schemas (Doctor, Admin, Supervisor) ==============

class UserRoleCreate(BaseModel):
    """Schema for creating user role with predefined permissions."""
    description: Optional[str] = Field(
        default="Standard Clinical Practitioner / User role",
        description="Role description"
    )


class DoctorRoleCreate(BaseModel):
    """Schema for creating doctor role with predefined permissions."""
    description: Optional[str] = Field(
        default="Doctor role with clinical access",
        description="Role description"
    )


class AdminRoleCreate(BaseModel):
    """Schema for creating admin role with predefined permissions."""
    description: Optional[str] = Field(
        default="Administrator role with full system access",
        description="Role description"
    )


class SupervisorRoleCreate(BaseModel):
    """Schema for creating supervisor role with predefined permissions."""
    description: Optional[str] = Field(
        default="Supervisor role with oversight permissions",
        description="Role description"
    )
