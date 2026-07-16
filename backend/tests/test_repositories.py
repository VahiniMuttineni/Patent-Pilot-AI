import pytest
from app.repositories.user_repository import UserRepository

@pytest.mark.asyncio
async def test_user_repository_create_and_get(db_session):
    repo = UserRepository(db_session)
    user_data = {"email": "repo@example.com", "hashed_password": "fakehash"}
    
    # Test Create
    user = await repo.create(user_data)
    assert user.id is not None
    assert user.email == "repo@example.com"
    
    # Test Get by ID
    fetched_user = await repo.get_by_id(user.id)
    assert fetched_user is not None
    assert fetched_user.email == "repo@example.com"
    
    # Test Get by Email
    fetched_user_email = await repo.get_by_email("repo@example.com")
    assert fetched_user_email is not None
    assert fetched_user_email.id == user.id

@pytest.mark.asyncio
async def test_user_repository_update(db_session):
    repo = UserRepository(db_session)
    user = await repo.create({"email": "update@example.com", "hashed_password": "123"})
    
    # Test Update
    updated_user = await repo.update(user, {"email": "new@example.com"})
    assert updated_user.email == "new@example.com"
    
    # Verify in DB
    fetched = await repo.get_by_id(user.id)
    assert fetched.email == "new@example.com"

@pytest.mark.asyncio
async def test_user_repository_delete(db_session):
    repo = UserRepository(db_session)
    user = await repo.create({"email": "delete@example.com", "hashed_password": "123"})
    
    # Test Delete
    success = await repo.delete(user.id)
    assert success is True
    
    fetched = await repo.get_by_id(user.id)
    assert fetched is None

@pytest.mark.asyncio
async def test_repository_exists_and_count(db_session):
    repo = UserRepository(db_session)
    await repo.create({"email": "count1@example.com", "hashed_password": "123"})
    await repo.create({"email": "count2@example.com", "hashed_password": "123"})
    
    # Test Count
    count = await repo.count()
    assert count >= 2
    
    # Test Exists
    exists = await repo.exists(email="count1@example.com")
    assert exists is True
    
    not_exists = await repo.exists(email="missing@example.com")
    assert not_exists is False

@pytest.mark.asyncio
async def test_repository_paginate(db_session):
    repo = UserRepository(db_session)
    await repo.create({"email": "page1@example.com", "hashed_password": "123"})
    await repo.create({"email": "page2@example.com", "hashed_password": "123"})
    await repo.create({"email": "page3@example.com", "hashed_password": "123"})
    
    # Test Paginate
    result = await repo.paginate(page=1, page_size=2)
    assert result["total"] >= 3
    assert len(result["items"]) == 2
    assert result["page"] == 1
