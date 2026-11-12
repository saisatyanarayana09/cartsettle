"""
Embedding Providers for CartSettle Hybrid RAG.
Supports:
1. Google Gemini Embeddings API (gemini-embedding-001, 768-dim) with rate-limit retry & hash caching.
2. Local Fallback Embedding Provider (zero-dependency, deterministic term hashing) for offline dev & test.
"""
import os
import time
import math
import hashlib
import logging
import concurrent.futures
from abc import ABC, abstractmethod
from typing import List, Optional
import requests
from requests.adapters import HTTPAdapter
from django.conf import settings
from .config import (
    RAG_EMBEDDING_PROVIDER,
    RAG_EMBEDDING_MODEL,
    RAG_EMBEDDING_DIM,
    RAG_REQUEST_TIMEOUT,
    RAG_CACHE_EMBEDDINGS,
)

logger = logging.getLogger(__name__)

# Global in-process cache mapping SHA-256(text) -> list[float]
_EMBEDDING_CACHE = {}
_HTTP_SESSION = None


def get_rag_http_session() -> requests.Session:
    """Returns a thread-safe requests.Session with connection pooling."""
    global _HTTP_SESSION
    if _HTTP_SESSION is None:
        s = requests.Session()
        adapter = HTTPAdapter(pool_connections=12, pool_maxsize=24)
        s.mount("https://", adapter)
        s.mount("http://", adapter)
        _HTTP_SESSION = s
    return _HTTP_SESSION


class BaseEmbeddingProvider(ABC):
    @abstractmethod
    def embed_text(self, text: str) -> List[float]:
        """Embeds a single string into a float vector."""
        pass

    @abstractmethod
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embeds a list of strings into float vectors."""
        pass

    @property
    @abstractmethod
    def dimension(self) -> int:
        pass


class GeminiEmbeddingProvider(BaseEmbeddingProvider):
    def __init__(self, api_key: Optional[str] = None, model: str = RAG_EMBEDDING_MODEL, dim: int = RAG_EMBEDDING_DIM):
        self.api_key = api_key or getattr(settings, "GEMINI_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")
        self.model = model
        self.dim = dim
        self._fallback = LocalFallbackEmbeddingProvider(dim=dim)

    @property
    def dimension(self) -> int:
        return self.dim

    def _cache_key(self, text: str) -> str:
        return hashlib.sha256(f"{self.model}:{self.dim}:{text.strip()}".encode("utf-8")).hexdigest()

    def embed_text(self, text: str) -> List[float]:
        cleaned = text.strip()
        if not cleaned:
            return [0.0] * self.dim

        if RAG_CACHE_EMBEDDINGS:
            ck = self._cache_key(cleaned)
            if ck in _EMBEDDING_CACHE:
                return _EMBEDDING_CACHE[ck]

        if not self.api_key:
            return self._fallback.embed_text(cleaned)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:embedContent?key={self.api_key}"
        payload = {
            "content": {"parts": [{"text": cleaned}]},
            "outputDimensionality": self.dim
        }

        # Bounded retry with exponential backoff
        backoffs = [0.6, 1.5, 3.0]
        last_err = None
        for delay in backoffs:
            try:
                res = get_rag_http_session().post(url, json=payload, timeout=RAG_REQUEST_TIMEOUT)
                if res.status_code == 200:
                    vec = res.json().get("embedding", {}).get("values", [])
                    if len(vec) == self.dim:
                        if RAG_CACHE_EMBEDDINGS:
                            _EMBEDDING_CACHE[self._cache_key(cleaned)] = vec
                        return vec
                    elif len(vec) > 0:
                        # Slice or pad to requested dimension
                        trimmed = vec[:self.dim] if len(vec) > self.dim else vec + [0.0] * (self.dim - len(vec))
                        if RAG_CACHE_EMBEDDINGS:
                            _EMBEDDING_CACHE[self._cache_key(cleaned)] = trimmed
                        return trimmed
                elif res.status_code in (429, 503):
                    time.sleep(delay)
                    continue
                else:
                    logger.warning(f"Gemini embedding API error: {res.status_code} - {res.text[:120]}")
                    break
            except Exception as e:
                last_err = e
                time.sleep(delay)

        logger.warning(f"Gemini embedding failed ({last_err}), using deterministic local fallback.")
        return self._fallback.embed_text(cleaned)

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        results = []
        uncached_indices = []
        uncached_texts = []

        for idx, t in enumerate(texts):
            cleaned = t.strip()
            ck = self._cache_key(cleaned) if RAG_CACHE_EMBEDDINGS else None
            if ck and ck in _EMBEDDING_CACHE:
                results.append((idx, _EMBEDDING_CACHE[ck]))
            else:
                uncached_indices.append(idx)
                uncached_texts.append(cleaned)

        if uncached_texts:
            # Parallelize via thread pool with connection reuse
            workers = min(6, len(uncached_texts))
            with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
                future_to_idx = {
                    executor.submit(self.embed_text, u_text): u_idx
                    for u_idx, u_text in zip(uncached_indices, uncached_texts)
                }
                for future in concurrent.futures.as_completed(future_to_idx):
                    u_idx = future_to_idx[future]
                    try:
                        vec = future.result()
                    except Exception as e:
                        logger.warning(f"Error in batch embedding worker: {e}")
                        vec = self._fallback.embed_text(texts[u_idx])
                    results.append((u_idx, vec))

        results.sort(key=lambda x: x[0])
        return [r[1] for r in results]


class LocalFallbackEmbeddingProvider(BaseEmbeddingProvider):
    """
    Zero-network local fallback embedding provider.
    Computes deterministic 768-dimensional normalized term-hash vectors.
    Ensures that semantic text overlap produces high cosine similarity.
    """
    STOPWORDS = {
        "what", "about", "the", "who", "is", "are", "tell", "me", "show", "how",
        "much", "many", "for", "with", "from", "and", "or", "in", "of", "to", "a",
        "an", "this", "that", "these", "those"
    }

    def __init__(self, dim: int = RAG_EMBEDDING_DIM):
        self.dim = dim

    @property
    def dimension(self) -> int:
        return self.dim

    def embed_text(self, text: str) -> List[float]:
        vec = [0.0] * self.dim
        raw_tokens = [t.lower().strip(".,;:!?()[]\"'") for t in text.split() if len(t.strip()) > 1]
        tokens = [t for t in raw_tokens if t not in self.STOPWORDS]
        if not tokens:
            return vec

        for word in tokens:
            # Hash word into bucket
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dim
            sign = 1.0 if (h >> 16) % 2 == 0 else -1.0
            vec[idx] += sign

        # L2 Normalize vector
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return [self.embed_text(t) for t in texts]


def get_embedding_provider() -> BaseEmbeddingProvider:
    provider_name = RAG_EMBEDDING_PROVIDER.lower().strip()
    if provider_name == "gemini":
        return GeminiEmbeddingProvider()
    elif provider_name == "local":
        return LocalFallbackEmbeddingProvider()
    return GeminiEmbeddingProvider()
