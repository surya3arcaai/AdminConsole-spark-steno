"""
CRUD operations for Template Service.
"""

from typing import List, Optional, Tuple
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from jinja2 import Template as Jinja2Template, TemplateError

from .models import Template, TemplateVersion, TemplateType, TemplateStatus
from .schemas import TemplateCreate, TemplateUpdate
from shared.exceptions import NotFoundException, ConflictException, ValidationException


# ============== Template CRUD ==============

async def create_template(
    db: AsyncSession,
    template_type: TemplateType,
    data: TemplateCreate,
    created_by: Optional[str] = None,
) -> Template:
    """Create a new template."""
    template = Template(
        type=template_type,
        name=data.name,
        description=data.description,
        content=data.content,
        variables_schema=data.variables_schema,
        created_by=created_by,
    )
    db.add(template)
    await db.flush()

    # Create initial version
    version = TemplateVersion(
        template_id=template.id,
        version=1,
        content=data.content,
        variables_schema=data.variables_schema,
        created_by=created_by,
    )
    db.add(version)
    await db.flush()
    await db.refresh(template)
    return template


async def get_template(db: AsyncSession, template_id: str) -> Template:
    """Get a template by ID."""
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise NotFoundException("Template", template_id)
    return template


async def get_templates(
    db: AsyncSession,
    template_type: Optional[TemplateType] = None,
    status: Optional[TemplateStatus] = None,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[Template], int]:
    """Get templates with optional filtering."""
    query = select(Template)
    count_query = select(func.count(Template.id))

    if template_type:
        query = query.where(Template.type == template_type)
        count_query = count_query.where(Template.type == template_type)

    if status:
        query = query.where(Template.status == status)
        count_query = count_query.where(Template.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    result = await db.execute(query.offset(skip).limit(limit).order_by(Template.name))
    templates = result.scalars().all()

    return list(templates), total


async def update_template(
    db: AsyncSession,
    template_id: str,
    data: TemplateUpdate,
    updated_by: Optional[str] = None,
) -> Template:
    """Update a template and create a new version if content changes."""
    template = await get_template(db, template_id)

    # Check if content is changing
    content_changed = data.content is not None and data.content != template.content

    update_data = data.model_dump(exclude_unset=True)
    if "status" in update_data:
        update_data["status"] = TemplateStatus(update_data["status"])

    for field, value in update_data.items():
        setattr(template, field, value)

    # Create new version if content changed
    if content_changed:
        template.version += 1
        version = TemplateVersion(
            template_id=template.id,
            version=template.version,
            content=template.content,
            variables_schema=template.variables_schema,
            created_by=updated_by,
        )
        db.add(version)

    await db.flush()
    await db.refresh(template)
    return template


async def delete_template(db: AsyncSession, template_id: str) -> None:
    """Delete a template."""
    template = await get_template(db, template_id)
    await db.delete(template)
    await db.flush()


async def duplicate_template(
    db: AsyncSession,
    template_id: str,
    new_name: Optional[str] = None,
    created_by: Optional[str] = None,
) -> Template:
    """Duplicate an existing template."""
    original = await get_template(db, template_id)

    name = new_name or f"{original.name} (Copy)"
    template = Template(
        type=original.type,
        name=name,
        description=original.description,
        content=original.content,
        variables_schema=original.variables_schema,
        status=TemplateStatus.DRAFT,
        created_by=created_by,
    )
    db.add(template)
    await db.flush()

    version = TemplateVersion(
        template_id=template.id,
        version=1,
        content=template.content,
        variables_schema=template.variables_schema,
        created_by=created_by,
    )
    db.add(version)
    await db.flush()
    await db.refresh(template)
    return template


# ============== Version Management ==============

async def get_template_versions(
    db: AsyncSession,
    template_id: str,
) -> List[TemplateVersion]:
    """Get all versions of a template."""
    await get_template(db, template_id)  # Verify template exists

    result = await db.execute(
        select(TemplateVersion)
        .where(TemplateVersion.template_id == template_id)
        .order_by(TemplateVersion.version.desc())
    )
    return list(result.scalars().all())


async def restore_version(
    db: AsyncSession,
    template_id: str,
    version_id: str,
    restored_by: Optional[str] = None,
) -> Template:
    """Restore a template to a specific version."""
    template = await get_template(db, template_id)

    result = await db.execute(
        select(TemplateVersion).where(
            TemplateVersion.id == version_id,
            TemplateVersion.template_id == template_id,
        )
    )
    version = result.scalar_one_or_none()
    if not version:
        raise NotFoundException("Template version", version_id)

    # Update template with version content
    template.content = version.content
    template.variables_schema = version.variables_schema
    template.version += 1

    # Create new version for the restore
    new_version = TemplateVersion(
        template_id=template.id,
        version=template.version,
        content=template.content,
        variables_schema=template.variables_schema,
        created_by=restored_by,
    )
    db.add(new_version)
    await db.flush()
    await db.refresh(template)
    return template


# ============== Render/Preview ==============

def render_template(content: str, variables: dict) -> str:
    """Render a Jinja2 template with variables."""
    try:
        jinja_template = Jinja2Template(content)
        return jinja_template.render(**variables)
    except TemplateError as e:
        raise ValidationException(f"Template rendering error: {str(e)}")


async def preview_template(
    db: AsyncSession,
    template_id: str,
    variables: dict,
) -> Tuple[Template, str]:
    """Preview a template with sample data."""
    template = await get_template(db, template_id)
    rendered = render_template(template.content, variables)
    return template, rendered


async def render_template_output(
    db: AsyncSession,
    template_id: str,
    variables: dict,
    output_format: str = "html",
) -> Tuple[Template, str]:
    """Render a template to the specified output format."""
    template = await get_template(db, template_id)
    rendered = render_template(template.content, variables)

    # For now, we return HTML/text. PDF generation would require additional libraries
    if output_format == "pdf":
        raise ValidationException("PDF generation not implemented yet")

    return template, rendered


# ============== Import/Export ==============

async def export_template(db: AsyncSession, template_id: str) -> dict:
    """Export a template as a dictionary."""
    template = await get_template(db, template_id)
    return {
        "id": template.id,
        "type": template.type.value,
        "name": template.name,
        "description": template.description,
        "content": template.content,
        "variables_schema": template.variables_schema,
        "version": template.version,
        "exported_at": datetime.utcnow(),
    }


async def import_template(
    db: AsyncSession,
    template_type: str,
    name: str,
    content: str,
    description: Optional[str] = None,
    variables_schema: dict = None,
    created_by: Optional[str] = None,
) -> Template:
    """Import a template."""
    type_enum = TemplateType(template_type)
    data = TemplateCreate(
        name=name,
        description=description,
        content=content,
        variables_schema=variables_schema or {},
    )
    return await create_template(db, type_enum, data, created_by)
