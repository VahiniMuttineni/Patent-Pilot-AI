import asyncio
import logging
from typing import List
import numpy as np
import redis.asyncio as redis
import json
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    """
    Service for generating embeddings using Google Gemini API to save local RAM on Render.
    Supports batch generation and Redis caching.
    """
    
    _model = None

    def __init__(self, redis_client: redis.Redis = None):
        if EmbeddingService._model is None:
            logger.info("Initializing Gemini Embeddings client...")
            api_key = getattr(settings, "GEMINI_API_KEY", None)
            if not api_key:
                logger.warning("GEMINI_API_KEY is not set. Embeddings will fail.")
                
            EmbeddingService._model = GoogleGenerativeAIEmbeddings(
                model="models/text-embedding-004", 
                google_api_key=api_key
            )
            
        self.redis_client = redis_client
        self.cache_ttl = 60 * 60 * 24 * 7 # 7 days

    def get_embedding_dimension(self) -> int:
        return 768 # Gemini text-embedding-004 dimension is 768

    async def generate_embedding(self, text: str) -> np.ndarray:
        """
        Generate embedding for a single text.
        """
        result = await self.generate_embeddings([text])
        if result:
            return result[0]
        return np.zeros(self.get_embedding_dimension(), dtype=np.float32)

    async def generate_embeddings(self, texts: List[str]) -> List[np.ndarray]:
        """
        Batch generate embeddings with Redis caching.
        """
        if not texts:
            return []
            
        embeddings = [None] * len(texts)
        texts_to_compute = []
        compute_indices = []
        
        # Check cache
        if self.redis_client:
            keys = [f"emb:gemini:{hash(text)}" for text in texts]
            try:
                cached_values = await self.redis_client.mget(keys)
                for i, cached in enumerate(cached_values):
                    if cached:
                        embeddings[i] = np.array(json.loads(cached), dtype=np.float32)
                    else:
                        texts_to_compute.append(texts[i])
                        compute_indices.append(i)
            except Exception as e:
                logger.warning(f"Redis cache read error during embedding: {e}")
                texts_to_compute = texts
                compute_indices = list(range(len(texts)))
        else:
            texts_to_compute = texts
            compute_indices = list(range(len(texts)))

        # Compute missing embeddings
        if texts_to_compute:
            # Generate via Gemini API
            try:
                computed_lists = await self._model.aembed_documents(texts_to_compute)
                computed = [np.array(emb, dtype=np.float32) for emb in computed_lists]
                
                # Cache the newly computed embeddings
                if self.redis_client:
                    cache_dict = {}
                    for idx, text, emb in zip(compute_indices, texts_to_compute, computed_lists):
                        embeddings[idx] = np.array(emb, dtype=np.float32)
                        cache_dict[f"emb:gemini:{hash(text)}"] = json.dumps(emb)
                    
                    try:
                        pipe = self.redis_client.pipeline()
                        if cache_dict:
                            pipe.mset(cache_dict)
                            for key in cache_dict.keys():
                                pipe.expire(key, self.cache_ttl)
                        await pipe.execute()
                    except Exception as e:
                        logger.warning(f"Redis cache write error during embedding: {e}")
                else:
                    for idx, emb in zip(compute_indices, computed):
                        embeddings[idx] = emb
            except Exception as e:
                logger.error(f"Gemini embedding API error: {e}")
                # Fallback to zero vectors if API fails
                for idx in compute_indices:
                    embeddings[idx] = np.zeros(self.get_embedding_dimension(), dtype=np.float32)

        return embeddings
