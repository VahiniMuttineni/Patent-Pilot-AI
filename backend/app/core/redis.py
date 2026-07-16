import redis.asyncio as redis
from typing import AsyncGenerator
from app.core.config import settings
from app.core.logging import logger

redis_client: redis.Redis | None = None


async def init_redis():
    global redis_client
    if not redis_client:
        logger.info(f"Initializing Redis connection to {settings.REDIS_URL}")
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        # Test connection
        await redis_client.ping()
        logger.info("Redis connection established successfully.")


async def close_redis():
    global redis_client
    if redis_client:
        logger.info("Closing Redis connection.")
        await redis_client.aclose()
        redis_client = None


async def get_redis() -> AsyncGenerator[redis.Redis, None]:
    if not redis_client:
        await init_redis()
    yield redis_client
