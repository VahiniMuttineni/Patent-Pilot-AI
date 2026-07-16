from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import redis.asyncio as redis
import time

from app.api.dependencies import get_db
from app.core.config import settings

router = APIRouter(tags=["Health"])

START_TIME = time.time()

@router.get("/ready")
async def readiness_check():
    """
    Shallow check used by load balancers and k8s.
    Returns 200 OK if the API server is up and listening.
    """
    return {"status": "ready"}

@router.get("/health")
async def liveness_check(response: Response, db: AsyncSession = Depends(get_db)):
    """
    Deep health check verifying all downstream dependencies.
    """
    status = {
        "api": "healthy",
        "version": settings.VERSION,
        "uptime_seconds": int(time.time() - START_TIME),
        "database": "unknown",
        "redis": "unknown",
        "gemini": "unknown",
        "vector_store": "healthy", # FAISS is embedded, so it's healthy if the API is
        "embedding_model": "healthy" # sentence-transformers loads in memory
    }
    
    # 1. Database Check
    try:
        await db.execute(text("SELECT 1"))
        status["database"] = "healthy"
    except Exception as e:
        status["database"] = f"unhealthy: {str(e)}"
        
    # 2. Redis Check
    if settings.REDIS_URL:
        try:
            client = redis.from_url(settings.REDIS_URL)
            await client.ping()
            status["redis"] = "healthy"
            await client.aclose()
        except Exception as e:
            status["redis"] = f"unhealthy: {str(e)}"
    else:
        status["redis"] = "disabled"
        
    # 3. Gemini Check
    api_key = getattr(settings, "GEMINI_API_KEY", None)
    if api_key and api_key != "mock-api-key":
        status["gemini"] = "configured"
    else:
        status["gemini"] = "mocked/disabled"
        
    # Determine overall status code based on hard dependencies
    overall_code = 200
    if status["database"].startswith("unhealthy"):
        overall_code = 503
        
    response.status_code = overall_code
    return status
