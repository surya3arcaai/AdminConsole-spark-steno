"""
Role management endpoints for RBAC Service.
"""

from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_user, UserContext
from shared.schemas import PaginatedResponse, SuccessResponse

from ..schemas import (
    RoleCreate,
    RoleUpdate,
    RoleResponse,
    RoleSummaryResponse,
    UserRoleAssign,
    UserRoleResponse,
    UserRolesResponse,
    RolePermissionUpdate,
    AccessValidationRequest,
    AccessValidationResponse,
    UserRoleCreate,
    DoctorRoleCreate,
    AdminRoleCreate,
    SupervisorRoleCreate,
)
from .. import crud

router = APIRouter(tags=["Roles"])


# ============== Generic Role Management ==============

@router.get("/roles", response_model=PaginatedResponse[RoleResponse])
async def list_roles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    List all roles.
    """
    skip = (page - 1) * page_size
    roles, total = await crud.get_roles(db, skip=skip, limit=page_size)
    return PaginatedResponse.create(
        items=roles,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/roles", response_model=RoleResponse, status_code=201)
async def create_role(
    data: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Create a new role.

    Requires admin role.
    """
    role = await crud.create_role(db, data)
    return role


@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Get a specific role by ID.
    """
    role = await crud.get_role(db, role_id)
    return role


@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: str,
    data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Update a role.

    Requires admin role.
    """
    role = await crud.update_role(db, role_id, data)
    return role


