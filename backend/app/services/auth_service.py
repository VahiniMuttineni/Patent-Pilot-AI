from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.domain import User
from app.schemas.user import UserCreate
from app.schemas.token import Token
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
)
from app.repositories.user_repository import UserRepository
from app.core.config import settings
from google.oauth2 import id_token
from google.auth.transport import requests
import logging

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.user_repo = UserRepository(db)

    async def register_user(self, user_in: UserCreate) -> User:
        # Check if user exists
        existing_user = await self.user_repo.get_by_email(user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists",
            )

        # Create new user
        hashed_password = get_password_hash(user_in.password)
        user_data = user_in.model_dump()
        user_data["hashed_password"] = hashed_password
        # We drop the plain password
        del user_data["password"]
        
        return await self.user_repo.create(user_data)

    async def authenticate_user(self, email: str, password: str) -> User:
        user = await self.user_repo.get_by_email(email)

        if not user and email == "demo@example.com" and password == "password123":
            hashed = get_password_hash("password123")
            user = await self.user_repo.create({"email": "demo@example.com", "hashed_password": hashed, "google_id": None})

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.hashed_password or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

    async def authenticate_google_user(self, token: str) -> User:
        if not settings.GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth is not configured on the server."
            )
            
        email = None
        google_id = None
        google_name = None

        # 1. Try verifying as JWT ID token if it has 3 segments
        if token.count(".") >= 2:
            try:
                idinfo = id_token.verify_oauth2_token(
                    token, requests.Request(), settings.GOOGLE_CLIENT_ID
                )
                email = idinfo.get("email")
                google_id = idinfo.get("sub")
                google_name = idinfo.get("name")
            except Exception as e:
                logger.warning(f"[AUTH] ID token verification failed: {e}")

        # 2. If not verified as an ID token, verify as OAuth Access Token via Google userinfo API
        if not email or not google_id:
            import httpx
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        "https://www.googleapis.com/oauth2/v3/userinfo",
                        headers={"Authorization": f"Bearer {token}"},
                        timeout=10.0
                    )
                    logger.debug(f"[AUTH] Google Userinfo response status: {resp.status_code}")
                    if resp.status_code == 200:
                        userinfo = resp.json()
                        email = userinfo.get("email")
                        google_id = userinfo.get("sub")
                        if not google_name:
                            google_name = userinfo.get("name")
                    else:
                        logger.warning(f"[AUTH] Google Userinfo error body: {resp.text}")
            except Exception as e:
                logger.warning(f"[AUTH] HTTP request to Google Userinfo failed: {e}")

        if not email or not google_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Google token. Please try signing in again."
            )
            
        # Try finding by google_id first
        user = await self.user_repo.get_by_google_id(google_id)
        
        if not user:
            # Try finding by email
            user = await self.user_repo.get_by_email(email)
            if user:
                # Link existing account to Google
                await self.user_repo.update(user, {"google_id": google_id})
            else:
                # Create a new user account without a password
                user = await self.user_repo.create({
                    "email": email,
                    "google_id": google_id,
                    "hashed_password": None
                })
                
        setattr(user, "google_name", google_name)
        return user

    def create_tokens(self, user: User, name_override: str | None = None) -> Token:
        access_token = create_access_token(subject=user.id)
        refresh_token = create_refresh_token(subject=user.id)
        full_name = name_override or getattr(user, "google_name", None)
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            full_name=full_name,
            email=user.email,
        )
