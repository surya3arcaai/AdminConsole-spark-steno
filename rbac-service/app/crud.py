"""
CRUD operations for RBAC Service.
"""

from typing import List, Optional, Tuple
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import Role, Permission, UserRole, role_permissions
from .schemas import (
    RoleCreate,
    RoleUpdate,
    PermissionCreate,
    PermissionUpdate,
    AccessValidationResponse,
)
from shared.exceptions import NotFoundException, ConflictException, ValidationException


# ============== Permission CRUD ==============

async def create_permission(db: AsyncSession, data: PermissionCreate) -> Permission:
    """Create a new permission."""
    # Check if permission with same name exists
    existing = await db.execute(select(Permission).where(Permission.name == data.name))
    if existing.scalar_one_or_none():
        raise ConflictException(resource=f"Permission '{data.name}'")

    # Check if permission with same module+action exists
    existing_combo = await db.execute(
        select(Permission).where(
            Permission.module == data.module,
            Permission.action == data.action
        )
    )
    if existing_combo.scalar_one_or_none():
        raise ConflictException(
            message=f"Permission for module '{data.module}' with action '{data.action}' already exists"
        )

    permission = Permission(**data.model_dump())
    db.add(permission)
    await db.flush()
    await db.refresh(permission)
    return permission


async def get_permission(db: AsyncSession, permission_id: str) -> Permission:
    """Get a permission by ID."""
    result = await db.execute(select(Permission).where(Permission.id == permission_id))
    permission = result.scalar_one_or_none()
    if not permission:
        raise NotFoundException("Permission", permission_id)
    return permission


async def get_permissions(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    module: Optional[str] = None,
) -> Tuple[List[Permission], int]:
    """Get all permissions with optional filtering."""
    query = select(Permission)
    count_query = select(func.count(Permission.id))

    if module:
        query = query.where(Permission.module == module)
        count_query = count_query.where(Permission.module == module)

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get permissions
    query = query.offset(skip).limit(limit).order_by(Permission.module, Permission.action)
    result = await db.execute(query)
    permissions = result.scalars().all()

    return list(permissions), total


async def update_permission(
    db: AsyncSession,
    permission_id: str,
    data: PermissionUpdate,
) -> Permission:
    """Update a permission."""
    permission = await get_permission(db, permission_id)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(permission, field, value)

    await db.flush()
    await db.refresh(permission)
    return permission


async def delete_permission(db: AsyncSession, permission_id: str) -> None:
    """Delete a permission."""
    permission = await get_permission(db, permission_id)
    await db.delete(permission)
    await db.flush()


# ============== Role CRUD ==============

async def create_role(db: AsyncSession, data: RoleCreate, is_system: bool = False) -> Role:
    """Create a new role."""
    # Check if role with same name exists
    existing = await db.execute(select(Role).where(Role.name == data.name))
    if existing.scalar_one_or_none():
        raise ConflictException(resource=f"Role '{data.name}'")

    # Get permissions if provided
    permissions = []
    if data.permission_ids:
        for perm_id in data.permission_ids:
            perm = await get_permission(db, perm_id)
            permissions.append(perm)

    role = Role(
        name=data.name,
        description=data.description,
        is_system=is_system,
    )
    role.permissions = permissions
    db.add(role)
    await db.flush()
    await db.refresh(role)
    return role


async def get_role(db: AsyncSession, role_id: str) -> Role:
    """Get a role by ID with permissions."""
    result = await db.execute(
        select(Role)
        .options(selectinload(Role.permissions))
        .where(Role.id == role_id)
    )
    role = result.scalar_one_or_none()
    if not role:
        raise NotFoundException("Role", role_id)
    return role


async def get_role_by_name(db: AsyncSession, name: str) -> Optional[Role]:
    """Get a role by name."""
    result = await db.execute(
        select(Role)
        .options(selectinload(Role.permissions))
        .where(Role.name == name)
    )
    return result.scalar_one_or_none()


async def get_roles(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[Role], int]:
    """Get all roles."""
    # Get total count
    count_result = await db.execute(select(func.count(Role.id)))
    total = count_result.scalar()

    # Get roles with permissions
    query = (
        select(Role)
        .options(selectinload(Role.permissions))
        .offset(skip)
        .limit(limit)
        .order_by(Role.name)
    )
    result = await db.execute(query)
    roles = result.scalars().all()

    return list(roles), total