@router.delete("/roles/{role_id}", status_code=204)
async def delete_role(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Delete a role.

    System roles cannot be deleted.
    Requires admin role.
    """
    await crud.delete_role(db, role_id)


@router.put("/roles/{role_id}/permissions", response_model=RoleResponse)
async def update_role_permissions(
    role_id: str,
    data: RolePermissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Update permissions for a role.

    Requires admin role.
    """
    role = await crud.update_role_permissions(db, role_id, data.permission_ids)
    return role


# ============== User Role ==============

@router.post("/roles/user", response_model=RoleResponse, status_code=201)
async def create_user_role(
    data: UserRoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Create the User system role.
    """
    role = await crud.get_role_by_name(db, "user")
    if role:
        return role
    role_data = RoleCreate(
        name="User",
        description=data.description,
        permission_ids=[],
    )
    role = await crud.create_role(db, role_data, is_system=True)
    return role


@router.get("/roles/user/permissions", response_model=List[str])
async def get_user_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Get permissions assigned to the User role.
    """
    role = await crud.get_role_by_name(db, "user")
    if not role:
        return []
    return [p.name for p in role.permissions]


@router.post("/users/{user_id}/roles/user", response_model=SuccessResponse, status_code=201)
async def assign_user_role(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Assign the User role to a user.
    """
    role = await crud.get_role_by_name(db, "user")
    if not role:
        role_data = RoleCreate(name="User", description="Standard Clinical Practitioner / User")
        role = await crud.create_role(db, role_data, is_system=True)

    await crud.assign_role_to_user(db, user_id, role.id, current_user.user_id)
    return SuccessResponse(message=f"User role assigned to user {user_id}")


@router.delete("/users/{user_id}/roles/user", status_code=204)
async def revoke_user_role(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Remove the User role from a user.
    """
    role = await crud.get_role_by_name(db, "user")
    if role:
        await crud.revoke_role_from_user(db, user_id, role.id)


@router.get("/roles/user/users", response_model=PaginatedResponse[str])
async def list_users_with_user_role(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    List all users with the User role.
    """
    role = await crud.get_role_by_name(db, "user")
    if not role:
        return PaginatedResponse.create(items=[], total=0, page=page, page_size=page_size)

    skip = (page - 1) * page_size
    user_ids, total = await crud.get_users_by_role(db, role.id, skip=skip, limit=page_size)
    return PaginatedResponse.create(items=user_ids, total=total, page=page, page_size=page_size)


# ============== Doctor Role (Legacy Alias) ==============

@router.post("/roles/doctor", response_model=RoleResponse, status_code=201)
async def create_doctor_role(
    data: DoctorRoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    return await create_user_role(UserRoleCreate(description=data.description), db, current_user)


@router.get("/roles/doctor/permissions", response_model=List[str])
async def get_doctor_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    return await get_user_permissions(db, current_user)


@router.post("/users/{user_id}/roles/doctor", response_model=SuccessResponse, status_code=201)
async def assign_doctor_role(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    return await assign_user_role(user_id, db, current_user)


@router.delete("/users/{user_id}/roles/doctor", status_code=204)
async def revoke_doctor_role(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    return await revoke_user_role(user_id, db, current_user)


@router.get("/roles/doctor/users", response_model=PaginatedResponse[str])
async def list_doctors(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    return await list_users_with_user_role(page, page_size, db, current_user)



# ============== Admin Role ==============

@router.post("/roles/admin", response_model=RoleResponse, status_code=201)
async def create_admin_role(
    data: AdminRoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Create the Admin system role with full system permissions.
    """
    role_data = RoleCreate(
        name="admin",
        description=data.description,
        permission_ids=[],
    )
    role = await crud.create_role(db, role_data, is_system=True)
    return role


@router.get("/roles/admin/permissions", response_model=List[str])
async def get_admin_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Get permissions assigned to the Admin role.
    """
    role = await crud.get_role_by_name(db, "admin")
    if not role:
        return []
    return [p.name for p in role.permissions]


@router.post("/users/{user_id}/roles/admin", response_model=SuccessResponse, status_code=201)
async def assign_admin_role(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Assign the Admin role to a user.
    """
    role = await crud.get_role_by_name(db, "admin")
    if not role:
        role_data = RoleCreate(name="admin", description="Administrator role with full system access")
        role = await crud.create_role(db, role_data, is_system=True)

    await crud.assign_role_to_user(db, user_id, role.id, current_user.user_id)
    return SuccessResponse(message=f"Admin role assigned to user {user_id}")


@router.delete("/users/{user_id}/roles/admin", status_code=204)
async def revoke_admin_role(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Remove the Admin role from a user.
    """
    role = await crud.get_role_by_name(db, "admin")
    if role:
        await crud.revoke_role_from_user(db, user_id, role.id)


@router.get("/roles/admin/users", response_model=PaginatedResponse[str])
async def list_admins(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    List all users with the Admin role.
    """
    role = await crud.get_role_by_name(db, "admin")
    if not role:
        return PaginatedResponse.create(items=[], total=0, page=page, page_size=page_size)

    skip = (page - 1) * page_size
    user_ids, total = await crud.get_users_by_role(db, role.id, skip=skip, limit=page_size)
    return PaginatedResponse.create(items=user_ids, total=total, page=page, page_size=page_size)


# ============== Supervisor Role ==============

@router.post("/roles/supervisor", response_model=RoleResponse, status_code=201)
async def create_supervisor_role(
    data: SupervisorRoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Create the Supervisor system role with oversight permissions.
    """
    role_data = RoleCreate(
        name="supervisor",
        description=data.description,
        permission_ids=[],
    )
    role = await crud.create_role(db, role_data, is_system=True)
    return role


@router.get("/roles/supervisor/permissions", response_model=List[str])
async def get_supervisor_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Get permissions assigned to the Supervisor role.
    """
    role = await crud.get_role_by_name(db, "supervisor")
    if not role:
        return []
    return [p.name for p in role.permissions]


@router.post("/users/{user_id}/roles/supervisor", response_model=SuccessResponse, status_code=201)
async def assign_supervisor_role(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Assign the Supervisor role to a user.
    """
    role = await crud.get_role_by_name(db, "supervisor")
    if not role:
        role_data = RoleCreate(name="supervisor", description="Supervisor role with oversight permissions")
        role = await crud.create_role(db, role_data, is_system=True)

    await crud.assign_role_to_user(db, user_id, role.id, current_user.user_id)
    return SuccessResponse(message=f"Supervisor role assigned to user {user_id}")


@router.delete("/users/{user_id}/roles/supervisor", status_code=204)
async def revoke_supervisor_role(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Remove the Supervisor role from a user.
    """
    role = await crud.get_role_by_name(db, "supervisor")
    if role:
        await crud.revoke_role_from_user(db, user_id, role.id)


@router.get("/roles/supervisor/users", response_model=PaginatedResponse[str])
async def list_supervisors(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    List all users with the Supervisor role.
    """
    role = await crud.get_role_by_name(db, "supervisor")
    if not role:
        return PaginatedResponse.create(items=[], total=0, page=page, page_size=page_size)

    skip = (page - 1) * page_size
    user_ids, total = await crud.get_users_by_role(db, role.id, skip=skip, limit=page_size)
    return PaginatedResponse.create(items=user_ids, total=total, page=page, page_size=page_size)


# ============== User Roles Management ==============

@router.get("/users/{user_id}/roles", response_model=UserRolesResponse)
async def get_user_roles(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Get all roles assigned to a user.
    """
    roles = await crud.get_user_roles(db, user_id)
    return UserRolesResponse(
        user_id=user_id,
        roles=[RoleSummaryResponse.model_validate(r) for r in roles],
    )


@router.post("/users/{user_id}/roles/{role_name}", response_model=SuccessResponse, status_code=201)
async def assign_role_by_name(
    user_id: str,
    role_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Assign a role by name to a user (case-insensitive).
    """
    role = await crud.get_role_by_name(db, role_name)
    if not role:
        raise NotFoundException("Role", role_name)
    await crud.assign_role_to_user(db, user_id, role.id, current_user.user_id)
    return SuccessResponse(message=f"Role '{role.name}' assigned to user {user_id}")


@router.delete("/users/{user_id}/roles/{role_name}", status_code=204)
async def revoke_role_by_name(
    user_id: str,
    role_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Remove a role by name from a user.
    """
    role = await crud.get_role_by_name(db, role_name)
    if role:
        await crud.revoke_role_from_user(db, user_id, role.id)


# ============== Access Validation ==============

@router.post("/validate", response_model=AccessValidationResponse)
async def validate_access(
    data: AccessValidationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Validate if a user has the required permissions and/or roles.

    Returns detailed information about what access the user has and what they're missing.
    """
    result = await crud.validate_user_access(
        db,
        user_id=data.user_id,
        required_permissions=data.required_permissions,
        required_roles=data.required_roles,
    )
    return result
