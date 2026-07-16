import json
import logging
from typing import List, Tuple, Dict, Any
from pydantic import ValidationError

from app.schemas.ranking import RankedPatent
from app.schemas.report import PatentabilityReportSchema
from app.schemas.molecule import MoleculeMetadata
from app.schemas.retrieval import ScientificMetadata, ScientificArticle
from app.services.llm.prompt_manager import PromptManager
from app.services.llm.context_builder import ContextBuilder
from app.services.llm.gemini_client import GeminiService
from app.services.llm.ollama_client import OllamaService
from app.services.llm.groq_client import GroqService
from app.core.config import settings

logger = logging.getLogger(__name__)

class ReportGenerator:
    """
    Coordinates building the context, fetching structured LLM response,
    and validating/parsing the output with automatic repair capabilities.
    """
    
    def __init__(self, llm_client=None):
        if llm_client:
            self.llm_client = llm_client
        elif getattr(settings, "LLM_PROVIDER", "gemini") == "ollama":
            self.llm_client = OllamaService()
        elif getattr(settings, "LLM_PROVIDER", "gemini") == "groq":
            self.llm_client = GroqService()
        else:
            self.llm_client = GeminiService()
            
        self.prompt_manager = PromptManager()
        self.context_builder = ContextBuilder()

    async def generate_report(self, 
                              molecule_smiles: str, 
                              molecule_metadata: MoleculeMetadata,
                              ranked_patents: List[RankedPatent],
                              scientific_metadata: List[ScientificMetadata] = None,
                              scientific_articles: List[ScientificArticle] = None,
                              prompt_version: str = "v1") -> Tuple[PatentabilityReportSchema, Dict[str, Any]]:
        """
        Generates a validated AI FTO report.
        """
        if not ranked_patents:
            raise ValueError("No ranked patents provided for report generation.")
            
        # 1. Build Context
        meta_dict = molecule_metadata.model_dump()
        patents_context = self.context_builder.build_patents_context(ranked_patents, top_n=5)
        sci_meta_context = self.context_builder.build_scientific_metadata_context(scientific_metadata or [])
        sci_articles_context = self.context_builder.build_scientific_articles_context(scientific_articles or [])
        
        # 2. Render Prompt
        schema_json = json.dumps(PatentabilityReportSchema.model_json_schema(), indent=2)
        prompt = self.prompt_manager.get_prompt(
            version=prompt_version,
            molecule_smiles=molecule_smiles,
            molecule_descriptors=json.dumps(meta_dict, indent=2),
            patents_context=patents_context,
            scientific_metadata_context=sci_meta_context,
            scientific_articles_context=sci_articles_context,
            json_schema=schema_json
        )
        
        # 3. Call LLM
        response_text, metrics = await self.llm_client.generate_content_json(prompt)
        metrics["prompt_version"] = prompt_version
        
        # 4. Parse and Validate
        report, parse_metrics = await self._parse_and_repair(prompt, response_text)
        metrics.update(parse_metrics)
        
        report = self._ensure_markush_smiles(report, molecule_smiles, ranked_patents)
        return report, metrics

    def _ensure_markush_smiles(self, report: PatentabilityReportSchema, query_smiles: str, ranked_patents: List[RankedPatent]) -> PatentabilityReportSchema:
        distinct_analogs = [
            rp.patent.markush_smiles for rp in ranked_patents
            if rp.patent.markush_smiles and rp.patent.markush_smiles.strip() and rp.patent.markush_smiles != query_smiles
        ]
        for i, analysis in enumerate(report.patent_analyses):
            curr = analysis.markush_smiles
            if not curr or not curr.strip() or curr == query_smiles:
                rp = next((p for p in ranked_patents if p.patent.patent_number == analysis.patent_number), None)
                if rp and hasattr(rp.patent, "markush_smiles") and rp.patent.markush_smiles and rp.patent.markush_smiles != query_smiles:
                    analysis.markush_smiles = rp.patent.markush_smiles
                elif distinct_analogs:
                    analysis.markush_smiles = distinct_analogs[i % len(distinct_analogs)]
                elif rp and hasattr(rp.patent, "markush_smiles") and rp.patent.markush_smiles:
                    analysis.markush_smiles = rp.patent.markush_smiles
                else:
                    analysis.markush_smiles = query_smiles
        return report

    async def _parse_and_repair(self, original_prompt: str, response_text: str) -> Tuple[PatentabilityReportSchema, Dict[str, Any]]:
        metrics = {"repair_attempts": 0}
        
        try:
            # Strip markdown JSON block if present
            clean_text = self._strip_markdown(response_text)
            data = json.loads(clean_text)
            report = PatentabilityReportSchema.model_validate(data)
            return report, metrics
        except (json.JSONDecodeError, ValidationError) as e:
            logger.warning(f"Initial LLM response failed validation. Attempting repair... Error: {e}")
            metrics["repair_attempts"] += 1
            
            # Repair Prompt
            repair_prompt = f"""
The following JSON failed validation against the required schema.
Error: {str(e)}

Please fix the JSON and return ONLY valid JSON matching the schema.

Original Broken JSON:
{response_text}
            """
            
            repair_text, _ = await self.llm_client.generate_content_json(repair_prompt)
            clean_repair_text = self._strip_markdown(repair_text)
            
            try:
                data = json.loads(clean_repair_text)
                report = PatentabilityReportSchema.model_validate(data)
                return report, metrics
            except Exception as e2:
                logger.error(f"Repair attempt failed: {e2}")
                raise RuntimeError(f"Failed to generate valid Patentability Report. Parse error: {e2}")

    def _strip_markdown(self, text: str) -> str:
        """Helper to remove ```json ... ``` wrappers sometimes returned by LLMs."""
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
