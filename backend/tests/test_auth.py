import pytest
from httpx import AsyncClient
from unittest.mock import patch

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "password123"}
    )
    assert response.status_code == 201
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    assert data["email"] == "test@example.com"
    assert "id" in data
    assert "password" not in data
    assert "hashed_password" not in data

@pytest.mark.asyncio
async def test_register_duplicate_user(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "password123"}
    )
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "password123"}
    )
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_login_user(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "login@example.com", "password": "password123"}
    )
    
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "login@example.com", "password": "password123"}
    )
    
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "me@example.com", "password": "password123"}
    )
    login_response = await client.post(
        "/api/v1/auth/login",
        data={"username": "me@example.com", "password": "password123"}
    )
    token = login_response.json()["data"]["access_token"]
    
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["data"]["email"] == "me@example.com"


@pytest.mark.asyncio
@patch("app.services.auth_service.id_token.verify_oauth2_token")
@patch("app.services.auth_service.settings")
async def test_google_login_new_user(mock_settings, mock_verify, client: AsyncClient):
    mock_settings.GOOGLE_CLIENT_ID = "test-client-id"
    mock_verify.return_value = {
        "email": "googleuser@example.com",
        "sub": "google-12345"
    }

    response = await client.post(
        "/api/v1/auth/google",
        json={"token": "mock.google.token"}
    )
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    assert "access_token" in data
    assert "refresh_token" in data

    # Verify user was created by trying to get current user
    token = data["access_token"]
    me_response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_response.status_code == 200
    assert me_response.json()["data"]["email"] == "googleuser@example.com"


@pytest.mark.asyncio
@patch("app.services.auth_service.id_token.verify_oauth2_token")
@patch("app.services.auth_service.settings")
async def test_google_login_existing_user(mock_settings, mock_verify, client: AsyncClient):
    mock_settings.GOOGLE_CLIENT_ID = "test-client-id"
    
    # Register a user normally first
    await client.post(
        "/api/v1/auth/register",
        json={"email": "existing@example.com", "password": "password123"}
    )
    
    # Now simulate Google login with same email
    mock_verify.return_value = {
        "email": "existing@example.com",
        "sub": "google-67890"
    }

    response = await client.post(
        "/api/v1/auth/google",
        json={"token": "mock.google.token"}
    )
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    assert "access_token" in data
