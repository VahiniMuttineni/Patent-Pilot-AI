import pytest
import numpy as np
from unittest.mock import AsyncMock
from datetime import date

from app.schemas.retrieval import UnifiedPatent
from app.services.embedding_service import EmbeddingService
from app.services.vector_store.faiss_store import FAISSVectorStore
from app.services.ranking_service import RankingService

@pytest.fixture
def mock_embedding_service():
    service = EmbeddingService()
    # Mocking dimension
    service.get_embedding_dimension = lambda: 384
    
    # Mocking embedding generation to return deterministic dummy vectors
    async def mock_generate(texts):
        return [np.random.rand(384).astype(np.float32) for _ in texts]
    
    service.generate_embeddings = AsyncMock(side_effect=mock_generate)
    
    async def mock_generate_single(text):
        return np.ones(384).astype(np.float32)
        
    service.generate_embedding = AsyncMock(side_effect=mock_generate_single)
    
    return service

def test_faiss_vector_store():
    store = FAISSVectorStore(dimension=4)
    ids = ["doc1", "doc2"]
    
    # Needs to be float32
    emb1 = np.array([1, 0, 0, 0], dtype=np.float32)
    emb2 = np.array([0, 1, 0, 0], dtype=np.float32)
    
    store.add_documents(ids, [emb1, emb2], [{"meta": "1"}, {"meta": "2"}])
    
    # Search with emb1
    query = np.array([1, 0, 0, 0], dtype=np.float32)
    results = store.search(query, top_k=2)
    
    assert len(results) == 2
    # doc1 should be most similar
    assert results[0][0] == "doc1"
    # cosine similarity of identical normalized vectors is 1.0 (with float precision it's close to 1)
    assert pytest.approx(results[0][1], 0.01) == 1.0
    assert results[0][2] == {"meta": "1"}
    
    # Delete doc1
    store.delete(["doc1"])
    results_after = store.search(query, top_k=2)
    
    assert len(results_after) == 1
    assert results_after[0][0] == "doc2"

@pytest.mark.asyncio
async def test_ranking_service(mock_embedding_service):
    ranking_service = RankingService(embedding_service=mock_embedding_service)
    
    patents = [
        UnifiedPatent(
            patent_number="P1",
            title="Aspirin formulation",
            abstract="Pain relief medicine.",
            publication_date=date(2023, 1, 1),
            source="Test"
        ),
        UnifiedPatent(
            patent_number="P2",
            title="Irrelevant patent",
            abstract="Something else.",
            publication_date=date(2000, 1, 1),
            source="Test"
        )
    ]
    
    mol_sims = {"P1": 0.9, "P2": 0.1}
    query = "pain relief formulation"
    
    ranked_results, metrics = await ranking_service.rank_patents(
        query_text=query,
        query_smiles="CC(=O)OC1=CC=CC=C1C(=O)O",
        patents=patents,
        top_k=2,
        molecule_similarities=mol_sims
    )
    
    assert len(ranked_results) == 2
    
    # P1 should rank higher due to keywords, molecular similarity, and recency
    top_patent = ranked_results[0]
    assert top_patent.patent.patent_number == "P1"
    assert top_patent.final_score > ranked_results[1].final_score
    
    # Explainability checks
    assert "reason" in top_patent.ranking_reason.lower() or "relevant" in top_patent.ranking_reason.lower()
    assert top_patent.breakdown.molecular_similarity == 0.9
    assert top_patent.breakdown.keyword_match > 0.0
    assert top_patent.breakdown.publication_recency > 0.5 # Recent patent
    
    assert "ranking_latency_ms" in metrics
    assert "embedding_latency_ms" in metrics
