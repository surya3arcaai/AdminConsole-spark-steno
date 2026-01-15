"""Tests for template management endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_clinical_template(client: AsyncClient, auth_headers: dict):
    """Test creating a clinical template."""
    response = await client.post(
        "/clinical/",
        json={
            "name": "Basic Clinical Summary",
            "description": "A basic clinical summary template",
            "content": "<h1>Clinical Summary for {{ patient_name }}</h1><p>Date: {{ date }}</p>",
            "variables_schema": {"patient_name": "string", "date": "string"},
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Basic Clinical Summary"
    assert data["type"] == "clinical"
    assert data["version"] == 1


@pytest.mark.asyncio
async def test_create_discharge_template(client: AsyncClient, auth_headers: dict):
    """Test creating a discharge template."""
    response = await client.post(
        "/discharge/",
        json={
            "name": "Standard Discharge",
            "content": "<h1>Discharge Summary</h1><p>Patient: {{ patient_name }}</p>",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["type"] == "discharge"


@pytest.mark.asyncio
async def test_list_clinical_templates(client: AsyncClient, auth_headers: dict):
    """Test listing clinical templates."""
    await client.post(
        "/clinical/",
        json={"name": "Template 1", "content": "Content 1"},
        headers=auth_headers,
    )
    await client.post(
        "/clinical/",
        json={"name": "Template 2", "content": "Content 2"},
        headers=auth_headers,
    )

    response = await client.get("/clinical/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2


@pytest.mark.asyncio
async def test_get_template(client: AsyncClient, auth_headers: dict):
    """Test getting a template by ID."""
    create_response = await client.post(
        "/clinical/",
        json={"name": "Get Test", "content": "Test content"},
        headers=auth_headers,
    )
    template_id = create_response.json()["id"]

    response = await client.get(f"/clinical/{template_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Get Test"


@pytest.mark.asyncio
async def test_update_template(client: AsyncClient, auth_headers: dict):
    """Test updating a template."""
    create_response = await client.post(
        "/clinical/",
        json={"name": "Update Test", "content": "Original content"},
        headers=auth_headers,
    )
    template_id = create_response.json()["id"]

    response = await client.put(
        f"/clinical/{template_id}",
        json={"content": "Updated content"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["version"] == 2  # Version incremented


@pytest.mark.asyncio
async def test_delete_template(client: AsyncClient, auth_headers: dict):
    """Test deleting a template."""
    create_response = await client.post(
        "/clinical/",
        json={"name": "Delete Test", "content": "Content"},
        headers=auth_headers,
    )
    template_id = create_response.json()["id"]

    response = await client.delete(f"/clinical/{template_id}", headers=auth_headers)
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_duplicate_template(client: AsyncClient, auth_headers: dict):
    """Test duplicating a template."""
    create_response = await client.post(
        "/clinical/",
        json={"name": "Original", "content": "Content"},
        headers=auth_headers,
    )
    template_id = create_response.json()["id"]

    response = await client.post(
        f"/clinical/{template_id}/duplicate",
        params={"name": "Copy of Original"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Copy of Original"


@pytest.mark.asyncio
async def test_preview_template(client: AsyncClient, auth_headers: dict):
    """Test previewing a template with variables."""
    create_response = await client.post(
        "/clinical/",
        json={
            "name": "Preview Test",
            "content": "Hello {{ name }}!",
        },
        headers=auth_headers,
    )
    template_id = create_response.json()["id"]

    response = await client.post(
        f"/clinical/{template_id}/preview",
        json={"variables": {"name": "John"}},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert "Hello John!" in response.json()["rendered_content"]


@pytest.mark.asyncio
async def test_render_template(client: AsyncClient, auth_headers: dict):
    """Test rendering a template."""
    create_response = await client.post(
        "/discharge/",
        json={"name": "Render Test", "content": "<p>{{ message }}</p>"},
        headers=auth_headers,
    )
    template_id = create_response.json()["id"]

    response = await client.post(
        f"/discharge/{template_id}/render",
        json={"variables": {"message": "Goodbye"}, "output_format": "html"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert "<p>Goodbye</p>" in response.json()["content"]


@pytest.mark.asyncio
async def test_get_template_versions(client: AsyncClient, auth_headers: dict):
    """Test getting template version history."""
    create_response = await client.post(
        "/clinical/",
        json={"name": "Version Test", "content": "v1"},
        headers=auth_headers,
    )
    template_id = create_response.json()["id"]

    # Update to create new versions
    await client.put(f"/clinical/{template_id}", json={"content": "v2"}, headers=auth_headers)
    await client.put(f"/clinical/{template_id}", json={"content": "v3"}, headers=auth_headers)

    response = await client.get(f"/{template_id}/versions", headers=auth_headers)
    assert response.status_code == 200
    versions = response.json()
    assert len(versions) == 3


@pytest.mark.asyncio
async def test_export_import_template(client: AsyncClient, auth_headers: dict):
    """Test exporting and importing a template."""
    create_response = await client.post(
        "/clinical/",
        json={"name": "Export Test", "content": "Export content"},
        headers=auth_headers,
    )
    template_id = create_response.json()["id"]

    # Export
    export_response = await client.get(f"/{template_id}/export", headers=auth_headers)
    assert export_response.status_code == 200
    exported = export_response.json()

    # Import
    import_response = await client.post(
        "/import",
        json={
            "type": "clinical",
            "name": "Imported Template",
            "content": exported["content"],
            "variables_schema": exported["variables_schema"],
        },
        headers=auth_headers,
    )
    assert import_response.status_code == 201
    assert import_response.json()["name"] == "Imported Template"


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
