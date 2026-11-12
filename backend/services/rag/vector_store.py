"""
Vector Store Implementations for CartSettle Hybrid RAG.
Supports:
1. ChromaVectorStore: Local persistent ChromaDB (zero cloud dependency, fast cosine search).
2. InMemoryVectorStore: Transient in-memory cosine store for testing and isolation.
"""
import os
import math
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from .config import RAG_DATA_DIR, RAG_COLLECTION_NAME, RAG_VECTOR_STORE

logger = logging.getLogger(__name__)


class BaseVectorStore(ABC):
    @abstractmethod
    def add_documents(
        self,
        ids: List[str],
        documents: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
    ) -> int:
        pass

    @abstractmethod
    def query(
        self,
        query_vector: List[float],
        top_k: int = 6,
        where: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Returns list of matches: [{'id': ..., 'document': ..., 'metadata': ..., 'distance': ..., 'similarity': ...}]"""
        pass

    @abstractmethod
    def delete_documents(self, ids: List[str]) -> int:
        pass

    @abstractmethod
    def count(self) -> int:
        pass

    @abstractmethod
    def clear(self) -> None:
        pass


class ChromaVectorStore(BaseVectorStore):
    def __init__(self, data_dir: str = RAG_DATA_DIR, collection_name: str = RAG_COLLECTION_NAME):
        self.data_dir = data_dir
        self.collection_name = collection_name
        os.makedirs(self.data_dir, exist_ok=True)
        try:
            import chromadb
            from chromadb.config import Settings
            self.client = chromadb.PersistentClient(
                path=self.data_dir,
                settings=Settings(anonymized_telemetry=False)
            )
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB at {self.data_dir}: {e}")
            raise

    def add_documents(
        self,
        ids: List[str],
        documents: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
    ) -> int:
        if not ids:
            return 0
        # Sanitize metadatas (Chroma requires string, int, float, or bool)
        sanitized_metadatas = []
        for meta in metadatas:
            clean = {}
            for k, v in meta.items():
                if isinstance(v, (str, int, float, bool)):
                    clean[k] = v
                elif v is None:
                    clean[k] = ""
                else:
                    clean[k] = str(v)
            sanitized_metadatas.append(clean)

        self.collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=sanitized_metadatas,
        )
        return len(ids)

    def query(
        self,
        query_vector: List[float],
        top_k: int = 6,
        where: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        current_count = self.collection.count()
        if current_count == 0:
            return []

        actual_k = min(top_k, current_count)
        query_args = {
            "query_embeddings": [query_vector],
            "n_results": actual_k,
        }
        if where:
            query_args["where"] = where

        try:
            results = self.collection.query(**query_args)
        except Exception as e:
            logger.warning(f"ChromaDB query error with filter {where}: {e}")
            if where:
                query_args.pop("where")
                results = self.collection.query(**query_args)
            else:
                return []

        matches = []
        ids = results.get("ids", [[]])[0]
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for i in range(len(ids)):
            dist = float(distances[i]) if i < len(distances) else 1.0
            # For cosine space: similarity = 1 - (distance / 2) or 1 - distance
            similarity = max(0.0, 1.0 - (dist / 2.0))
            matches.append({
                "id": ids[i],
                "document": docs[i] if i < len(docs) else "",
                "metadata": metas[i] if i < len(metas) else {},
                "distance": dist,
                "similarity": round(similarity, 4),
            })
        return matches

    def delete_documents(self, ids: List[str]) -> int:
        if not ids:
            return 0
        try:
            self.collection.delete(ids=ids)
            return len(ids)
        except Exception as e:
            logger.warning(f"Error deleting documents {ids}: {e}")
            return 0

    def count(self) -> int:
        return self.collection.count()

    def clear(self) -> None:
        try:
            self.client.delete_collection(self.collection_name)
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
        except Exception as e:
            logger.warning(f"Error clearing collection: {e}")


class InMemoryVectorStore(BaseVectorStore):
    """In-memory cosine vector store for testing."""
    def __init__(self):
        self.store = {}

    def add_documents(
        self,
        ids: List[str],
        documents: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
    ) -> int:
        for doc_id, doc, emb, meta in zip(ids, documents, embeddings, metadatas):
            self.store[doc_id] = {
                "id": doc_id,
                "document": doc,
                "embedding": emb,
                "metadata": meta,
            }
        return len(ids)

    def _cosine(self, v1: List[float], v2: List[float]) -> float:
        dot = sum(a * b for a, b in zip(v1, v2))
        n1 = math.sqrt(sum(a * a for a in v1))
        n2 = math.sqrt(sum(b * b for b in v2))
        if n1 == 0 or n2 == 0:
            return 0.0
        return dot / (n1 * n2)

    def query(
        self,
        query_vector: List[float],
        top_k: int = 6,
        where: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        scored = []
        for doc_id, item in self.store.items():
            if where:
                m = item["metadata"]
                if not all(m.get(k) == v for k, v in where.items()):
                    continue
            sim = self._cosine(query_vector, item["embedding"])
            dist = max(0.0, 1.0 - sim)
            scored.append({
                "id": doc_id,
                "document": item["document"],
                "metadata": item["metadata"],
                "distance": dist,
                "similarity": round(max(0.0, sim), 4),
            })
        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:top_k]

    def delete_documents(self, ids: List[str]) -> int:
        c = 0
        for i in ids:
            if i in self.store:
                del self.store[i]
                c += 1
        return c

    def count(self) -> int:
        return len(self.store)

    def clear(self) -> None:
        self.store.clear()


_STORE_INSTANCE: Optional[BaseVectorStore] = None


def get_vector_store() -> BaseVectorStore:
    global _STORE_INSTANCE
    if _STORE_INSTANCE is None:
        store_type = RAG_VECTOR_STORE.lower().strip()
        if store_type == "memory":
            _STORE_INSTANCE = InMemoryVectorStore()
        else:
            try:
                _STORE_INSTANCE = ChromaVectorStore()
            except Exception as e:
                logger.warning(f"ChromaDB initialization failed ({e}), falling back to InMemoryVectorStore.")
                _STORE_INSTANCE = InMemoryVectorStore()
    return _STORE_INSTANCE