async def update_role(db: AsyncSession, role_id: str, data: RoleUpdate) -> Role:
    """Update a role."""
    role = await get_role(db, role_id)

    if role.is_system and data.name and data.name != role.name:
        raise ValidationException("Cannot rename system roles")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(role, field, value)

    await db.flush()
    await db.refresh(role)
    return role


async def delete_role(db: AsyncSession, role_id: str) -> None:
    """Delete a role."""
    role = await get_role(db, role_id)

    if role.is_system:
        raise ValidationException("Cannot delete system roles")

    await db.delete(role)
    await db.flush()


async def update_role_permissions(
    db: AsyncSession,
    role_id: str,
    permission_ids: List[str],
) -> Role:
    """Update permissions for a role."""
    role = await get_role(db, role_id)

    # Get all permissions
    permissions = []
    for perm_id in permission_ids:
        perm = await get_permission(db, perm_id)
        permissions.append(perm)

    role.permissions = permissions
    await db.flush()
    await db.refresh(role)
    return role


# ============== User Role CRUD ==============

async def assign_role_to_user(
    db: AsyncSession,
    user_id: str,
    role_id: str,
    assigned_by: Optional[str] = None,
) -> UserRole:
    """Assign a role to a user."""
    # Verify role exists
    role = await get_role(db, role_id)

    # Check if assignment already exists
    existing = await db.execute(
        select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictException(message=f"User already has role '{role.name}'")

    user_role = UserRole(
        user_id=user_id,
        role_id=role_id,
        assigned_by=assigned_by,
    )
    db.add(user_role)
    await db.flush()
    await db.refresh(user_role)
    return user_role


async def revoke_role_from_user(
    db: AsyncSession,
    user_id: str,
    role_id: str,
) -> None:
    """Revoke a role from a user."""
    result = await db.execute(
        select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id
        )
    )
    user_role = result.scalar_one_or_none()
    if not user_role:
        raise NotFoundException("User role assignment")

    await db.delete(user_role)
    await db.flush()


async def get_user_roles(db: AsyncSession, user_id: str) -> List[Role]:
    """Get all roles for a user."""
    result = await db.execute(
        select(Role)
        .join(UserRole, UserRole.role_id == Role.id)
        .options(selectinload(Role.permissions))
        .where(UserRole.user_id == user_id)
    )
    return list(result.scalars().all())


async def get_users_by_role(
    db: AsyncSession,
    role_id: str,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[str], int]:
    """Get all user IDs with a specific role."""
    # Verify role exists
    await get_role(db, role_id)

    # Get count
    count_result = await db.execute(
        select(func.count(UserRole.id)).where(UserRole.role_id == role_id)
    )
    total = count_result.scalar()

    # Get user IDs
    result = await db.execute(
        select(UserRole.user_id)
        .where(UserRole.role_id == role_id)
        .offset(skip)
        .limit(limit)
    )
    user_ids = [row[0] for row in result.all()]

    return user_ids, total


# ============== Access Validation ==============

async def validate_user_access(
    db: AsyncSession,
    user_id: str,
    required_permissions: List[str] = None,
    required_roles: List[str] = None,
) -> AccessValidationResponse:
    """Validate if a user has required permissions/roles."""
    required_permissions = required_permissions or []
    required_roles = required_roles or []

    # Get user's roles with permissions
    user_roles = await get_user_roles(db, user_id)
    role_names = [r.name for r in user_roles]

    # Collect all permissions from all roles
    user_permissions = set()
    for role in user_roles:
        for perm in role.permissions:
            user_permissions.add(perm.name)

    # Check missing roles
    missing_roles = [r for r in required_roles if r not in role_names]

    # Check missing permissions
    missing_permissions = [p for p in required_permissions if p not in user_permissions]

    # Determine if user has access
    has_access = len(missing_roles) == 0 and len(missing_permissions) == 0

    return AccessValidationResponse(
        user_id=user_id,
        has_access=has_access,
        user_roles=role_names,
        user_permissions=list(user_permissions),
        missing_roles=missing_roles,
        missing_permissions=missing_permissions,
    )


# ============== System Role Initialization ==============

async def get_or_create_system_role(
    db: AsyncSession,
    name: str,
    description: str,
    permissions: List[Permission],
) -> Role:
    """Get or create a system role."""
    role = await get_role_by_name(db, name)
    if role:
        return role

    role = Role(
        name=name,
        description=description,
        is_system=True,
    )
    role.permissions = permissions
    db.add(role)
    await db.flush()
    await db.refresh(role)
    return role
