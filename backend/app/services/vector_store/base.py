from abc import ABC, abstractmethod
from typing import List, Tuple, Dict, Any
import numpy as np

class VectorStore(ABC):
    """
    Abstract interface for Vector Store operations.
    """
    
    @abstractmethod
    def add_documents(self, ids: List[str], embeddings: List[np.ndarray], metadata: List[Dict[str, Any]] = None) -> None:
        """
        Add documents to the vector store.
        """
        pass
        
    @abstractmethod
    def search(self, query_embedding: np.ndarray, top_k: int = 10) -> List[Tuple[str, float, Dict[str, Any]]]:
        """
        Search for top_k most similar documents.
        Returns a list of tuples (id, score, metadata).
        """
        pass
        
    @abstractmethod
    def delete(self, ids: List[str]) -> None:
        """
        Delete documents from the vector store by ID.
        """
        pass
        
    @abstractmethod
    def rebuild_index(self) -> None:
        """
        Rebuild or clear the entire index.
        """
        pass
