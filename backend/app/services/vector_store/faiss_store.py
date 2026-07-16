import faiss
import numpy as np
from typing import List, Tuple, Dict, Any
from app.services.vector_store.base import VectorStore
import logging

logger = logging.getLogger(__name__)

class FAISSVectorStore(VectorStore):
    """
    FAISS implementation of the Vector Store using IndexFlatIP (Cosine Similarity).
    Requires vectors to be normalized for Cosine Similarity.
    """
    
    def __init__(self, dimension: int):
        self.dimension = dimension
        # IndexFlatIP with normalized vectors gives cosine similarity
        self.index = faiss.IndexFlatIP(dimension)
        # FAISS doesn't store string IDs or metadata natively in Flat index easily
        # We maintain a mapping from internal integer ID to document ID and metadata
        self.id_map: Dict[int, str] = {}
        self.metadata_map: Dict[int, Dict[str, Any]] = {}
        self._current_idx = 0

    def _normalize(self, embeddings: List[np.ndarray]) -> np.ndarray:
        vectors = np.vstack(embeddings).astype(np.float32)
        faiss.normalize_L2(vectors)
        return vectors

    def add_documents(self, ids: List[str], embeddings: List[np.ndarray], metadata: List[Dict[str, Any]] = None) -> None:
        if not ids or not embeddings:
            return
            
        vectors = self._normalize(embeddings)
        
        self.index.add(vectors)
        
        for i, doc_id in enumerate(ids):
            self.id_map[self._current_idx + i] = doc_id
            if metadata and i < len(metadata):
                self.metadata_map[self._current_idx + i] = metadata[i]
                
        self._current_idx += len(ids)

    def search(self, query_embedding: np.ndarray, top_k: int = 10) -> List[Tuple[str, float, Dict[str, Any]]]:
        if self.index.ntotal == 0:
            return []
            
        vectors = self._normalize([query_embedding])
        
        # Search returns distances (scores) and indices
        scores, indices = self.index.search(vectors, top_k)
        
        results = []
        for j, idx in enumerate(indices[0]):
            if idx != -1 and idx in self.id_map:
                doc_id = self.id_map[idx]
                score = float(scores[0][j])
                meta = self.metadata_map.get(idx, {})
                results.append((doc_id, score, meta))
                
        return results

    def delete(self, ids: List[str]) -> None:
        """
        Delete by IDs. FAISS FlatIndex doesn't support selective deletion efficiently,
        so we have to rebuild the index without those IDs.
        """
        ids_to_remove = set(ids)
        keep_indices = []
        
        for idx, doc_id in self.id_map.items():
            if doc_id not in ids_to_remove:
                keep_indices.append(idx)
                
        if len(keep_indices) == len(self.id_map):
            return # Nothing to delete
            
        # We need to extract the vectors we want to keep
        # For a Flat index, we can reconstruct the vectors
        if keep_indices:
            vectors_to_keep = []
            new_id_map = {}
            new_meta_map = {}
            
            for new_idx, old_idx in enumerate(keep_indices):
                vec = self.index.reconstruct(old_idx)
                vectors_to_keep.append(vec)
                new_id_map[new_idx] = self.id_map[old_idx]
                new_meta_map[new_idx] = self.metadata_map.get(old_idx, {})
                
            self.index = faiss.IndexFlatIP(self.dimension)
            if vectors_to_keep:
                self.index.add(np.vstack(vectors_to_keep).astype(np.float32))
                
            self.id_map = new_id_map
            self.metadata_map = new_meta_map
            self._current_idx = len(keep_indices)
        else:
            self.rebuild_index()

    def rebuild_index(self) -> None:
        self.index = faiss.IndexFlatIP(self.dimension)
        self.id_map.clear()
        self.metadata_map.clear()
        self._current_idx = 0
