"""
CRUD operations for Template Service.
"""

from typing import List, Optional, Tuple
from datetime import datetime
from sqlalchemy import select, func, text, cast, String, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from jinja2 import Template as Jinja2Template, TemplateError

from .models import Template, TemplateVersion, TemplateType, TemplateStatus, UserTemplate
from .schemas import TemplateCreate, TemplateUpdate
from shared.exceptions import NotFoundException, ConflictException, ValidationException


import uuid
import json
import logging

logger = logging.getLogger("arca_spark")


def generate_uuid() -> str:
    return str(uuid.uuid4())


async def seed_default_templates(db: AsyncSession) -> None:
    """Seed default Clinical and Discharge summary templates into PostgreSQL if empty."""
    try:
        clinical_exists = await db.execute(text("SELECT id FROM templates WHERE type::text ILIKE 'clinical' LIMIT 1"))
        if not clinical_exists.scalar_one_or_none():
            t1_id = generate_uuid()
            v1_id = generate_uuid()
            clinical_content = json.dumps([
                "History of presenting complaints",
                "Past Medical/Surgical History",
                "Family History",
                "Lifestyle History",
                "Physical Examination",
                "Investigation Summary",
                "Assessment and Discussion",
                "Management Plan",
                "Prescription"
            ])
            
            inserted = False
            for type_val, status_val in [('CLINICAL', 'ACTIVE'), ('clinical', 'active')]:
                if inserted:
                    break
                try:
                    async with db.begin_nested():
                        await db.execute(
                            text("""
                                INSERT INTO templates (id, type, name, description, content, status, version, created_at, updated_at)
                                VALUES (CAST(:id AS uuid), CAST(:type AS templatetype), :name, :desc, :content, CAST(:status AS templatestatus), :ver, NOW(), NOW())
                            """),
                            {
                                "id": t1_id,
                                "type": type_val,
                                "status": status_val,
                                "name": "Standard Clinical Summary",
                                "desc": "Default template for clinical summary notes",
                                "content": clinical_content,
                                "ver": 1
                            }
                        )
                        inserted = True
                except Exception as ex1:
                    logger.warning(f"Enum insert with type={type_val} failed: {ex1}, trying fallback...")

            if not inserted:
                async with db.begin_nested():
                    await db.execute(
                        text("""
                            INSERT INTO templates (id, type, name, description, content, status, version, created_at, updated_at)
                            VALUES (CAST(:id AS uuid), 'clinical', :name, :desc, :content, 'active', :ver, NOW(), NOW())
                        """),
                        {
                            "id": t1_id,
                            "name": "Standard Clinical Summary",
                            "desc": "Default template for clinical summary notes",
                            "content": clinical_content,
                            "ver": 1
                        }
                    )

            async with db.begin_nested():
                await db.execute(
                    text("""
                        INSERT INTO template_versions (id, template_id, version, content, created_at)
                        VALUES (CAST(:id AS uuid), CAST(:tid AS uuid), :ver, :content, NOW())
                    """),
                    {
                        "id": v1_id,
                        "tid": t1_id,
                        "ver": 1,
                        "content": clinical_content
                    }
                )
            logger.info(f"🌱 Seeded default Clinical Summary template into PostgreSQL: id={t1_id}")

        discharge_exists = await db.execute(text("SELECT id FROM templates WHERE type::text ILIKE 'discharge' LIMIT 1"))
        if not discharge_exists.scalar_one_or_none():
            t2_id = generate_uuid()
            v2_id = generate_uuid()
            discharge_content = json.dumps([
                "Diagnosis",
                "Reason for Admission",
                "History of Present Illness",
                "Past History",
                "Examination",
                "Lab Reports",
                "Course in the Hospital",
                "Recommendations",
                "Follow-Up Plan"
            ])
            
            inserted = False
            for type_val, status_val in [('DISCHARGE', 'ACTIVE'), ('discharge', 'active')]:
                if inserted:
                    break
                try:
                    async with db.begin_nested():
                        await db.execute(
                            text("""
                                INSERT INTO templates (id, type, name, description, content, status, version, created_at, updated_at)
                                VALUES (CAST(:id AS uuid), CAST(:type AS templatetype), :name, :desc, :content, CAST(:status AS templatestatus), :ver, NOW(), NOW())
                            """),
                            {
                                "id": t2_id,
                                "type": type_val,
                                "status": status_val,
                                "name": "Standard Discharge Summary",
                                "desc": "Default template for hospital discharge summaries",
                                "content": discharge_content,
                                "ver": 1
                            }
                        )
                        inserted = True
                except Exception as ex2:
                    logger.warning(f"Enum insert with type={type_val} failed: {ex2}, trying fallback...")

            if not inserted:
                async with db.begin_nested():
                    await db.execute(
                        text("""
                            INSERT INTO templates (id, type, name, description, content, status, version, created_at, updated_at)
                            VALUES (CAST(:id AS uuid), 'discharge', :name, :desc, :content, 'active', :ver, NOW(), NOW())
                        """),
                        {
                            "id": t2_id,
                            "name": "Standard Discharge Summary",
                            "desc": "Default template for hospital discharge summaries",
                            "content": discharge_content,
                            "ver": 1
                        }
                    )

            async with db.begin_nested():
                await db.execute(
                    text("""
                        INSERT INTO template_versions (id, template_id, version, content, created_at)
                        VALUES (CAST(:id AS uuid), CAST(:tid AS uuid), :ver, :content, NOW())
                    """),
                    {
                        "id": v2_id,
                        "tid": t2_id,
                        "ver": 1,
                        "content": discharge_content
                    }
                )
            logger.info(f"🌱 Seeded default Discharge Summary template into PostgreSQL: id={t2_id}")

        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"⚠️ Exception seeding default templates into DB: {e}", exc_info=True)


