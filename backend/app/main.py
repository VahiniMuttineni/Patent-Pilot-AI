from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.routers import auth
from app.core.database import engine
from app.models.base import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


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
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "An unexpected error occurred",
                "error": str(exc),
                "code": "INTERNAL_SERVER_ERROR"
            }
        )

    from app.api.middleware import RequestIDMiddleware, RequestTimingAndLoggingMiddleware, SecurityHeadersMiddleware
    from app.api.rate_limiter import RateLimitMiddleware

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
    app.add_middleware(RequestTimingAndLoggingMiddleware)
    app.add_middleware(RequestIDMiddleware)

    # Set all CORS enabled origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # configure properly in production
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
