import time
from typing import Callable, Awaitable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as redis
from app.core.config import settings

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Redis-backed rate limiter with in-memory fallback for local development.
    Limits: 100 requests per minute per IP.
    """
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.redis_client = None
        self._in_memory_store = {}
        self._is_redis_available = True
        
        if settings.REDIS_URL:
            self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:{client_ip}"
        
        try:
            allowed = await self._check_rate_limit(key)
        except Exception:
            # Fallback if Redis completely fails during runtime
            self._is_redis_available = False
            allowed = await self._check_rate_limit_memory(key)
            
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"error": "Too Many Requests", "message": "Rate limit exceeded. Please try again later."}
            )
            
        return await call_next(request)

    async def _check_rate_limit(self, key: str) -> bool:
        if self.redis_client and self._is_redis_available:
            try:
                current = await self.redis_client.get(key)
                if current and int(current) >= self.max_requests:
                    return False
                    
                pipe = self.redis_client.pipeline()
                pipe.incr(key)
                pipe.expire(key, self.window_seconds)
                await pipe.execute()
                return True
            except (redis.ConnectionError, redis.TimeoutError):
                self._is_redis_available = False
                return await self._check_rate_limit_memory(key)
        else:
            return await self._check_rate_limit_memory(key)

    async def _check_rate_limit_memory(self, key: str) -> bool:
        """In-memory fallback for environments without Redis (e.g. local SQLite testing)."""
        now = time.time()
        
        # Cleanup old entries
        self._in_memory_store = {
            k: v for k, v in self._in_memory_store.items() 
            if now - v["start_time"] < self.window_seconds
        }
        
        if key not in self._in_memory_store:
            self._in_memory_store[key] = {"count": 1, "start_time": now}
            return True
            
        record = self._in_memory_store[key]
        if record["count"] >= self.max_requests:
            return False
            
        record["count"] += 1
        return True
