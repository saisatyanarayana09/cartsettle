"""
Knowledge Ingestion Pipeline for CartSettle Hybrid RAG.
Features:
- SHA-256 Content Hashing to skip unchanged entities (Zero Redundant API Costs).
- Batch processing with rate-limit and retry safety.
- Incremental synchronization via Django model signals.
- In-memory and persistent hash manifest.
"""
import os
import json
import time
import logging
from typing import Dict, Any, List, Optional
from django.conf import settings
from .config import RAG_DATA_DIR, RAG_EMBEDDING_BATCH_SIZE, RAG_EMBEDDING_MODEL, RAG_EMBEDDING_DIM
from .embeddings import get_embedding_provider
from .vector_store import get_vector_store
from .extractors import ProductExtractor, CategoryExtractor, PolicyExtractor, FAQExtractor

logger = logging.getLogger(__name__)

MANIFEST_FILE = os.path.join(RAG_DATA_DIR, "rag_manifest.json")


class KnowledgeIngestionService:
    def __init__(self):
        self.embedding_provider = get_embedding_provider()
        self.vector_store = get_vector_store()
        self.manifest = self._load_manifest()

    def _load_manifest(self) -> Dict[str, str]:
        if os.path.exists(MANIFEST_FILE):
            try:
                with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not read RAG manifest ({e}), starting fresh.")
        return {}

    def _save_manifest(self) -> None:
        try:
            os.makedirs(os.path.dirname(MANIFEST_FILE), exist_ok=True)
            with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
                json.dump(self.manifest, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not save RAG manifest: {e}")

    def sync_all(self, force_rebuild: bool = False) -> Dict[str, Any]:
        """
        Synchronizes all products, categories, store policies, and FAQs into the vector store.
        Skips documents whose SHA-256 content hash has not changed.
        """
        from products.models import Product, Category
        from store.models import StoreSettings

        t0 = time.perf_counter()
        if force_rebuild:
            logger.info("Force rebuild requested. Clearing vector store and manifest...")
            self.vector_store.clear()
            self.manifest.clear()

        all_docs = []

        # 1. Extract Products
        for p in Product.objects.filter(is_active=True).select_related("category"):
            all_docs.append(ProductExtractor.extract(p))

        # 2. Extract Categories
        for c in Category.objects.filter(is_active=True):
            all_docs.append(CategoryExtractor.extract(c))

        # 3. Extract Policies
        try:
            settings_obj = StoreSettings.load()
            all_docs.extend(PolicyExtractor.extract_all(settings_obj))
        except Exception as e:
            logger.warning(f"Could not extract store settings: {e}")

        # 4. Extract FAQs
        all_docs.extend(FAQExtractor.get_standard_faqs())

        total_extracted = len(all_docs)
        docs_to_embed = []
        skipped_count = 0

        for d in all_docs:
            doc_id = d["id"]
            c_hash = d["content_hash"]
            if not force_rebuild and self.manifest.get(doc_id) == c_hash:
                skipped_count += 1
            else:
                docs_to_embed.append(d)

        embedded_count = 0
        batch_size = max(1, RAG_EMBEDDING_BATCH_SIZE)

        for i in range(0, len(docs_to_embed), batch_size):
            chunk = docs_to_embed[i : i + batch_size]
            texts = [c["document"] for c in chunk]
            ids = [c["id"] for c in chunk]
            metas = [c["metadata"] for c in chunk]

            # Generate embeddings
            vectors = self.embedding_provider.embed_batch(texts)

            # Store in Vector Store
            self.vector_store.add_documents(
                ids=ids,
                documents=texts,
                embeddings=vectors,
                metadatas=metas,
            )

            # Update manifest
            for c in chunk:
                self.manifest[c["id"]] = c["content_hash"]
            embedded_count += len(chunk)

        self._save_manifest()
        duration_ms = int((time.perf_counter() - t0) * 1000)

        res = {
            "total_documents": total_extracted,
            "embedded_count": embedded_count,
            "skipped_count": skipped_count,
            "duration_ms": duration_ms,
            "vector_store_count": self.vector_store.count(),
            "model": RAG_EMBEDDING_MODEL,
            "dimension": RAG_EMBEDDING_DIM,
        }
        logger.info(f"RAG Sync completed: {res}")
        return res

    def sync_product(self, product) -> bool:
        """Incrementally syncs a single product upon create or update."""
        if not product.is_active:
            self.delete_product(product.id)
            return True

        doc = ProductExtractor.extract(product)
        doc_id = doc["id"]
        c_hash = doc["content_hash"]

        if self.manifest.get(doc_id) == c_hash:
            return False  # Unchanged, skip embedding!

        vec = self.embedding_provider.embed_text(doc["document"])
        self.vector_store.add_documents(
            ids=[doc_id],
            documents=[doc["document"]],
            embeddings=[vec],
            metadatas=[doc["metadata"]],
        )
        self.manifest[doc_id] = c_hash
        self._save_manifest()
        return True

    def delete_product(self, product_id: int) -> bool:
        """Removes a deleted product from the vector store."""
        doc_id = f"prod_{product_id}"
        self.vector_store.delete_documents([doc_id])
        if doc_id in self.manifest:
            del self.manifest[doc_id]
            self._save_manifest()
        return True

    def sync_policies(self) -> int:
        """Re-syncs store policies when StoreSettings is saved."""
        from store.models import StoreSettings
        try:
            settings_obj = StoreSettings.load()
            docs = PolicyExtractor.extract_all(settings_obj)
            count = 0
            for d in docs:
                if self.manifest.get(d["id"]) != d["content_hash"]:
                    vec = self.embedding_provider.embed_text(d["document"])
                    self.vector_store.add_documents(
                        ids=[d["id"]],
                        documents=[d["document"]],
                        embeddings=[vec],
                        metadatas=[d["metadata"]],
                    )
                    self.manifest[d["id"]] = d["content_hash"]
                    count += 1
            if count > 0:
                self._save_manifest()
            return count
        except Exception as e:
            logger.warning(f"Could not sync policies: {e}")
            return 0

    def get_status(self) -> Dict[str, Any]:
        return {
            "total_vectors": self.vector_store.count(),
            "manifest_entries": len(self.manifest),
            "model": RAG_EMBEDDING_MODEL,
            "dimension": RAG_EMBEDDING_DIM,
            "data_directory": RAG_DATA_DIR,
        }


_INGESTION_SERVICE_INSTANCE: Optional[KnowledgeIngestionService] = None


def get_ingestion_service() -> KnowledgeIngestionService:
    global _INGESTION_SERVICE_INSTANCE
    if _INGESTION_SERVICE_INSTANCE is None:
        _INGESTION_SERVICE_INSTANCE = KnowledgeIngestionService()
    return _INGESTION_SERVICE_INSTANCE
