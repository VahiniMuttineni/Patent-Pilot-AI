import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.services.auth_service import AuthService
from app.core.config import settings
import traceback

async def main():
    engine = create_async_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        auth = AuthService(session)
        try:
            user = await auth.authenticate_user("demo@example.com", "password123")
            print("User authenticated:", user.id)
            tokens = auth.create_tokens(user)
            print("Tokens:", tokens)
        except Exception as e:
            print("ERROR IN AUTHENTICATE_USER:")
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
