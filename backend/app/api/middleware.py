import time
import uuid
from typing import Callable, Awaitable

from fastapi import Request, Response, HTTPException
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import logger

class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Injects a unique X-Request-ID into every request and response header.
    """
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

class RequestTimingAndLoggingMiddleware(BaseHTTPMiddleware):
    """
    Provides structured request logging and timing metrics.
    """
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        start_time = time.time()
        request_id = getattr(request.state, "request_id", "unknown")
        
        logger.info(f"[{request_id}] Started {request.method} {request.url.path}")
        
        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000
            
            logger.info(
                f"[{request_id}] Completed {request.method} {request.url.path} - "
                f"Status: {response.status_code} - Timing: {process_time:.2f}ms"
            )
            response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
            return response
            
        except (HTTPException, StarletteHTTPException) as exc:
            process_time = (time.time() - start_time) * 1000
            logger.info(
                f"[{request_id}] HTTP {exc.status_code} during {request.method} {request.url.path} - "
                f"Timing: {process_time:.2f}ms - Detail: {exc.detail}"
            )
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "success": False,
                    "message": exc.detail,
                    "error": str(exc.detail),
                    "code": f"HTTP_{exc.status_code}"
                },
                headers=getattr(exc, "headers", None)
            )
        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            logger.error(
                f"[{request_id}] Exception during {request.method} {request.url.path} - "
                f"Timing: {process_time:.2f}ms - Error: {e}",
                exc_info=True
            )
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal Server Error",
                    "message": f"An unexpected error occurred: {str(e)}",
                    "exception_type": type(e).__name__,
                    "request_id": request_id
                }
            )



class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Injects standard security headers to all HTTP responses.
    """
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

