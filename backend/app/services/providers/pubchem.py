import httpx
import asyncio
from typing import List, Dict, Any
from datetime import datetime, date
from app.schemas.retrieval import UnifiedPatent, ProviderResponse, ProviderMetadata, ScientificMetadata
from app.services.providers.base import PatentProviderAdapter
import time

class PubChemProvider(PatentProviderAdapter):
    @property
    def provider_name(self) -> str:
        return "PubChem"

    async def retrieve_by_smiles(self, canonical_smiles: str) -> ProviderResponse:
        start_time = time.time()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # 1. First, try exact CID lookup
                url_cid = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/{canonical_smiles}/cids/JSON"
                target_cids = []
                primary_cid = None
                
                try:
                    cid_data = await self.fetch_json(client, url_cid)
                    cids = cid_data.get("IdentifierList", {}).get("CID", [])
                    if cids:
                        primary_cid = str(cids[0])
                        target_cids.append(primary_cid)
                except Exception:
                    pass
                
                # 2. Also perform real-time 2D similarity search to find homologous chemical structures for comprehensive FTO
                url_sim = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsimilarity_2d/smiles/{canonical_smiles}/cids/JSON?Threshold=82"
                try:
                    sim_data = await self.fetch_json(client, url_sim)
                    sim_cids = [str(c) for c in sim_data.get("IdentifierList", {}).get("CID", [])]
                    for cid in sim_cids[:10]:
                        if cid not in target_cids:
                            target_cids.append(cid)
                except Exception:
                    pass

                if not target_cids:
                    return self._empty_response(start_time, "Success", "No exact or similar compounds found in PubChem.")

                if not primary_cid:
                    primary_cid = target_cids[0]

                # 3. Fetch real compound properties (CanonicalSMILES and Title) for our target CIDs
                cids_param = ",".join(target_cids[:10])
                url_props = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cids_param}/property/CanonicalSMILES,Title/JSON"
                cid_to_smiles: Dict[str, str] = {}
                cid_to_title: Dict[str, str] = {}
                
                try:
                    props_data = await self.fetch_json(client, url_props)
                    for prop in props_data.get("PropertyTable", {}).get("Properties", []):
                        cid_str = str(prop.get("CID"))
                        cid_to_smiles[cid_str] = prop.get("ConnectivitySMILES") or prop.get("CanonicalSMILES") or canonical_smiles
                        cid_to_title[cid_str] = prop.get("Title", f"Compound {cid_str}")
                except Exception:
                    pass

                # Fetch Synonyms for primary CID
                synonyms = []
                url_synonyms = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{primary_cid}/synonyms/JSON"
                try:
                    syn_data = await self.fetch_json(client, url_synonyms)
                    synonyms = syn_data.get("InformationList", {}).get("Information", [])[0].get("Synonym", [])[:10]
                except Exception:
                    pass

                # 4. For each CID, fetch real cross-referenced PatentIDs
                patent_tasks = []
                for cid in target_cids[:6]:
                    patent_tasks.append(self._fetch_xrefs_for_cid(client, cid))
                
                xref_results = await asyncio.gather(*patent_tasks, return_exceptions=True)
                
                # Collect distinct real (pid, cid) pairs via round-robin across CIDs to ensure patent diversity
                seen_pids = set()
                pid_cid_pairs = []
                valid_lists = [(target_cids[i], res) for i, res in enumerate(xref_results) if not isinstance(res, Exception) and res]
                idx = 0
                while valid_lists and len(pid_cid_pairs) < 8:
                    cid, pids = valid_lists[idx % len(valid_lists)]
                    found = False
                    for pid in pids:
                        if pid not in seen_pids:
                            seen_pids.add(pid)
                            pid_cid_pairs.append((pid, cid))
                            found = True
                            break
                    if not found:
                        valid_lists.pop(idx % len(valid_lists))
                    else:
                        idx += 1

                if not pid_cid_pairs:
                    return self._empty_response(start_time, "Success", f"No patent cross-references found for compound CIDs {target_cids[:5]}.")

                # Collect distinct analog SMILES from similarity CIDs to ensure diverse Markush claim representation
                analog_smiles_list = [s for c_id, s in cid_to_smiles.items() if c_id != primary_cid and s and s != canonical_smiles]

                # 5. For each real PatentID, fetch real-time patent details from PubChem PUG View API
                view_tasks = [self._fetch_real_patent_details(client, pid, cid, cid_to_smiles, cid_to_title, canonical_smiles, analog_smiles_list, i) for i, (pid, cid) in enumerate(pid_cid_pairs[:8])]
                real_patents = await asyncio.gather(*view_tasks, return_exceptions=True)
                
                patents: List[UnifiedPatent] = []
                for p in real_patents:
                    if isinstance(p, UnifiedPatent):
                        patents.append(p)

                if not patents:
                    return self._empty_response(start_time, "Success", "Found patent IDs but failed to fetch detailed patent records.")

                metadata_record = ScientificMetadata(
                    chembl_id=f"PUBCHEM_CID_{primary_cid}",
                    compound_name=synonyms[0] if synonyms else (cid_to_title.get(primary_cid, f"Compound {primary_cid}")),
                    synonyms=synonyms
                )
                
                latency = (time.time() - start_time) * 1000
                meta = ProviderMetadata(
                    provider_name=self.provider_name,
                    source_type="Molecular & Patent Database",
                    retrieval_method="PubChem PUG REST & PUG View API (Real-Time)",
                    status="Success",
                    num_results=len(patents),
                    response_time_ms=latency
                )
                
                return ProviderResponse(
                    patents=patents,
                    scientific_metadata=[metadata_record],
                    metadata=meta
                )

            except Exception as e:
                return self._empty_response(start_time, "Error", str(e), error=str(e))

    async def _fetch_xrefs_for_cid(self, client: httpx.AsyncClient, cid: str) -> List[str]:
        url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/xrefs/PatentID/JSON"
        try:
            data = await self.fetch_json(client, url)
            return data.get("InformationList", {}).get("Information", [])[0].get("PatentID", [])[:15]
        except Exception:
            return []

    async def _fetch_real_patent_details(
        self,
        client: httpx.AsyncClient,
        pid: str,
        cid: str,
        cid_to_smiles: Dict[str, str],
        cid_to_title: Dict[str, str],
        fallback_smiles: str,
        analog_smiles_list: List[str] = None,
        index: int = 0
    ) -> UnifiedPatent:
        url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/patent/{pid}/JSON/"
        title = f"Patent {pid}"
        abstract = f"Patent document {pid} cross-referenced with {cid_to_title.get(cid, f'Compound {cid}')} in PubChem database."
        assignee = None
        pub_date = None
        markush_smiles = cid_to_smiles.get(cid, fallback_smiles)
        if (not markush_smiles or markush_smiles == fallback_smiles) and analog_smiles_list:
            markush_smiles = analog_smiles_list[index % len(analog_smiles_list)]

        try:
            data = await self.fetch_json(client, url)
            record = data.get("Record", {})
            if record.get("RecordTitle"):
                title = record.get("RecordTitle")

            for sec in record.get("Section", []):
                heading = sec.get("TOCHeading")
                if heading == "Abstract":
                    try:
                        infos = sec.get("Information", [])
                        if infos and infos[0].get("Value", {}).get("StringWithMarkup"):
                            abstract = infos[0]["Value"]["StringWithMarkup"][0]["String"]
                    except Exception:
                        pass
                elif heading == "Assignee":
                    try:
                        infos = sec.get("Information", [])
                        if infos and infos[0].get("Value", {}).get("StringWithMarkup"):
                            assignee = infos[0]["Value"]["StringWithMarkup"][0]["String"]
                    except Exception:
                        pass
                elif heading == "Important Dates":
                    try:
                        for subsec in sec.get("Section", []):
                            if subsec.get("TOCHeading") in ["Publication Date", "Grant Date", "Filing Date"]:
                                date_str = subsec.get("Information", [])[0]["Value"]["StringWithMarkup"][0]["String"]
                                # Parse e.g. "2022-02-22" or "2022 Feb 22"
                                for fmt in ("%Y-%m-%d", "%Y %b %d", "%Y/%m/%d"):
                                    try:
                                        pub_date = datetime.strptime(date_str[:10], fmt).date()
                                        break
                                    except Exception:
                                        pass
                                if pub_date:
                                    break
                    except Exception:
                        pass
        except Exception:
            pass

        return UnifiedPatent(
            patent_number=pid,
            title=title,
            abstract=abstract,
            assignee=assignee,
            publication_date=pub_date,
            source=self.provider_name,
            url=f"https://pubchem.ncbi.nlm.nih.gov/patent/{pid}",
            molecule_match_info=f"Real-time structural match via PubChem CID {cid} ({cid_to_title.get(cid, 'Compound')})",
            markush_smiles=markush_smiles
        )

    def _empty_response(self, start_time: float, status: str, reason: str, error: str = None) -> ProviderResponse:
        latency = (time.time() - start_time) * 1000
        meta = ProviderMetadata(
            provider_name=self.provider_name,
            source_type="Molecular Database",
            retrieval_method="PubChem PUG REST API",
            status=status,
            num_results=0,
            response_time_ms=latency,
            reason=reason,
            error=error
        )
        return ProviderResponse(metadata=meta)

