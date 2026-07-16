from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import JSONResponse
import logging
from app.core.config import settings
from app.api.routers import auth
from app.core.database import engine
from app.models.base import Base

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} in {settings.ENVIRONMENT} mode...")
    
    # Verify critical connections before fully accepting requests
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database connection and migrations verified.")
    except Exception as e:
        logger.critical(f"Database connection failed: {e}")
        if settings.ENVIRONMENT == "production":
            raise e # Fail fast in production
            
    # Verify Redis
    if settings.REDIS_URL:
        import redis.asyncio as redis
        try:
            client = redis.from_url(settings.REDIS_URL)
            await client.ping()
            await client.aclose()
            logger.info("Redis cache connection verified.")
        except Exception as e:
            logger.warning(f"Redis cache connection failed: {e}. Running without cache.")
            
    logger.info("Application startup complete.")
    yield
    logger.info("Application shutdown initiated.")
    await engine.dispose()
    logger.info("Database engine disposed.")

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        description="AI-assisted Freedom-to-Operate (FTO) Workspace Backend",
        lifespan=lifespan,
    )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request, exc):
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "message": "Request validation failed",
                "error": str(exc.errors()),
                "code": "VALIDATION_ERROR"
            }
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request, exc):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.detail,
                "error": str(exc.detail),
                "code": f"HTTP_{exc.status_code}"
            }
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request, exc):
        logger.error(f"Unhandled general exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "An unexpected error occurred",
                "error": str(exc) if settings.ENVIRONMENT != "production" else "Internal server error",
                "code": "INTERNAL_SERVER_ERROR"
            }
        )

    from app.api.middleware import RequestIDMiddleware, RequestTimingAndLoggingMiddleware, SecurityHeadersMiddleware
    from app.api.rate_limiter import RateLimitMiddleware

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
    app.add_middleware(RequestTimingAndLoggingMiddleware)
    app.add_middleware(RequestIDMiddleware)

    # Configure CORS securely for production
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.api.routers import health
    app.include_router(health.router)

    from app.api.routers import search, molecules
    app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
    app.include_router(search.router, prefix=f"{settings.API_V1_STR}", tags=["Search"])
    app.include_router(molecules.router, prefix=f"{settings.API_V1_STR}", tags=["Molecules"])

    return app


app = create_app()
