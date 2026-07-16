from abc import ABC, abstractmethod
from typing import List
import httpx
import logging
from app.schemas.retrieval import UnifiedPatent, ProviderResponse

logger = logging.getLogger(__name__)

class PatentProviderAdapter(ABC):
    """
    Base interface for all patent providers.
    """
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g., 'pubchem', 'surechembl')"""
        pass

    @abstractmethod
    async def retrieve_by_smiles(self, canonical_smiles: str) -> ProviderResponse:
        """
        Fetch patents for a given canonical SMILES.
        
        Args:
            canonical_smiles: The canonical SMILES string.
            
        Returns:
            ProviderResponse object containing the retrieved data and metadata.
            
        Raises:
            Exception if the provider fails to retrieve data.
        """
        pass
        
    async def fetch_json(self, client: httpx.AsyncClient, url: str, params: dict = None) -> dict:
        """Utility for making robust HTTP GET requests with JSON parsing and retries."""
        import asyncio
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = await client.get(url, params=params, timeout=30.0)
                response.raise_for_status()
                return response.json()
            except (httpx.HTTPStatusError, httpx.RequestError) as e:
                logger.warning(f"{self.provider_name} Network error on attempt {attempt + 1}: {e}")
                if attempt == max_retries - 1:
                    logger.error(f"{self.provider_name} Failed after {max_retries} attempts: {e}")
                    raise
                await asyncio.sleep(2 ** attempt)
            except Exception as e:
                logger.error(f"{self.provider_name} Unexpected error: {e}")
                raise
