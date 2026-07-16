from typing import List
import json
from app.schemas.ranking import RankedPatent
from app.schemas.retrieval import ScientificMetadata, ScientificArticle

class ContextBuilder:
    """
    Builds structured context for the LLM from deterministic system signals.
    """
    
    @staticmethod
    def build_patents_context(ranked_patents: List[RankedPatent], top_n: int = 5) -> str:
        """
        Formats the top-N ranked patents into a text context.
        """
        patents_to_process = ranked_patents[:top_n]
        context_parts = []
        
        for i, rp in enumerate(patents_to_process):
            p = rp.patent
            
            part = f"--- Patent {i+1} ---\n"
            part += f"ID: {p.patent_number}\n"
            part += f"Title: {p.title}\n"
            part += f"Abstract: {p.abstract}\n"
            if p.markush_smiles:
                part += f"Markush/Claim Substructure SMILES: {p.markush_smiles}\n"
            
            # Deterministic scores
            part += "\nDeterministic System Rankings (Do not invent these!):\n"
            part += f"- Final Score: {rp.final_score:.2f}\n"
            part += f"- Confidence: {rp.confidence_score:.2f}\n"
            part += f"- Primary Reason: {rp.ranking_reason}\n"
            part += f"- Breakdown: {json.dumps(rp.breakdown.model_dump(), indent=2)}\n"
            
            context_parts.append(part)
            
        return "\n\n".join(context_parts)

    @staticmethod
    def build_scientific_metadata_context(scientific_metadata: List[ScientificMetadata]) -> str:
        if not scientific_metadata:
            return "No scientific metadata available."
            
        parts = []
        for i, meta in enumerate(scientific_metadata):
            part = f"--- Compound Metadata {i+1} ---\n"
            part += f"ChEMBL ID: {meta.chembl_id}\n"
            part += f"Name: {meta.compound_name or 'N/A'}\n"
            if meta.synonyms:
                part += f"Synonyms: {', '.join(meta.synonyms)}\n"
            if meta.targets:
                part += f"Targets: {', '.join(meta.targets)}\n"
            if meta.mechanism_of_action:
                part += f"Mechanism of Action: {meta.mechanism_of_action}\n"
            parts.append(part)
        return "\n\n".join(parts)

    @staticmethod
    def build_scientific_articles_context(scientific_articles: List[ScientificArticle]) -> str:
        if not scientific_articles:
            return "No scientific articles available."
            
        parts = []
        for i, article in enumerate(scientific_articles):
            part = f"--- Scientific Article {i+1} ---\n"
            part += f"PMID: {article.pmid}\n"
            part += f"Title: {article.title}\n"
            part += f"Authors: {', '.join(article.authors)}\n"
            part += f"Journal: {article.journal} ({article.publication_date})\n"
            if article.abstract:
                part += f"Abstract: {article.abstract}\n"
            parts.append(part)
        return "\n\n".join(parts)
