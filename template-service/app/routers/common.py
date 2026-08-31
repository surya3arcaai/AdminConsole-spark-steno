"""
Common template endpoints (all types, versioning, import/export).
"""

from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_user, UserContext
from shared.schemas import PaginatedResponse

from ..schemas import (
    TemplateResponse, TemplateSummaryResponse, TemplateVersionResponse,
    TemplateExportResponse, TemplateImportRequest,
)
from .. import crud

router = APIRouter(tags=["Templates Common"])


@router.get("/", response_model=PaginatedResponse[TemplateSummaryResponse])
async def list_all_templates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """List all templates (clinical and discharge)."""
    skip = (page - 1) * page_size
    templates, total = await crud.get_templates(db, skip=skip, limit=page_size)
    return PaginatedResponse.create(items=templates, total=total, page=page, page_size=page_size)


@router.get("/{template_id}/versions", response_model=List[TemplateVersionResponse])
async def get_template_versions(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get version history for a template."""
    versions = await crud.get_template_versions(db, template_id)
    return versions


@router.post("/{template_id}/versions/{version_id}/restore", response_model=TemplateResponse)
async def restore_template_version(
    template_id: str,
    version_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Restore a template to a specific version."""
    template = await crud.restore_version(db, template_id, version_id, current_user.user_id)
    return template


@router.get("/{template_id}/export", response_model=TemplateExportResponse)
async def export_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Export a template as JSON."""
    export_data = await crud.export_template(db, template_id)
    return export_data


@router.post("/import", response_model=TemplateResponse, status_code=201)
async def import_template(
    data: TemplateImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Import a template from JSON."""
    template = await crud.import_template(
        db,
        template_type=data.type,
        name=data.name,
        content=data.content,
        description=data.description,
        variables_schema=data.variables_schema,
        created_by=current_user.user_id,
    )
    return template


from pydantic import BaseModel

class UserTemplateAssignRequest(BaseModel):
    template_ids: List[str]


@router.post("/user/{user_id}/assign")
async def assign_user_templates(
    user_id: str,
    data: UserTemplateAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Assign template IDs to a user."""
    assignments = await crud.assign_user_templates(db, user_id, data.template_ids)
    return {"success": True, "count": len(assignments)}


@router.get("/user/{user_id}", response_model=List[TemplateSummaryResponse])
async def get_user_templates(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get assigned templates for a user."""
    templates = await crud.get_user_templates(db, user_id)
    return templates
