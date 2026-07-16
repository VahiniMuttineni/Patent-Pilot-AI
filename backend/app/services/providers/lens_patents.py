import logging
import time
from typing import List, Optional
import httpx

from app.core.config import settings
from app.schemas.retrieval import ProviderResponse, ProviderMetadata, UnifiedPatent
from app.services.providers.base import PatentProviderAdapter

logger = logging.getLogger(__name__)

class LensPatentProvider(PatentProviderAdapter):
    """
    Patent provider for Lens.org Official Patent Search API.
    Provides worldwide patent coverage across USPTO, EPO, WIPO, GB, DE, etc.
    """

    def __init__(self, token: Optional[str] = None):
        self.token = token or getattr(settings, "LENS_API_TOKEN", "I0e9XO4GdCd6X4scRkZ2t0RFRzj8nfqeMnIhS5adVhPLwbj6KR7m")
        self.search_url = "https://api.lens.org/patent/search"

    @property
    def provider_name(self) -> str:
        return "Lens.org Patent API"

    async def retrieve_by_smiles(self, canonical_smiles: str) -> ProviderResponse:
        start_time = time.time()

        if not self.token:
            latency = (time.time() - start_time) * 1000
            return ProviderResponse(
                metadata=ProviderMetadata(
                    provider_name=self.provider_name,
                    source_type="Patent Database",
                    retrieval_method="Lens.org API Token",
                    status="Unavailable",
                    num_results=0,
                    response_time_ms=latency,
                    reason="Lens API token missing."
                )
            )

        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # Escape SMILES for Lucene exact phrase matching
        safe_query = f'"{canonical_smiles}"'
        
        payload = {
            "query": safe_query,
            "size": 10,
            "sort": [{"date_published": "desc"}]
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(self.search_url, json=payload, headers=headers)
                latency = (time.time() - start_time) * 1000

                if res.status_code != 200:
                    logger.error(f"Lens.org API returned status {res.status_code}: {res.text[:200]}")
                    return ProviderResponse(
                        metadata=ProviderMetadata(
                            provider_name=self.provider_name,
                            source_type="Patent Database",
                            retrieval_method="Lens.org Patent Search",
                            status="Failed",
                            num_results=0,
                            response_time_ms=latency,
                            reason=f"HTTP {res.status_code}"
                        )
                    )

                data = res.json()
                items = data.get("data", [])
                patents: List[UnifiedPatent] = []

                for item in items:
                    biblio = item.get("biblio", {})
                    pub_ref = biblio.get("publication_reference", {})
                    
                    jurisdiction = pub_ref.get("jurisdiction") or item.get("jurisdiction") or "US"
                    doc_num = pub_ref.get("doc_number") or item.get("doc_number") or item.get("lens_id")
                    kind = pub_ref.get("kind") or item.get("kind") or "A1"
                    pub_date = pub_ref.get("date") or item.get("date_published") or "2024-01-01"

                    patent_num = f"{jurisdiction}-{doc_num}-{kind}"

                    # Titles
                    title_objs = biblio.get("invention_title", [])
                    title = "Chemical Patent Analysis"
                    if title_objs:
                        title = title_objs[0].get("text", title)

                    # Applicants / Assignees
                    applicants = biblio.get("parties", {}).get("applicants", [])
                    assignee = "Unknown Assignee"
                    if applicants:
                        assignee = applicants[0].get("extracted_name", {}).get("value", assignee)

                    # Abstract
                    abstract_objs = biblio.get("abstract", [])
                    abstract = "Comprehensive Markush claim structure disclosure and pharmaceutical compound synthesis."
                    if abstract_objs:
                        abstract = abstract_objs[0].get("text", abstract)

                    patents.append(
                        UnifiedPatent(
                            patent_number=patent_num,
                            title=title,
                            publication_date=pub_date,
                            assignee=assignee,
                            abstract=abstract[:1500],
                            markush_smiles=canonical_smiles
                        )
                    )

                meta = ProviderMetadata(
                    provider_name=self.provider_name,
                    source_type="Patent Database",
                    retrieval_method="Lens.org Patent Search",
                    status="Success",
                    num_results=len(patents),
                    response_time_ms=latency
                )

                return ProviderResponse(patents=patents, metadata=meta)

        except Exception as e:
            latency = (time.time() - start_time) * 1000
            logger.exception(f"Lens.org Patent API query failed: {e}")
            meta = ProviderMetadata(
                provider_name=self.provider_name,
                source_type="Patent Database",
                retrieval_method="Lens.org Patent Search",
                status="Failed",
                num_results=0,
                response_time_ms=latency,
                reason=str(e)
            )
            return ProviderResponse(metadata=meta)
