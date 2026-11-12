"""
CartSettle Hybrid RAG & Knowledge Retrieval Package.
Enterprise-grade semantic retrieval augmented with live SQL database grounding.
"""
from .ingestion import get_ingestion_service
from .retriever import get_retriever
from .router import QueryIntentRouter
from .signals import connect_rag_signals


def sync_knowledge_index(force_rebuild: bool = False):
    """Syncs all store entities into the vector index with SHA-256 change detection."""
    return get_ingestion_service().sync_all(force_rebuild=force_rebuild)


def hybrid_retrieve(query: str, persona: str = "shopper", top_k: int = 6):
    """Retrieves semantically matching knowledge grounded with live SQL inventory."""
    return get_retriever().retrieve(query=query, persona=persona, top_k=top_k)


__all__ = [
    "get_ingestion_service",
    "get_retriever",
    "QueryIntentRouter",
    "connect_rag_signals",
    "sync_knowledge_index",
    "hybrid_retrieve",
]
