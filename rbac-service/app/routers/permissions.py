"""
Permission management endpoints for RBAC Service.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_user, UserContext
from shared.schemas import PaginatedResponse

from ..schemas import (
    PermissionCreate,
    PermissionUpdate,
    PermissionResponse,
)
from .. import crud

router = APIRouter(prefix="/permissions", tags=["Permissions"])


@router.post("/", response_model=PermissionResponse, status_code=201)
async def create_permission(
    data: PermissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Create a new permission.

    Requires admin role.
    """
    permission = await crud.create_permission(db, data)
    return permission


@router.get("/", response_model=PaginatedResponse[PermissionResponse])
async def list_permissions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    module: Optional[str] = Query(None, description="Filter by module"),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    List all permissions with optional filtering.
    """
    skip = (page - 1) * page_size
    permissions, total = await crud.get_permissions(db, skip=skip, limit=page_size, module=module)
    return PaginatedResponse.create(
        items=permissions,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{permission_id}", response_model=PermissionResponse)
async def get_permission(
    permission_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Get a specific permission by ID.
    """
    permission = await crud.get_permission(db, permission_id)
    return permission


@router.put("/{permission_id}", response_model=PermissionResponse)
async def update_permission(
    permission_id: str,
    data: PermissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Update a permission.

    Requires admin role.
    """
    permission = await crud.update_permission(db, permission_id, data)
    return permission


@router.delete("/{permission_id}", status_code=204)
async def delete_permission(
    permission_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """
    Delete a permission.

    Requires admin role.
    """
    await crud.delete_permission(db, permission_id)
