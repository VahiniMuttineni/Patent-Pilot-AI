import asyncio
import logging
import time
from typing import List
import redis.asyncio as redis
from pydantic import TypeAdapter

from app.schemas.retrieval import UnifiedPatent, RetrievalMetrics, RetrievalResult, ProviderResponse, ProviderMetadata
from app.services.providers import PatentProviderAdapter, PubChemProvider, ChEMBLProvider, GooglePatentsProvider, PubMedProvider, LensPatentProvider

logger = logging.getLogger(__name__)

class RetrievalService:
    """
    Orchestrates patent retrieval across multiple providers concurrently.
    Handles caching, deduplication, and metrics generation.
    """
    
    def __init__(self, providers: List[PatentProviderAdapter] = None, redis_client: redis.Redis = None):
        if providers is None:
            self.providers = [
                PubChemProvider(),
                ChEMBLProvider(),
                GooglePatentsProvider(),
                PubMedProvider(),
                LensPatentProvider()
            ]
        else:
            self.providers = providers

            
        self.redis_client = redis_client
        self.cache_ttl = 60 * 60 * 24 # 24 hours
        self.result_adapter = TypeAdapter(RetrievalResult)

    async def retrieve_patents(self, canonical_smiles: str) -> RetrievalResult:
        """
        Retrieves patents for a SMILES string, using cache if available,
        falling back to concurrent provider queries.
        """
        start_total = time.time()
        metrics = RetrievalMetrics()
        
        # Check Cache
        cache_key = f"patents:smiles:{canonical_smiles}:v2"
        if self.redis_client:
            try:
                cached_data = await self.redis_client.get(cache_key)
                if cached_data:
                    metrics.cache_hits += 1
                    result = self.result_adapter.validate_json(cached_data)
                    result.metrics.cache_hits += 1
                    result.metrics.cache_misses = 0
                    return result
            except Exception as e:
                logger.warning(f"Redis cache error: {e}")
        
        metrics.cache_misses += 1
        
        # Concurrent Retrieval
        tasks = []
        for provider in self.providers:
            tasks.append(self._fetch_from_provider(provider, canonical_smiles))
            
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_patents = []
        all_metadata = []
        all_articles = []
        
        for i, result in enumerate(results):
            provider_name = self.providers[i].provider_name
            if isinstance(result, Exception):
                logger.error(f"Provider {provider_name} failed: {result}")
            else:
                resp: ProviderResponse = result
                metrics.providers.append(resp.metadata)
                all_patents.extend(resp.patents)
                all_metadata.extend(resp.scientific_metadata)
                all_articles.extend(resp.scientific_articles)
                
        # Deduplicate Patents
        unique_patents = self._deduplicate(all_patents)
        
        metrics.total_retrieved = len(unique_patents)
        metrics.total_latency_ms = (time.time() - start_total) * 1000
        
        final_result = RetrievalResult(
            patents=unique_patents,
            scientific_metadata=all_metadata,
            scientific_articles=all_articles,
            metrics=metrics
        )
        
        # Log Summary
        self._log_retrieval_summary(metrics)
        
        # Update cache
        if self.redis_client:
            try:
                serialized = self.result_adapter.dump_json(final_result)
                await self.redis_client.setex(cache_key, self.cache_ttl, serialized)
            except Exception as e:
                logger.warning(f"Failed to write to Redis: {e}")
        
        return final_result

    def _log_retrieval_summary(self, metrics: RetrievalMetrics):
        summary = ["\n--- Retrieval Summary ---"]
        for pm in metrics.providers:
            summary.append(f"{pm.provider_name}")
            summary.append(f"Status: {pm.status}")
            summary.append(f"Source Type: {pm.source_type}")
            if pm.status == "Success":
                summary.append(f"Results Retrieved: {pm.num_results}")
                summary.append(f"Latency: {pm.response_time_ms:.2f} ms")
            else:
                summary.append(f"Reason: {pm.reason}")
            summary.append("---")
        
        logger.info("\n".join(summary))

    async def _fetch_from_provider(self, provider: PatentProviderAdapter, canonical_smiles: str) -> ProviderResponse:
        try:
            # We enforce a timeout globally per provider call
            return await asyncio.wait_for(provider.retrieve_by_smiles(canonical_smiles), timeout=45.0)
        except Exception as e:
            raise e

    def _deduplicate(self, patents: List[UnifiedPatent]) -> List[UnifiedPatent]:
        """
        Deduplicates primarily by patent_number.
        If patent_number is missing, uses title + publication_date.
        """
        seen = set()
        deduped = []
        
        for p in patents:
            if p.patent_number:
                key = p.patent_number.upper()
            else:
                # Fallback key
                title_key = p.title.lower() if p.title else ""
                date_key = str(p.publication_date) if p.publication_date else ""
                key = f"{title_key}_{date_key}"
                
            if key not in seen:
                seen.add(key)
                deduped.append(p)
                
        return deduped
