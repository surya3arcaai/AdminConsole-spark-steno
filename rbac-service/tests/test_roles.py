"""
Tests for role management endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_role(client: AsyncClient, auth_headers: dict):
    """Test creating a new role."""
    response = await client.post(
        "/roles",
        json={
            "name": "test_role",
            "description": "A test role",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "test_role"
    assert data["description"] == "A test role"
    assert data["is_system"] is False
    assert "id" in data


@pytest.mark.asyncio
async def test_create_duplicate_role(client: AsyncClient, auth_headers: dict):
    """Test creating a role with duplicate name fails."""
    # Create first role
    await client.post(
        "/roles",
        json={"name": "duplicate_role"},
        headers=auth_headers,
    )

    # Try to create duplicate
    response = await client.post(
        "/roles",
        json={"name": "duplicate_role"},
        headers=auth_headers,
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_list_roles(client: AsyncClient, auth_headers: dict):
    """Test listing roles."""
    # Create some roles
    await client.post(
        "/roles",
        json={"name": "role1"},
        headers=auth_headers,
    )
    await client.post(
        "/roles",
        json={"name": "role2"},
        headers=auth_headers,
    )

    response = await client.get("/roles", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
    assert len(data["items"]) >= 2


@pytest.mark.asyncio
async def test_get_role(client: AsyncClient, auth_headers: dict):
    """Test getting a single role."""
    # Create role
    create_response = await client.post(
        "/roles",
        json={"name": "get_test_role"},
        headers=auth_headers,
    )
    role_id = create_response.json()["id"]

    # Get role
    response = await client.get(f"/roles/{role_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "get_test_role"


@pytest.mark.asyncio
async def test_get_nonexistent_role(client: AsyncClient, auth_headers: dict):
    """Test getting a non-existent role returns 404."""
    response = await client.get(
        "/roles/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_role(client: AsyncClient, auth_headers: dict):
    """Test updating a role."""
    # Create role
    create_response = await client.post(
        "/roles",
        json={"name": "update_test_role"},
        headers=auth_headers,
    )
    role_id = create_response.json()["id"]

    # Update role
    response = await client.put(
        f"/roles/{role_id}",
        json={"description": "Updated description"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Updated description"


@pytest.mark.asyncio
async def test_delete_role(client: AsyncClient, auth_headers: dict):
    """Test deleting a role."""
    # Create role
    create_response = await client.post(
        "/roles",
        json={"name": "delete_test_role"},
        headers=auth_headers,
    )
    role_id = create_response.json()["id"]

    # Delete role
    response = await client.delete(f"/roles/{role_id}", headers=auth_headers)
    assert response.status_code == 204

    # Verify deleted
    get_response = await client.get(f"/roles/{role_id}", headers=auth_headers)
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_create_doctor_role(client: AsyncClient, auth_headers: dict):
    """Test creating the doctor system role."""
    response = await client.post(
        "/roles/doctor",
        json={"description": "Doctor role"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "doctor"
    assert data["is_system"] is True


@pytest.mark.asyncio
async def test_create_admin_role(client: AsyncClient, auth_headers: dict):
    """Test creating the admin system role."""
    response = await client.post(
        "/roles/admin",
        json={"description": "Admin role"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "admin"
    assert data["is_system"] is True


@pytest.mark.asyncio
async def test_create_supervisor_role(client: AsyncClient, auth_headers: dict):
    """Test creating the supervisor system role."""
    response = await client.post(
        "/roles/supervisor",
        json={"description": "Supervisor role"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "supervisor"
    assert data["is_system"] is True


@pytest.mark.asyncio
async def test_assign_and_get_user_roles(client: AsyncClient, auth_headers: dict):
    """Test assigning a role to a user and getting user roles."""
    # Create doctor role
    await client.post(
        "/roles/doctor",
        json={},
        headers=auth_headers,
    )

    # Assign to user
    user_id = "test-user-123"
    response = await client.post(
        f"/users/{user_id}/roles/doctor",
        headers=auth_headers,
    )
    assert response.status_code == 201

    # Get user roles
    response = await client.get(f"/users/{user_id}/roles", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == user_id
    assert len(data["roles"]) == 1
    assert data["roles"][0]["name"] == "doctor"


@pytest.mark.asyncio
async def test_revoke_user_role(client: AsyncClient, auth_headers: dict):
    """Test revoking a role from a user."""
    # Create and assign role
    await client.post("/roles/admin", json={}, headers=auth_headers)
    user_id = "test-user-456"
    await client.post(f"/users/{user_id}/roles/admin", headers=auth_headers)

    # Revoke role
    response = await client.delete(
        f"/users/{user_id}/roles/admin",
        headers=auth_headers,
    )
    assert response.status_code == 204

    # Verify revoked
    roles_response = await client.get(f"/users/{user_id}/roles", headers=auth_headers)
    assert len(roles_response.json()["roles"]) == 0


@pytest.mark.asyncio
async def test_validate_access(client: AsyncClient, auth_headers: dict):
    """Test access validation endpoint."""
    # Create role and assign to user
    await client.post("/roles/doctor", json={}, headers=auth_headers)
    user_id = "test-user-789"
    await client.post(f"/users/{user_id}/roles/doctor", headers=auth_headers)

    # Validate access
    response = await client.post(
        "/validate",
        json={
            "user_id": user_id,
            "required_roles": ["doctor"],
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["has_access"] is True
    assert "doctor" in data["user_roles"]


@pytest.mark.asyncio
async def test_validate_access_denied(client: AsyncClient, auth_headers: dict):
    """Test access validation when user lacks required role."""
    user_id = "test-user-no-roles"

    response = await client.post(
        "/validate",
        json={
            "user_id": user_id,
            "required_roles": ["admin"],
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["has_access"] is False
    assert "admin" in data["missing_roles"]
