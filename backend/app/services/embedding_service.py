import asyncio
import logging
from typing import List
import numpy as np
import redis.asyncio as redis
import json
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

class EmbeddingService:
    """
    Service for generating embeddings using sentence-transformers.
    Model is loaded once at module level to avoid overhead.
    Supports batch generation and Redis caching.
    """
    
    _model = None

    def __init__(self, redis_client: redis.Redis = None):
        if EmbeddingService._model is None:
            logger.info("Loading SentenceTransformer model...")
            EmbeddingService._model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
            
        self.redis_client = redis_client
        self.cache_ttl = 60 * 60 * 24 * 7 # 7 days

    def get_embedding_dimension(self) -> int:
        return self._model.get_sentence_embedding_dimension()

    async def generate_embedding(self, text: str) -> np.ndarray:
        """
        Generate embedding for a single text.
        """
        result = await self.generate_embeddings([text])
        return result[0]

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
            keys = [f"emb:{hash(text)}" for text in texts]
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
            # We run the blocking computation in an executor to avoid blocking the event loop
            loop = asyncio.get_event_loop()
            computed = await loop.run_in_executor(
                None, 
                lambda: self._model.encode(texts_to_compute, convert_to_numpy=True)
            )
            
            # Cache the newly computed embeddings
            if self.redis_client:
                cache_dict = {}
                for idx, text, emb in zip(compute_indices, texts_to_compute, computed):
                    embeddings[idx] = emb
                    cache_dict[f"emb:{hash(text)}"] = json.dumps(emb.tolist())
                
                try:
                    # Using pipeline for fast mset with expiry is preferred, but simple mset + expire works too
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

        return embeddings
