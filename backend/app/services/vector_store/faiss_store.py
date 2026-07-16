import numpy as np
from typing import List, Tuple, Dict, Any
from app.services.vector_store.base import VectorStore
import logging

logger = logging.getLogger(__name__)

class FAISSVectorStore(VectorStore):
    """
    Pure NumPy implementation of the Vector Store using Cosine Similarity.
    Replaces the actual FAISS library to save 200MB+ of RAM on Render Free Tier.
    Keeps the class name FAISSVectorStore to prevent breaking existing imports.
    """
    
    def __init__(self, dimension: int):
        self.dimension = dimension
        # Store vectors natively in a list, then convert to matrix for search
        self.vectors: List[np.ndarray] = []
        self.id_map: Dict[int, str] = {}
        self.metadata_map: Dict[int, Dict[str, Any]] = {}
        self._current_idx = 0

    def _normalize(self, embeddings: List[np.ndarray]) -> np.ndarray:
        vectors = np.vstack(embeddings).astype(np.float32)
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        # Avoid division by zero
        norms[norms == 0] = 1.0
        return vectors / norms

    def add_documents(self, ids: List[str], embeddings: List[np.ndarray], metadata: List[Dict[str, Any]] = None) -> None:
        if not ids or not embeddings:
            return
            
        normalized_vectors = self._normalize(embeddings)
        
        for i, vec in enumerate(normalized_vectors):
            self.vectors.append(vec)
            
        for i, doc_id in enumerate(ids):
            self.id_map[self._current_idx + i] = doc_id
            if metadata and i < len(metadata):
                self.metadata_map[self._current_idx + i] = metadata[i]
                
        self._current_idx += len(ids)

    def search(self, query_embedding: np.ndarray, top_k: int = 10) -> List[Tuple[str, float, Dict[str, Any]]]:
        if not self.vectors:
            return []
            
        # 1. Normalize query
        query_vec = self._normalize([query_embedding])[0]
        
        # 2. Stack all document vectors into a matrix
        doc_matrix = np.vstack(self.vectors)
        
        # 3. Compute cosine similarity (dot product of normalized vectors)
        scores = np.dot(doc_matrix, query_vec)
        
        # 4. Get top K indices
        # If we have fewer documents than top_k, limit top_k
        k = min(top_k, len(scores))
        
        # argpartition is faster than argsort for top-k
        top_k_indices = np.argpartition(scores, -k)[-k:]
        # Sort the top k indices by score descending
        top_k_indices = top_k_indices[np.argsort(scores[top_k_indices])[::-1]]
        
        results = []
        for idx in top_k_indices:
            idx = int(idx)
            if idx in self.id_map:
                doc_id = self.id_map[idx]
                score = float(scores[idx])
                meta = self.metadata_map.get(idx, {})
                results.append((doc_id, score, meta))
                
        return results

    def delete(self, ids: List[str]) -> None:
        """
        Delete by IDs.
        """
        ids_to_remove = set(ids)
        keep_indices = []
        
        for idx, doc_id in self.id_map.items():
            if doc_id not in ids_to_remove:
                keep_indices.append(idx)
                
        if len(keep_indices) == len(self.id_map):
            return # Nothing to delete
            
        if keep_indices:
            vectors_to_keep = []
            new_id_map = {}
            new_meta_map = {}
            
            for new_idx, old_idx in enumerate(keep_indices):
                vectors_to_keep.append(self.vectors[old_idx])
                new_id_map[new_idx] = self.id_map[old_idx]
                new_meta_map[new_idx] = self.metadata_map.get(old_idx, {})
                
            self.vectors = vectors_to_keep
            self.id_map = new_id_map
            self.metadata_map = new_meta_map
            self._current_idx = len(keep_indices)
        else:
            self.rebuild_index()

    def rebuild_index(self) -> None:
        self.vectors.clear()
        self.id_map.clear()
        self.metadata_map.clear()
        self._current_idx = 0
