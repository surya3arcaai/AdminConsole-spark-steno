"""
Tests for user management endpoints.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_user(client: AsyncClient, auth_headers: dict):
    """Test creating a new user."""
    response = await client.post(
        "/",
        json={
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "1234567890",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "John Doe"
    assert data["email"] == "john@example.com"
    assert data["status"] == "pending"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_duplicate_user(client: AsyncClient, auth_headers: dict):
    """Test creating a user with duplicate email fails."""
    await client.post(
        "/",
        json={"name": "User 1", "email": "duplicate@example.com"},
        headers=auth_headers,
    )

    response = await client.post(
        "/",
        json={"name": "User 2", "email": "duplicate@example.com"},
        headers=auth_headers,
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_list_users(client: AsyncClient, auth_headers: dict):
    """Test listing users."""
    await client.post("/", json={"name": "User A", "email": "a@example.com"}, headers=auth_headers)
    await client.post("/", json={"name": "User B", "email": "b@example.com"}, headers=auth_headers)

    response = await client.get("/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2


@pytest.mark.asyncio
async def test_get_user(client: AsyncClient, auth_headers: dict):
    """Test getting a user by ID."""
    create_response = await client.post(
        "/",
        json={"name": "Get Test", "email": "get@example.com"},
        headers=auth_headers,
    )
    user_id = create_response.json()["id"]

    response = await client.get(f"/{user_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Get Test"


@pytest.mark.asyncio
async def test_update_user(client: AsyncClient, auth_headers: dict):
    """Test updating a user."""
    create_response = await client.post(
        "/",
        json={"name": "Update Test", "email": "update@example.com"},
        headers=auth_headers,
    )
    user_id = create_response.json()["id"]

    response = await client.put(
        f"/{user_id}",
        json={"name": "Updated Name"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_delete_user(client: AsyncClient, auth_headers: dict):
    """Test deleting a user."""
    create_response = await client.post(
        "/",
        json={"name": "Delete Test", "email": "delete@example.com"},
        headers=auth_headers,
    )
    user_id = create_response.json()["id"]

    response = await client.delete(f"/{user_id}", headers=auth_headers)
    assert response.status_code == 204

    get_response = await client.get(f"/{user_id}", headers=auth_headers)
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_search_users(client: AsyncClient, auth_headers: dict):
    """Test searching users."""
    await client.post("/", json={"name": "Alice Smith", "email": "alice@example.com"}, headers=auth_headers)
    await client.post("/", json={"name": "Bob Jones", "email": "bob@example.com"}, headers=auth_headers)

    response = await client.get("/search", params={"query": "Alice"}, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert any("Alice" in item["name"] for item in data["items"])


@pytest.mark.asyncio
async def test_generate_eid(client: AsyncClient, auth_headers: dict):
    """Test EID generation."""
    response = await client.post("/eid/generate", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "eid" in data
    assert data["eid"].startswith("EMP")


@pytest.mark.asyncio
async def test_assign_eid(client: AsyncClient, auth_headers: dict):
    """Test assigning EID to user."""
    create_response = await client.post(
        "/",
        json={"name": "EID Test", "email": "eid@example.com"},
        headers=auth_headers,
    )
    user_id = create_response.json()["id"]

    response = await client.put(f"/{user_id}/eid", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["eid"] is not None


@pytest.mark.asyncio
async def test_set_registration(client: AsyncClient, auth_headers: dict):
    """Test setting registration number."""
    create_response = await client.post(
        "/",
        json={"name": "Reg Test", "email": "reg@example.com"},
        headers=auth_headers,
    )
    user_id = create_response.json()["id"]

    response = await client.post(
        f"/{user_id}/registration",
        json={
            "registration_number": "MED12345",
            "council_name": "Medical Council",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["registration_number"] == "MED12345"


@pytest.mark.asyncio
async def test_verify_registration(client: AsyncClient, auth_headers: dict):
    """Test verifying registration."""
    create_response = await client.post(
        "/",
        json={"name": "Verify Test", "email": "verify@example.com"},
        headers=auth_headers,
    )
    user_id = create_response.json()["id"]

    await client.post(
        f"/{user_id}/registration",
        json={"registration_number": "VER12345", "council_name": "Council"},
        headers=auth_headers,
    )

    response = await client.post(f"/{user_id}/registration/verify", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["verified"] is True


@pytest.mark.asyncio
async def test_assign_supervisor(client: AsyncClient, auth_headers: dict):
    """Test assigning a supervisor."""
    user_response = await client.post(
        "/",
        json={"name": "Employee", "email": "employee@example.com"},
        headers=auth_headers,
    )
    supervisor_response = await client.post(
        "/",
        json={"name": "Supervisor", "email": "supervisor@example.com"},
        headers=auth_headers,
    )
    user_id = user_response.json()["id"]
    supervisor_id = supervisor_response.json()["id"]

    response = await client.post(
        f"/{user_id}/supervisor",
        json={"supervisor_id": supervisor_id},
        headers=auth_headers,
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_get_reportees(client: AsyncClient, auth_headers: dict):
    """Test getting reportees for a supervisor."""
    supervisor_response = await client.post(
        "/",
        json={"name": "Boss", "email": "boss@example.com"},
        headers=auth_headers,
    )
    supervisor_id = supervisor_response.json()["id"]

    for i in range(3):
        user_response = await client.post(
            "/",
            json={"name": f"Team Member {i}", "email": f"team{i}@example.com"},
            headers=auth_headers,
        )
        await client.post(
            f"/{user_response.json()['id']}/supervisor",
            json={"supervisor_id": supervisor_id},
            headers=auth_headers,
        )

    response = await client.get(f"/{supervisor_id}/reportees", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["total"] == 3


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
