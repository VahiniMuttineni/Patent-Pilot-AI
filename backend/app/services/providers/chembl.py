import httpx
import urllib.parse
from typing import List
import time
from app.services.providers.base import PatentProviderAdapter
from app.schemas.retrieval import ProviderResponse, ProviderMetadata, ScientificMetadata

class ChEMBLProvider(PatentProviderAdapter):
    @property
    def provider_name(self) -> str:
        return "ChEMBL"

    async def retrieve_by_smiles(self, canonical_smiles: str) -> ProviderResponse:
        start_time = time.time()
        encoded_smiles = urllib.parse.quote(canonical_smiles)
        url = f"https://www.ebi.ac.uk/chembl/api/data/molecule.json?molecule_structures__canonical_smiles__flexmatch={encoded_smiles}"
        
        async with httpx.AsyncClient() as client:
            try:
                data = await self.fetch_json(client, url)
                molecules = data.get("molecules", [])
                if not molecules:
                    return self._empty_response(start_time, "Success", "No ChEMBL ID found for SMILES.")
                    
                mol = molecules[0]
                chembl_id = mol.get("molecule_chembl_id")
                compound_name = mol.get("pref_name")
                
                synonyms = []
                for syn in mol.get("molecule_synonyms", []):
                    synonyms.append(syn.get("molecule_synonym"))
                    
                # We can do a quick check for targets/mechanisms using the chembl_id
                moa_url = f"https://www.ebi.ac.uk/chembl/api/data/mechanism.json?molecule_chembl_id={chembl_id}"
                targets = []
                mechanisms = []
                try:
                    moa_data = await self.fetch_json(client, moa_url)
                    for moa in moa_data.get("mechanisms", []):
                        mechanisms.append(moa.get("mechanism_of_action"))
                        targets.append(moa.get("target_chembl_id"))
                except Exception:
                    pass
                
                meta_record = ScientificMetadata(
                    chembl_id=chembl_id,
                    compound_name=compound_name,
                    synonyms=list(set([s for s in synonyms if s])),
                    targets=list(set([t for t in targets if t])),
                    mechanism_of_action="; ".join(set([m for m in mechanisms if m])) if mechanisms else None
                )
                
                latency = (time.time() - start_time) * 1000
                meta = ProviderMetadata(
                    provider_name=self.provider_name,
                    source_type="Molecular Database",
                    retrieval_method="ChEMBL API",
                    status="Success",
                    num_results=1,
                    response_time_ms=latency
                )
                
                return ProviderResponse(
                    scientific_metadata=[meta_record],
                    metadata=meta
                )
            except Exception as e:
                return self._empty_response(start_time, "Error", str(e), error=str(e))

    def _empty_response(self, start_time: float, status: str, reason: str, error: str = None) -> ProviderResponse:
        latency = (time.time() - start_time) * 1000
        meta = ProviderMetadata(
            provider_name=self.provider_name,
            source_type="Molecular Database",
            retrieval_method="ChEMBL API",
            status=status,
            num_results=0,
            response_time_ms=latency,
            reason=reason,
            error=error
        )
        return ProviderResponse(metadata=meta)
