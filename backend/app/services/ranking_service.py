import logging
import time
from typing import List, Dict, Tuple
from datetime import date
from app.schemas.retrieval import UnifiedPatent
from app.schemas.ranking import RankedPatent, PatentRankingBreakdown
from app.services.embedding_service import EmbeddingService
from app.services.vector_store.faiss_store import FAISSVectorStore

logger = logging.getLogger(__name__)

class RankingService:
    """
    Explainable Ranking Engine for Patents.
    Uses FAISS for semantic search and an explainable weighted algorithm for final ranking.
    """
    
    def __init__(self, embedding_service: EmbeddingService):
        self.embedding_service = embedding_service
        self.vector_store = FAISSVectorStore(dimension=self.embedding_service.get_embedding_dimension())
        
        # Explainable Weights
        self.weights = {
            "molecular_similarity": 0.40,
            "semantic_similarity": 0.35,
            "keyword_match": 0.10,
            "publication_recency": 0.10,
            "metadata_quality": 0.05
        }

    async def rank_patents(self, 
                           query_text: str, 
                           query_smiles: str,
                           patents: List[UnifiedPatent], 
                           top_k: int = 10,
                           molecule_similarities: Dict[str, float] = None) -> Tuple[List[RankedPatent], Dict[str, float]]:
        """
        Rank patents using a weighted combination of semantic similarity, molecular similarity,
        keyword match, recency, and metadata quality.
        """
        start_time = time.time()
        metrics = {}
        
        if not patents:
            return [], metrics
            
        molecule_similarities = molecule_similarities or {}
        
        # 1. Semantic Similarity
        # Build vector store
        texts = [f"{p.title}. {p.abstract}" for p in patents]
        embeddings = await self.embedding_service.generate_embeddings(texts)
        
        ids = [p.patent_number or f"idx_{i}" for i, p in enumerate(patents)]
        
        # Rebuild index to ensure clean state per search query
        self.vector_store.rebuild_index()
        self.vector_store.add_documents(ids, embeddings)
        
        query_embedding = await self.embedding_service.generate_embedding(query_text)
        
        # Search all to get semantic scores for all patents
        search_results = self.vector_store.search(query_embedding, top_k=len(patents))
        semantic_scores = {doc_id: max(0.0, score) for doc_id, score, _ in search_results}
        
        metrics["embedding_latency_ms"] = (time.time() - start_time) * 1000
        rank_start = time.time()
        
        ranked_results = []
        
        # Keywords from query for simple matching
        keywords = set([w.lower() for w in query_text.split() if len(w) > 3])
        
        today = date.today()
        
        for p, p_id in zip(patents, ids):
            # Semantic Score
            sem_score = semantic_scores.get(p_id, 0.0)
            
            # Molecular Score
            mol_score = molecule_similarities.get(p_id, 0.0)
            
            # Keyword Match Score
            text = f"{p.title} {p.abstract}".lower()
            kw_hits = sum(1 for kw in keywords if kw in text)
            kw_score = min(1.0, kw_hits / max(1, len(keywords)))
            
            # Recency Score (decay over 20 years)
            recency_score = 0.5 # Default
            if p.publication_date:
                years_old = (today - p.publication_date).days / 365.25
                recency_score = max(0.0, 1.0 - (years_old / 20.0))
                
            # Metadata Quality
            meta_score = 0.0
            if p.patent_number:
                meta_score += 0.2
            if p.title:
                meta_score += 0.2
            if p.abstract:
                meta_score += 0.2
            if p.publication_date:
                meta_score += 0.2
            if p.assignee:
                meta_score += 0.2
            
            # Weighted Sum
            final_score = (
                sem_score * self.weights["semantic_similarity"] +
                mol_score * self.weights["molecular_similarity"] +
                kw_score * self.weights["keyword_match"] +
                recency_score * self.weights["publication_recency"] +
                meta_score * self.weights["metadata_quality"]
            )
            
            # Explainability logic
            scores = {
                "Semantic Context": sem_score * self.weights["semantic_similarity"],
                "Chemical Structure": mol_score * self.weights["molecular_similarity"],
                "Keywords": kw_score * self.weights["keyword_match"],
                "Recency": recency_score * self.weights["publication_recency"],
                "Data Quality": meta_score * self.weights["metadata_quality"]
            }
            top_reason = max(scores.items(), key=lambda x: x[1])[0]
            
            confidence = min(1.0, final_score + 0.1) # simplistic confidence mapping
            
            if final_score > 0.8:
                reason = f"Highly relevant due to strong {top_reason} match."
            elif final_score > 0.5:
                reason = f"Moderately relevant, primarily driven by {top_reason}."
            else:
                reason = "Low relevance. Weak matching across all signals."
                
            breakdown = PatentRankingBreakdown(
                molecular_similarity=mol_score,
                semantic_similarity=sem_score,
                keyword_match=kw_score,
                metadata_quality=meta_score,
                publication_recency=recency_score
            )
            
            ranked_results.append(
                RankedPatent(
                    patent=p,
                    final_score=final_score,
                    confidence_score=confidence,
                    ranking_reason=reason,
                    breakdown=breakdown
                )
            )
            
        # Sort and take top_k
        ranked_results.sort(key=lambda x: x.final_score, reverse=True)
        top_results = ranked_results[:top_k]
        
        metrics["ranking_latency_ms"] = (time.time() - rank_start) * 1000
        return top_results, metrics
