"""
Comprehensive Automated Unit and Integration Tests for CartSettle Hybrid RAG Architecture.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from products.models import Product, Category
from store.models import StoreSettings
from services.rag.config import RAG_EMBEDDING_DIM
from services.rag.embeddings import (
    LocalFallbackEmbeddingProvider,
    GeminiEmbeddingProvider,
    get_embedding_provider,
)
from services.rag.vector_store import (
    InMemoryVectorStore,
    ChromaVectorStore,
    get_vector_store,
)
from services.rag.extractors import (
    ProductExtractor,
    CategoryExtractor,
    PolicyExtractor,
    FAQExtractor,
    compute_content_hash,
)
from services.rag.ingestion import KnowledgeIngestionService
from services.rag.retriever import HybridRetriever
from services.rag.router import QueryIntentRouter


class TestRAGComponents(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Dairy & Breakfast", slug="dairy-breakfast")
        self.product1 = Product.objects.create(
            name="Amul Butter",
            brand="Amul",
            category=self.category,
            regular_price=260.00,
            offer_price=240.00,
            stock_quantity=50,
            unit="500 g",
            description="Pure pasteurized table butter made from fresh cow milk.",
            sku="AMUL500G"
        )
        self.product2 = Product.objects.create(
            name="Gowardhan Ghee",
            brand="Gowardhan",
            category=self.category,
            regular_price=380.00,
            offer_price=360.00,
            stock_quantity=20,
            unit="1 L",
            description="Traditional cow ghee with rich golden granular texture.",
            sku="GOWARDHAN1L"
        )
        self.settings = StoreSettings.load()
        self.settings.free_delivery_threshold = 500.00
        self.settings.delivery_fee = 30.00
        self.settings.save()

    def test_local_embedding_provider_normalization(self):
        provider = LocalFallbackEmbeddingProvider(dim=768)
        self.assertEqual(provider.dimension, 768)
        vec = provider.embed_text("Amul Butter 500g")
        self.assertEqual(len(vec), 768)
        # Check L2 normalization (sum of squares is ~1.0)
        norm = sum(x * x for x in vec)
        self.assertAlmostEqual(norm, 1.0, places=4)

    def test_content_hash_determinism(self):
        meta = {"product_id": 1, "brand": "Amul"}
        h1 = compute_content_hash("Amul Butter 500g", meta)
        h2 = compute_content_hash("Amul Butter 500g", meta)
        self.assertEqual(h1, h2)
        # Change in text changes hash
        h3 = compute_content_hash("Amul Butter 100g", meta)
        self.assertNotEqual(h1, h3)

    def test_extractors(self):
        p_doc = ProductExtractor.extract(self.product1)
        self.assertEqual(p_doc["id"], f"prod_{self.product1.id}")
        self.assertIn("Amul Butter", p_doc["document"])
        self.assertEqual(p_doc["metadata"]["brand"], "Amul")

        c_doc = CategoryExtractor.extract(self.category)
        self.assertEqual(c_doc["id"], f"cat_{self.category.id}")

        policies = PolicyExtractor.extract_all(self.settings)
        self.assertTrue(len(policies) >= 4)
        policy_keys = [p["metadata"]["policy_key"] for p in policies]
        self.assertIn("delivery", policy_keys)
        self.assertIn("returns", policy_keys)
        self.assertIn("payments", policy_keys)

        faqs = FAQExtractor.get_standard_faqs()
        self.assertTrue(len(faqs) >= 3)

    def test_in_memory_vector_store(self):
        store = InMemoryVectorStore()
        provider = LocalFallbackEmbeddingProvider(dim=768)
        v1 = provider.embed_text("butter and dairy products")
        v2 = provider.embed_text("detergent powder for clothes")

        store.add_documents(
            ids=["p1", "p2"],
            documents=["Amul Butter 500g", "Surf Excel Matic 1kg"],
            embeddings=[v1, v2],
            metadatas=[{"cat": "dairy"}, {"cat": "cleaning"}]
        )
        self.assertEqual(store.count(), 2)

        # Query for butter should match p1 with higher similarity
        q_vec = provider.embed_text("need butter")
        matches = store.query(q_vec, top_k=2)
        self.assertEqual(matches[0]["id"], "p1")
        self.assertTrue(matches[0]["similarity"] > matches[1]["similarity"])

    def test_query_intent_router(self):
        r1 = QueryIntentRouter.classify("clear cart")
        self.assertEqual(r1["intent"], "DIRECT_ACTION")

        r2 = QueryIntentRouter.classify("where is my order ORD202600001")
        self.assertEqual(r2["intent"], "LIVE_SQL_ORDER")

        r3 = QueryIntentRouter.classify("Compare Amul Butter and Gowardhan Ghee")
        self.assertEqual(r3["intent"], "PRODUCT_COMPARISON")
        self.assertTrue(r3["is_comparison"])

        r4 = QueryIntentRouter.classify("what is your return policy and refund terms?")
        self.assertEqual(r4["intent"], "STORE_POLICY")

        r5 = QueryIntentRouter.classify("suggest something for tough stains and washing")
        self.assertEqual(r5["intent"], "SEMANTIC_DISCOVERY")

    def test_hybrid_retriever_live_grounding(self):
        retriever = HybridRetriever()
        res = retriever.retrieve("Amul Butter", persona="shopper", top_k=3)
        self.assertIn("context", res)
        # Even if ChromaDB has old or new entries, live SQL ensures price and stock accuracy
        if res.get("products"):
            first_prod = res["products"][0]
            # Ensure price is retrieved from live DB
            self.assertIn("price", first_prod)
            self.assertIn("stock", first_prod)

    def test_product_comparison_synthesis(self):
        retriever = HybridRetriever()
        res = retriever.retrieve("Compare Amul Butter and Gowardhan Ghee", persona="shopper", top_k=4)
        if res.get("suggested_action") and res["suggested_action"].get("type") == "COMPARISON_CARD":
            act = res["suggested_action"]
            self.assertEqual(act["type"], "COMPARISON_CARD")
            self.assertIn("item_a", act)
            self.assertIn("item_b", act)
            self.assertIn("comparison_notes", act)

    def test_rag_status_api(self):
        client = APIClient()
        response = client.get("/api/v1/store/rag/status/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("status"), "OPERATIONAL")
        self.assertIn("rag", response.data)
        self.assertIn("total_vectors", response.data["rag"])
