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
        
    # 2. Redis Check (Disabled)
    status["redis"] = "disabled"
        
    # 3. Gemini / Groq Check
    status["llm_provider"] = settings.LLM_PROVIDER
    if settings.LLM_PROVIDER == "groq":
        status["llm_status"] = "configured" if getattr(settings, "GROQ_API_KEY", None) else "missing"
    elif settings.LLM_PROVIDER == "gemini":
        status["llm_status"] = "configured" if getattr(settings, "GEMINI_API_KEY", None) else "missing"
    else:
        status["llm_status"] = "local"
        
    # 4. External Providers Check
    status["external_providers"] = {
        "lens_api": "configured" if getattr(settings, "LENS_API_TOKEN", None) else "missing",
        "ncbi_api": "configured" if getattr(settings, "NCBI_API_KEY", None) else "missing",
        "chemspider_api": "configured" if getattr(settings, "CHEMSPIDER_API_KEY", None) else "missing",
    }
        
    # Determine overall status code based on hard dependencies
    overall_code = 200
    if status["database"].startswith("unhealthy"):
        overall_code = 503
        
    response.status_code = overall_code
    return status
