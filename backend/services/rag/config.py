"""
RAG Configuration Module
Reads settings from Django settings and environment variables with safe defaults.
"""
import os
from django.conf import settings

# Base directory for local persistent ChromaDB vector store
RAG_DATA_DIR = getattr(
    settings,
    "RAG_DATA_DIR",
    os.path.join(settings.BASE_DIR, "rag_store")
)

# Embedding Provider Configuration
RAG_EMBEDDING_PROVIDER = getattr(settings, "RAG_EMBEDDING_PROVIDER", os.getenv("RAG_EMBEDDING_PROVIDER", "local"))
RAG_EMBEDDING_MODEL = getattr(settings, "RAG_EMBEDDING_MODEL", os.getenv("RAG_EMBEDDING_MODEL", "gemini-embedding-001"))
RAG_EMBEDDING_DIM = int(getattr(settings, "RAG_EMBEDDING_DIM", os.getenv("RAG_EMBEDDING_DIM", "768")))

# Vector Store Configuration
RAG_VECTOR_STORE = getattr(settings, "RAG_VECTOR_STORE", os.getenv("RAG_VECTOR_STORE", "chroma"))
RAG_COLLECTION_NAME = getattr(settings, "RAG_COLLECTION_NAME", os.getenv("RAG_COLLECTION_NAME", "cartsettle_knowledge"))

# Retrieval Thresholds
RAG_SIMILARITY_THRESHOLD = float(getattr(settings, "RAG_SIMILARITY_THRESHOLD", os.getenv("RAG_SIMILARITY_THRESHOLD", "0.65")))
RAG_TOP_K = int(getattr(settings, "RAG_TOP_K", os.getenv("RAG_TOP_K", "6")))

# Caching & Rate Limiting
RAG_CACHE_EMBEDDINGS = getattr(settings, "RAG_CACHE_EMBEDDINGS", True)
RAG_EMBEDDING_BATCH_SIZE = int(getattr(settings, "RAG_EMBEDDING_BATCH_SIZE", os.getenv("RAG_EMBEDDING_BATCH_SIZE", "20")))
RAG_REQUEST_TIMEOUT = float(getattr(settings, "RAG_REQUEST_TIMEOUT", 10.0))
