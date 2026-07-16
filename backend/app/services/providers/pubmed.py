import httpx
import urllib.parse
import time
from datetime import datetime
from app.services.providers.base import PatentProviderAdapter
from app.schemas.retrieval import ProviderResponse, ProviderMetadata, ScientificArticle

class PubMedProvider(PatentProviderAdapter):
    @property
    def provider_name(self) -> str:
        return "PubMed"

    async def retrieve_by_smiles(self, canonical_smiles: str) -> ProviderResponse:
        start_time = time.time()
        encoded_term = urllib.parse.quote(f'"{canonical_smiles}"')
        
        # 1. ESearch to find PMIDs
        esearch_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={encoded_term}&retmode=json&retmax=5"
        
        async with httpx.AsyncClient() as client:
            try:
                search_data = await self.fetch_json(client, esearch_url)
                id_list = search_data.get("esearchresult", {}).get("idlist", [])
                
                if not id_list:
                    return self._empty_response(start_time, "Success", "No articles found matching the SMILES.")
                
                # 2. ESummary to fetch article metadata
                ids_str = ",".join(id_list)
                esummary_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id={ids_str}&retmode=json"
                
                summary_data = await self.fetch_json(client, esummary_url)
                result_map = summary_data.get("result", {})
                
                articles = []
                for pmid in id_list:
                    article_data = result_map.get(pmid, {})
                    if not article_data:
                        continue
                        
                    title = article_data.get("title", "")
                    journal = article_data.get("fulljournalname", "")
                    pub_date_str = article_data.get("pubdate", "")
                    authors_list = [author.get("name") for author in article_data.get("authors", [])]
                    
                    # Parse date safely
                    pub_date = None
                    try:
                        # pubdate is usually "2023 May 10" or "2023"
                        year = int(pub_date_str.split()[0])
                        pub_date = datetime(year, 1, 1).date()
                    except Exception:
                        pass
                    
                    articles.append(ScientificArticle(
                        pmid=pmid,
                        title=title,
                        authors=authors_list,
                        journal=journal,
                        publication_date=pub_date,
                        abstract="Abstract available via PubMed."
                    ))
                
                latency = (time.time() - start_time) * 1000
                meta = ProviderMetadata(
                    provider_name=self.provider_name,
                    source_type="Scientific Literature",
                    retrieval_method="NCBI E-utilities API",
                    status="Success",
                    num_results=len(articles),
                    response_time_ms=latency
                )
                
                return ProviderResponse(
                    scientific_articles=articles,
                    metadata=meta
                )

            except Exception as e:
                return self._empty_response(start_time, "Error", str(e), error=str(e))

    def _empty_response(self, start_time: float, status: str, reason: str, error: str = None) -> ProviderResponse:
        latency = (time.time() - start_time) * 1000
        meta = ProviderMetadata(
            provider_name=self.provider_name,
            source_type="Scientific Literature",
            retrieval_method="NCBI E-utilities API",
            status=status,
            num_results=0,
            response_time_ms=latency,
            reason=reason,
            error=error
        )
        return ProviderResponse(metadata=meta)