# ============== Template CRUD ==============

async def create_template(
    db: AsyncSession,
    template_type: TemplateType,
    data: TemplateCreate,
    created_by: Optional[str] = None,
) -> Template:
    """Create a new template."""
    t_id = generate_uuid()
    v_id = generate_uuid()
    type_str = (template_type.value if hasattr(template_type, "value") else str(template_type)).upper()

    sql = """
        INSERT INTO templates (id, type, name, description, content, variables_schema, version, status, created_by, created_at, updated_at)
        VALUES (CAST(:id AS uuid), CAST(:type AS templatetype), :name, :description, :content, CAST(:variables_schema AS json), 1, CAST('ACTIVE' AS templatestatus), :created_by, NOW(), NOW())
    """
    await db.execute(
        text(sql),
        {
            "id": t_id,
            "type": type_str,
            "name": data.name,
            "description": data.description,
            "content": data.content,
            "variables_schema": json.dumps(data.variables_schema or {}),
            "created_by": created_by or "admin"
        }
    )

    await db.execute(
        text("""
            INSERT INTO template_versions (id, template_id, version, content, variables_schema, created_by, created_at)
            VALUES (CAST(:id AS uuid), CAST(:tid AS uuid), 1, :content, CAST(:variables_schema AS json), :created_by, NOW())
        """),
        {
            "id": v_id,
            "tid": t_id,
            "content": data.content,
            "variables_schema": json.dumps(data.variables_schema or {}),
            "created_by": created_by or "admin"
        }
    )
    await db.flush()
    return await get_template(db, t_id)


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
        type_str = (template_type.value if hasattr(template_type, "value") else str(template_type)).lower()
        query = query.where(func.lower(cast(Template.type, String)) == type_str)
        count_query = count_query.where(func.lower(cast(Template.type, String)) == type_str)

    if status:
        status_str = (status.value if hasattr(status, "value") else str(status)).lower()
        query = query.where(func.lower(cast(Template.status, String)) == status_str)
        count_query = count_query.where(func.lower(cast(Template.status, String)) == status_str)

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
    content_changed = data.content is not None and data.content != template.content

    update_data = data.model_dump(exclude_unset=True)
    
    if "name" in update_data:
        await db.execute(text("UPDATE templates SET name = :val, updated_at = NOW() WHERE id = CAST(:id AS uuid)"), {"val": update_data["name"], "id": template_id})
    if "description" in update_data:
        await db.execute(text("UPDATE templates SET description = :val, updated_at = NOW() WHERE id = CAST(:id AS uuid)"), {"val": update_data["description"], "id": template_id})
    if "content" in update_data:
        await db.execute(text("UPDATE templates SET content = :val, updated_at = NOW() WHERE id = CAST(:id AS uuid)"), {"val": update_data["content"], "id": template_id})
    if "variables_schema" in update_data:
        await db.execute(text("UPDATE templates SET variables_schema = CAST(:val AS json), updated_at = NOW() WHERE id = CAST(:id AS uuid)"), {"val": json.dumps(update_data["variables_schema"]), "id": template_id})
    if "status" in update_data:
        status_val = update_data["status"].value if hasattr(update_data["status"], "value") else str(update_data["status"])
        try:
            await db.execute(text("UPDATE templates SET status = CAST(:val AS templatestatus), updated_at = NOW() WHERE id = CAST(:id AS uuid)"), {"val": status_val, "id": template_id})
        except Exception:
            await db.execute(text("UPDATE templates SET status = :val, updated_at = NOW() WHERE id = CAST(:id AS uuid)"), {"val": status_val, "id": template_id})

    if content_changed:
        new_ver = template.version + 1
        await db.execute(text("UPDATE templates SET version = :ver WHERE id = CAST(:id AS uuid)"), {"ver": new_ver, "id": template_id})
        v_id = generate_uuid()
        await db.execute(
            text("""
                INSERT INTO template_versions (id, template_id, version, content, variables_schema, created_by, created_at)
                VALUES (CAST(:id AS uuid), CAST(:tid AS uuid), :ver, :content, CAST(:variables_schema AS json), :created_by, NOW())
            """),
            {
                "id": v_id,
                "tid": template_id,
                "ver": new_ver,
                "content": update_data.get("content", template.content),
                "variables_schema": json.dumps(update_data.get("variables_schema", template.variables_schema or {})),
                "created_by": updated_by or "admin"
            }
        )

    await db.flush()
    return await get_template(db, template_id)


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


# ============== User Template Assignments ==============

async def assign_user_templates(db: AsyncSession, user_id: str, template_ids: List[str]) -> List[UserTemplate]:
    """Assign template IDs to a user (replaces existing assignments)."""
    await db.execute(delete(UserTemplate).where(UserTemplate.user_id == user_id))
    await db.flush()

    new_assignments = []
    for tid in template_ids:
        ut = UserTemplate(
            id=generate_uuid(),
            user_id=user_id,
            template_id=tid
        )
        db.add(ut)
        new_assignments.append(ut)

    await db.flush()
    await db.commit()
    return new_assignments


async def get_user_templates(db: AsyncSession, user_id: str) -> List[Template]:
    """Get assigned templates for a user."""
    result = await db.execute(
        select(Template)
        .join(UserTemplate, UserTemplate.template_id == Template.id)
        .where(UserTemplate.user_id == user_id)
    )
    return list(result.scalars().all())
