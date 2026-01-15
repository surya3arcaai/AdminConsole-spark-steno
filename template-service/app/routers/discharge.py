"""
Discharge summary template endpoints.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_user, UserContext
from shared.schemas import PaginatedResponse

from ..models import TemplateType
from ..schemas import (
    TemplateCreate, TemplateUpdate, TemplateResponse, TemplateSummaryResponse,
    TemplatePreviewRequest, TemplatePreviewResponse,
    TemplateRenderRequest, TemplateRenderResponse,
)
from .. import crud

router = APIRouter(prefix="/discharge", tags=["Discharge Templates"])


@router.post("/", response_model=TemplateResponse, status_code=201)
async def create_discharge_template(
    data: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Create a new discharge summary template."""
    template = await crud.create_template(db, TemplateType.DISCHARGE, data, current_user.user_id)
    return template


@router.get("/", response_model=PaginatedResponse[TemplateSummaryResponse])
async def list_discharge_templates(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """List all discharge summary templates."""
    from ..models import TemplateStatus
    status_enum = TemplateStatus(status) if status else None
    skip = (page - 1) * page_size
    templates, total = await crud.get_templates(
        db,
        template_type=TemplateType.DISCHARGE,
        status=status_enum,
        skip=skip,
        limit=page_size,
    )
    return PaginatedResponse.create(items=templates, total=total, page=page, page_size=page_size)


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_discharge_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Get a specific discharge template."""
    template = await crud.get_template(db, template_id)
    return template


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_discharge_template(
    template_id: str,
    data: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Update a discharge template."""
    template = await crud.update_template(db, template_id, data, current_user.user_id)
    return template


@router.delete("/{template_id}", status_code=204)
async def delete_discharge_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Delete a discharge template."""
    await crud.delete_template(db, template_id)


@router.post("/{template_id}/duplicate", response_model=TemplateResponse, status_code=201)
async def duplicate_discharge_template(
    template_id: str,
    name: Optional[str] = Query(None, description="New template name"),
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Duplicate a discharge template."""
    template = await crud.duplicate_template(db, template_id, name, current_user.user_id)
    return template


@router.post("/{template_id}/preview", response_model=TemplatePreviewResponse)
async def preview_discharge_template(
    template_id: str,
    data: TemplatePreviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Preview a discharge template with sample data."""
    template, rendered = await crud.preview_template(db, template_id, data.variables)
    return TemplatePreviewResponse(
        template_id=template.id,
        template_name=template.name,
        rendered_content=rendered,
        variables_used=data.variables,
    )


@router.post("/{template_id}/render", response_model=TemplateRenderResponse)
async def render_discharge_template(
    template_id: str,
    data: TemplateRenderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserContext = Depends(get_current_user),
):
    """Render a discharge template to output format."""
    template, rendered = await crud.render_template_output(
        db, template_id, data.variables, data.output_format
    )
    return TemplateRenderResponse(
        template_id=template.id,
        output_format=data.output_format,
        content=rendered,
    )
