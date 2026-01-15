"""Tests for logs service endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_get_system_health(client: AsyncClient, auth_headers: dict):
    """Test system health endpoint."""
    response = await client.get("/monitoring/health", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert len(data["services"]) > 0


@pytest.mark.asyncio
async def test_get_metrics(client: AsyncClient, auth_headers: dict):
    """Test metrics endpoint."""
    response = await client.get("/monitoring/metrics", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "cpu_usage" in data
    assert "memory_usage" in data


@pytest.mark.asyncio
async def test_create_alert(client: AsyncClient, auth_headers: dict):
    """Test creating an alert."""
    response = await client.post(
        "/monitoring/alerts",
        json={
            "type": "system",
            "severity": "high",
            "source": "test-service",
            "message": "Test alert message",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["type"] == "system"
    assert data["acknowledged"] is False


@pytest.mark.asyncio
async def test_acknowledge_alert(client: AsyncClient, auth_headers: dict):
    """Test acknowledging an alert."""
    # Create alert
    create_response = await client.post(
        "/monitoring/alerts",
        json={
            "type": "test",
            "severity": "low",
            "source": "test",
            "message": "Test",
        },
        headers=auth_headers,
    )
    alert_id = create_response.json()["id"]

    # Acknowledge
    response = await client.post(
        f"/monitoring/alerts/{alert_id}/ack",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["acknowledged"] is True


@pytest.mark.asyncio
async def test_create_api_log(client: AsyncClient, auth_headers: dict):
    """Test creating an API log."""
    response = await client.post(
        "/integration/apis",
        json={
            "service": "test-service",
            "endpoint": "/api/v1/test",
            "method": "GET",
            "status_code": 200,
            "latency_ms": 45.5,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["service"] == "test-service"


@pytest.mark.asyncio
async def test_get_api_stats(client: AsyncClient, auth_headers: dict):
    """Test getting API stats."""
    response = await client.get(
        "/integration/apis/stats",
        params={"hours": 24},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_requests" in data
    assert "success_rate" in data


@pytest.mark.asyncio
async def test_create_container_log(client: AsyncClient, auth_headers: dict):
    """Test creating a container log."""
    response = await client.post(
        "/integration/containers",
        json={
            "container_id": "abc123",
            "container_name": "test-container",
            "log_level": "info",
            "message": "Container started",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_create_db_log(client: AsyncClient, auth_headers: dict):
    """Test creating a database log."""
    response = await client.post(
        "/integration/databases",
        json={
            "database_name": "test_db",
            "query": "SELECT * FROM users",
            "execution_time_ms": 25.5,
            "rows_affected": 10,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["is_slow_query"] is False


@pytest.mark.asyncio
async def test_create_slow_query_log(client: AsyncClient, auth_headers: dict):
    """Test that slow queries are flagged."""
    response = await client.post(
        "/integration/databases",
        json={
            "database_name": "test_db",
            "query": "SELECT * FROM large_table",
            "execution_time_ms": 1500.0,  # > 1000ms
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["is_slow_query"] is True


@pytest.mark.asyncio
async def test_create_transcript(client: AsyncClient, auth_headers: dict):
    """Test creating a transcript."""
    response = await client.post(
        "/transcripts/",
        json={
            "user_id": "user-123",
            "session_id": "session-456",
            "content": "This is a test transcript content.",
            "duration_seconds": 120,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["user_id"] == "user-123"


@pytest.mark.asyncio
async def test_search_transcripts(client: AsyncClient, auth_headers: dict):
    """Test searching transcripts."""
    # Create a transcript
    await client.post(
        "/transcripts/",
        json={
            "user_id": "user-999",
            "session_id": "session-999",
            "content": "Patient complained about headache and fever.",
        },
        headers=auth_headers,
    )

    # Search
    response = await client.get(
        "/transcripts/search",
        params={"query": "headache"},
        headers=auth_headers,
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_create_export_job(client: AsyncClient, auth_headers: dict):
    """Test creating an export job."""
    response = await client.post(
        "/export/",
        json={
            "type": "api_logs",
            "format": "csv",
            "filters": {},
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["status"] == "pending"


@pytest.mark.asyncio
async def test_get_export_formats(client: AsyncClient, auth_headers: dict):
    """Test getting export formats."""
    response = await client.get("/export/formats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "csv" in data["formats"]
    assert "api_logs" in data["types"]


@pytest.mark.asyncio
async def test_get_dashboard_data(client: AsyncClient, auth_headers: dict):
    """Test getting dashboard data."""
    response = await client.get("/graphs/dashboard", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_requests" in data
    assert "error_rate" in data


@pytest.mark.asyncio
async def test_get_graph_data(client: AsyncClient, auth_headers: dict):
    """Test getting graph data."""
    response = await client.get(
        "/graphs/requests",
        params={"hours": 24},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["metric"] == "requests"
    assert "data" in data


@pytest.mark.asyncio
async def test_get_aggregations(client: AsyncClient, auth_headers: dict):
    """Test getting aggregations."""
    response = await client.get(
        "/graphs/aggregations",
        params={"period": "day"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0


@pytest.mark.asyncio
async def test_create_custom_graph(client: AsyncClient, auth_headers: dict):
    """Test creating a custom graph config."""
    response = await client.post(
        "/graphs/custom",
        json={
            "name": "Custom Requests Graph",
            "type": "line",
            "config": {"metric": "requests_per_minute", "interval": "5m"},
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Custom Requests Graph"
