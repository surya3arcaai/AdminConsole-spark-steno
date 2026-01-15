"""
Tests for permission management endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_permission(client: AsyncClient, auth_headers: dict):
    """Test creating a new permission."""
    response = await client.post(
        "/permissions/",
        json={
            "name": "users.create",
            "module": "users",
            "action": "create",
            "description": "Permission to create users",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "users.create"
    assert data["module"] == "users"
    assert data["action"] == "create"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_duplicate_permission(client: AsyncClient, auth_headers: dict):
    """Test creating a permission with duplicate name fails."""
    # Create first permission
    await client.post(
        "/permissions/",
        json={
            "name": "duplicate.perm",
            "module": "test",
            "action": "read",
        },
        headers=auth_headers,
    )

    # Try to create duplicate
    response = await client.post(
        "/permissions/",
        json={
            "name": "duplicate.perm",
            "module": "other",
            "action": "write",
        },
        headers=auth_headers,
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_create_duplicate_module_action(client: AsyncClient, auth_headers: dict):
    """Test creating a permission with duplicate module+action fails."""
    # Create first permission
    await client.post(
        "/permissions/",
        json={
            "name": "test.read1",
            "module": "test_module",
            "action": "read",
        },
        headers=auth_headers,
    )

    # Try to create duplicate module+action
    response = await client.post(
        "/permissions/",
        json={
            "name": "test.read2",
            "module": "test_module",
            "action": "read",
        },
        headers=auth_headers,
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_list_permissions(client: AsyncClient, auth_headers: dict):
    """Test listing permissions."""
    # Create some permissions
    await client.post(
        "/permissions/",
        json={"name": "perm1", "module": "mod1", "action": "read"},
        headers=auth_headers,
    )
    await client.post(
        "/permissions/",
        json={"name": "perm2", "module": "mod1", "action": "write"},
        headers=auth_headers,
    )

    response = await client.get("/permissions/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
    assert len(data["items"]) >= 2


@pytest.mark.asyncio
async def test_list_permissions_filter_by_module(client: AsyncClient, auth_headers: dict):
    """Test filtering permissions by module."""
    # Create permissions in different modules
    await client.post(
        "/permissions/",
        json={"name": "filter.test1", "module": "filter_module", "action": "read"},
        headers=auth_headers,
    )
    await client.post(
        "/permissions/",
        json={"name": "other.perm", "module": "other_module", "action": "read"},
        headers=auth_headers,
    )

    response = await client.get(
        "/permissions/",
        params={"module": "filter_module"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["module"] == "filter_module"


@pytest.mark.asyncio
async def test_get_permission(client: AsyncClient, auth_headers: dict):
    """Test getting a single permission."""
    # Create permission
    create_response = await client.post(
        "/permissions/",
        json={"name": "get.test", "module": "test", "action": "get"},
        headers=auth_headers,
    )
    perm_id = create_response.json()["id"]

    # Get permission
    response = await client.get(f"/permissions/{perm_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "get.test"


@pytest.mark.asyncio
async def test_get_nonexistent_permission(client: AsyncClient, auth_headers: dict):
    """Test getting a non-existent permission returns 404."""
    response = await client.get(
        "/permissions/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_permission(client: AsyncClient, auth_headers: dict):
    """Test updating a permission."""
    # Create permission
    create_response = await client.post(
        "/permissions/",
        json={"name": "update.test", "module": "test", "action": "update"},
        headers=auth_headers,
    )
    perm_id = create_response.json()["id"]

    # Update permission
    response = await client.put(
        f"/permissions/{perm_id}",
        json={"description": "Updated description"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Updated description"


@pytest.mark.asyncio
async def test_delete_permission(client: AsyncClient, auth_headers: dict):
    """Test deleting a permission."""
    # Create permission
    create_response = await client.post(
        "/permissions/",
        json={"name": "delete.test", "module": "test", "action": "delete"},
        headers=auth_headers,
    )
    perm_id = create_response.json()["id"]

    # Delete permission
    response = await client.delete(f"/permissions/{perm_id}", headers=auth_headers)
    assert response.status_code == 204

    # Verify deleted
    get_response = await client.get(f"/permissions/{perm_id}", headers=auth_headers)
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_assign_permissions_to_role(client: AsyncClient, auth_headers: dict):
    """Test assigning permissions to a role."""
    # Create permissions
    perm1_response = await client.post(
        "/permissions/",
        json={"name": "role.perm1", "module": "role", "action": "read"},
        headers=auth_headers,
    )
    perm2_response = await client.post(
        "/permissions/",
        json={"name": "role.perm2", "module": "role", "action": "write"},
        headers=auth_headers,
    )
    perm1_id = perm1_response.json()["id"]
    perm2_id = perm2_response.json()["id"]

    # Create role
    role_response = await client.post(
        "/roles",
        json={"name": "permission_test_role"},
        headers=auth_headers,
    )
    role_id = role_response.json()["id"]

    # Assign permissions
    response = await client.put(
        f"/roles/{role_id}/permissions",
        json={"permission_ids": [perm1_id, perm2_id]},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["permissions"]) == 2


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "rbac-service"
