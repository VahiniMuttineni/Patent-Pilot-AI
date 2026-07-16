from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError

from app.core.database import get_db
from app.core.security import decode_token
from app.schemas.user import UserCreate, UserResponse, GoogleAuthRequest
from app.schemas.token import Token
from app.services.auth_service import AuthService
from app.api.dependencies import get_current_active_user
from app.models.domain import User

router = APIRouter()


@router.post(
    "/register", status_code=status.HTTP_201_CREATED
)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    user = await auth_service.register_user(user_in)
    res = UserResponse.model_validate(user)
    return {"success": True, "data": res}


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)
):
    auth_service = AuthService(db)
    user = await auth_service.authenticate_user(form_data.username, form_data.password)
    res = auth_service.create_tokens(user)
    return {"success": True, "data": res}


@router.post("/google")
async def login_google(
    payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)
):
    auth_service = AuthService(db)
    user = await auth_service.authenticate_google_user(payload.token)
    res = auth_service.create_tokens(user)
    return {"success": True, "data": res}


@router.post("/refresh")
async def refresh_token(refresh_token: str, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(refresh_token)
        user_id_str: str = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id_str is None or token_type != "refresh":
            raise credentials_exception
            
        from uuid import UUID
        try:
            user_id = UUID(user_id_str)
        except ValueError:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    res = auth_service.create_tokens(user)
    return {"success": True, "data": res}


@router.get("/me")
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    res = UserResponse.model_validate(current_user)
    return {"success": True, "data": res}
