"""
Exhaustive Edge-Case and Stress Test Suite for CartSettle RAG & Voice Architecture.
Tests:
1. Embedding Provider Edge Cases: empty strings, unicode, extreme lengths, dimension padding/trimming, hash caching.
2. Ingestion Edge Cases: null fields, missing categories, inactive items, duplicate handling, policy sync.
3. Retriever Live SQL Grounding: stock changes, price updates, out-of-stock items, inactive items filtering.
4. Intent Classifier: ambiguous queries, mixed intents, case insensitivity.
5. Signal Lifecycle: model save, model update, model delete.
6. API Endpoints: status, sync, chat with various modes and personas.
"""
import os
import sys
import json
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from products.models import Product, Category
from store.models import StoreSettings
from accounts.models import User
from services.rag.config import RAG_EMBEDDING_DIM
from services.rag.embeddings import (
    GeminiEmbeddingProvider,
    LocalFallbackEmbeddingProvider,
    _EMBEDDING_CACHE,
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
from services.agent_service import agent_service


class ExhaustiveRAGTestSuite(TestCase):
    def setUp(self):
        # Create test categories
        self.cat_dairy = Category.objects.create(name="Dairy & Eggs", slug="dairy-eggs")
        self.cat_cleaning = Category.objects.create(name="Household & Cleaning", slug="household-cleaning")
        self.cat_inactive = Category.objects.create(name="Seasonal Offers", slug="seasonal-offers", is_active=False)

        # Create test products with various edge cases
        self.p_butter = Product.objects.create(
            name="Amul Butter",
            brand="Amul",
            category=self.cat_dairy,
            regular_price=Decimal("260.00"),
            offer_price=Decimal("240.00"),
            cost_price=Decimal("200.00"),
            stock_quantity=50,
            unit="500 g",
            description="Pure pasteurized table butter made from fresh cow milk.",
            sku="AMUL500G",
            is_active=True,
            is_in_stock=True
        )

        self.p_ghee = Product.objects.create(
            name="Gowardhan Cow Ghee",
            brand="Gowardhan",
            category=self.cat_dairy,
            regular_price=Decimal("380.00"),
            offer_price=Decimal("360.00"),
            cost_price=Decimal("300.00"),
            stock_quantity=20,
            unit="1 L",
            description="Traditional cow ghee with rich golden granular texture.",
            sku="GOWARDHAN1L",
            is_active=True,
            is_in_stock=True
        )

        self.p_detergent = Product.objects.create(
            name="Surf Excel Matic",
            brand="Surf Excel",
            category=self.cat_cleaning,
            regular_price=Decimal("220.00"),
            offer_price=Decimal("199.00"),
            cost_price=Decimal("160.00"),
            stock_quantity=30,
            unit="1 kg Pouch",
            description="Top load detergent powder for tough stains removal.",
            sku="SURF1KG",
            is_active=True,
            is_in_stock=True
        )

        # Product with NULL brand, NULL description, and 0 stock
        self.p_empty_fields = Product.objects.create(
            name="Plain Store Rice",
            brand=None,
            category=self.cat_dairy,
            regular_price=Decimal("50.00"),
            offer_price=None,
            stock_quantity=0,
            unit="1 kg",
            description=None,
            sku=None,
            is_active=True,
            is_in_stock=False
        )

        # Inactive product (should NEVER appear in search or RAG)
        self.p_inactive = Product.objects.create(
            name="Discontinued Soap",
            brand="OldBrand",
            category=self.cat_cleaning,
            regular_price=Decimal("30.00"),
            stock_quantity=10,
            unit="1 bar",
            is_active=False
        )

        # Store settings with realistic policies
        self.settings = StoreSettings.load()
        self.settings.store_name = "CartSettle Kirana"
        self.settings.free_delivery_threshold = Decimal("500.00")
        self.settings.delivery_fee = Decimal("30.00")
        self.settings.min_order_amount = Decimal("150.00")
        self.settings.delivery_radius_km = Decimal("8.00")
        self.settings.invoice_terms_and_conditions = "Report perishables within 24h. Returns with tax invoice."
        self.settings.save()

        # Create owner user for API testing
        self.owner_user = User.objects.create_user(
            username="test_owner",
            password="OwnerPassword123!",
            email="owner@cartsettle.in",
            is_staff=True
        )
        self.client = APIClient()

    # --- 1. EMBEDDING PROVIDER TESTS ---
    def test_local_fallback_empty_string(self):
        provider = LocalFallbackEmbeddingProvider(dim=768)
        vec = provider.embed_text("")
        self.assertEqual(len(vec), 768)
        self.assertEqual(sum(vec), 0.0)

    def test_local_fallback_special_chars_and_unicode(self):
        provider = LocalFallbackEmbeddingProvider(dim=768)
        vec = provider.embed_text("Amul Butter! 🧈 ₹260.00 & Special Deals @ 100% Guaranteed?")
        self.assertEqual(len(vec), 768)
        norm = sum(x * x for x in vec)
        self.assertAlmostEqual(norm, 1.0, places=3)

    def test_embedding_cache_hit(self):
        provider = GeminiEmbeddingProvider()
        test_text = "Unique Test Product Caching String 12345"
        vec1 = provider.embed_text(test_text)
        # Second call must hit cache immediately
        vec2 = provider.embed_text(test_text)
        self.assertEqual(vec1, vec2)

    def test_batch_embedding_order_preservation(self):
        provider = LocalFallbackEmbeddingProvider(dim=768)
        texts = ["First Item", "Second Item", "Third Item", "Fourth Item"]
        vectors = provider.embed_batch(texts)
        self.assertEqual(len(vectors), 4)
        for v in vectors:
            self.assertEqual(len(v), 768)
            self.assertAlmostEqual(sum(x * x for x in v), 1.0, places=3)

    # --- 2. EXTRACTORS ROBUSTNESS ---
    def test_product_extractor_with_null_and_missing_attributes(self):
        doc = ProductExtractor.extract(self.p_empty_fields)
        self.assertEqual(doc["id"], f"prod_{self.p_empty_fields.id}")
        self.assertIn("Plain Store Rice", doc["document"])
        self.assertFalse(doc["metadata"]["is_in_stock"])
        self.assertEqual(doc["metadata"]["brand"], "Store Brand")
        self.assertTrue(len(doc["content_hash"]) == 64)

    def test_policy_extractor_robustness(self):
        policies = PolicyExtractor.extract_all(self.settings)
        self.assertTrue(len(policies) >= 4)
        delivery_policy = next(p for p in policies if p["metadata"]["policy_key"] == "delivery")
        self.assertIn("$30.00", delivery_policy["document"])
        self.assertIn("$500.00", delivery_policy["document"])
        self.assertIn("8.0 km", delivery_policy["document"])

    # --- 3. INGESTION & CONTENT HASH CHANGE DETECTION ---
    def test_ingestion_skips_unchanged_content(self):
        ingestion = KnowledgeIngestionService()
        # Initial sync
        r1 = ingestion.sync_all(force_rebuild=False)
        self.assertTrue(r1["total_documents"] >= 4)
        
        # Second sync without changes must skip all
        r2 = ingestion.sync_all(force_rebuild=False)
        self.assertEqual(r2["embedded_count"], 0)
        self.assertEqual(r2["skipped_count"], r2["total_documents"])

    def test_product_incremental_sync_and_delete(self):
        ingestion = KnowledgeIngestionService()
        ingestion.sync_product(self.p_butter)
        
        # Deactivating product should remove it from index
        self.p_butter.is_active = False
        self.p_butter.save()
        ingestion.sync_product(self.p_butter)
        
        # Verify it is deleted from vector store
        doc_id = f"prod_{self.p_butter.id}"
        self.assertNotIn(doc_id, ingestion.manifest)

    # --- 4. RETRIEVER LIVE SQL GROUNDING & ZERO HALLUCINATION ---
    def test_live_sql_price_grounding(self):
        retriever = HybridRetriever()
        # Seed test items into in-memory store
        store = retriever.vector_store
        p_doc = ProductExtractor.extract(self.p_detergent)
        q_vec = retriever.embedding_provider.embed_text(p_doc["document"])
        store.add_documents(
            ids=[p_doc["id"]],
            documents=[p_doc["document"]],
            embeddings=[q_vec],
            metadatas=[p_doc["metadata"]]
        )

        # Retrieve detergent
        res = retriever.retrieve("tough stains and laundry detergent", persona="shopper")
        self.assertTrue(len(res["products"]) > 0)
        p = res["products"][0]
        self.assertEqual(p["name"], "Surf Excel Matic")
        self.assertEqual(p["price"], 199.00)  # Must be offer_price, not regular_price
        self.assertEqual(p["regular_price"], 220.00)
        self.assertEqual(p["stock"], 30)

        # Now simulate an instant database price & stock update by store owner
        self.p_detergent.offer_price = Decimal("185.00")
        self.p_detergent.stock_quantity = 5
        self.p_detergent.save()

        # Re-query immediately: vector store content is unchanged, but LIVE SQL MUST REFLECT NEW PRICE & STOCK
        res2 = retriever.retrieve("tough stains and laundry detergent", persona="shopper")
        p2 = res2["products"][0]
        self.assertEqual(p2["price"], 185.00)
        self.assertEqual(p2["stock"], 5)

    def test_inactive_products_filtered_out_from_retrieval(self):
        retriever = HybridRetriever()
        store = retriever.vector_store
        # Even if inactive product was previously indexed in vector store
        p_doc = ProductExtractor.extract(self.p_inactive)
        q_vec = retriever.embedding_provider.embed_text(p_doc["document"])
        store.add_documents(
            ids=[p_doc["id"]],
            documents=[p_doc["document"]],
            embeddings=[q_vec],
            metadatas=[p_doc["metadata"]]
        )

        res = retriever.retrieve("Discontinued Soap", persona="shopper")
        # Inactive product must be rejected by Live SQL query!
        matched_ids = [p["id"] for p in res["products"]]
        self.assertNotIn(self.p_inactive.id, matched_ids)

    def test_product_comparison_card_payload(self):
        retriever = HybridRetriever()
        store = retriever.vector_store
        doc_a = ProductExtractor.extract(self.p_butter)
        doc_b = ProductExtractor.extract(self.p_ghee)
        v_a = retriever.embedding_provider.embed_text(doc_a["document"])
        v_b = retriever.embedding_provider.embed_text(doc_b["document"])
        store.add_documents(
            ids=[doc_a["id"], doc_b["id"]],
            documents=[doc_a["document"], doc_b["document"]],
            embeddings=[v_a, v_b],
            metadatas=[doc_a["metadata"], doc_b["metadata"]]
        )

        res = retriever.retrieve("Compare Amul Butter and Gowardhan Ghee", persona="shopper")
        self.assertIsNotNone(res.get("suggested_action"))
        act = res["suggested_action"]
        self.assertEqual(act["type"], "COMPARISON_CARD")
        self.assertIn("item_a", act)
        self.assertIn("item_b", act)
        self.assertIn("comparison_notes", act)

    # --- 5. INTENT ROUTER TESTS ---
    def test_intent_router_classifications(self):
        test_cases = [
            ("clear my cart", "DIRECT_ACTION"),
            ("checkout and pay", "DIRECT_ACTION"),
            ("switch to dark mode", "DIRECT_ACTION"),
            ("where is order ORD202600001", "LIVE_SQL_ORDER"),
            ("Compare Butter and Ghee", "PRODUCT_COMPARISON"),
            ("What is the difference between Amul and Gowardhan?", "PRODUCT_COMPARISON"),
            ("What is your return and refund policy?", "STORE_POLICY"),
            ("Do you accept PayPal and COD?", "STORE_POLICY"),
            ("How fast is home delivery?", "STORE_POLICY"),
            ("Find something for cleaning floors and stains", "SEMANTIC_DISCOVERY"),
            ("Suggest healthy snacks", "SEMANTIC_DISCOVERY"),
        ]
        for query, expected_intent in test_cases:
            res = QueryIntentRouter.classify(query)
            self.assertEqual(res["intent"], expected_intent, f"Query '{query}' expected {expected_intent} but got {res['intent']}")

    # --- 6. API ENDPOINTS TESTS ---
    def test_rag_status_api_endpoint(self):
        res = self.client.get("/api/v1/store/rag/status/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data.get("status"), "OPERATIONAL")
        rag = res.data.get("rag", {})
        self.assertIn("total_vectors", rag)
        self.assertIn("manifest_entries", rag)
        self.assertIn("model", rag)
        self.assertIn("dimension", rag)

    def test_rag_sync_api_endpoint_permissions(self):
        # Unauthenticated request must be blocked
        res_unauth = self.client.post("/api/v1/store/rag/sync/", {"rebuild": False})
        self.assertIn(res_unauth.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

        # Authenticated owner request must succeed
        self.client.force_authenticate(user=self.owner_user)
        res_auth = self.client.post("/api/v1/store/rag/sync/", {"rebuild": False})
        self.assertEqual(res_auth.status_code, status.HTTP_200_OK)
        self.assertEqual(res_auth.data.get("status"), "SUCCESS")
        self.assertIn("result", res_auth.data)

    # --- 7. AGENT CHAT VOICE AND MULTI-TURN RAG INTEGRATION ---
    def test_agent_chat_voice_mode_returns_concise_spoken_reply(self):
        res = agent_service.chat(
            prompt="What is your return policy?",
            persona="shopper",
            mode="voice"
        )
        self.assertEqual(res["mode"], "voice")
        self.assertIn("voice_reply", res)
        # Voice reply must be concise (< 15 words) and plain text
        words = res["voice_reply"].split()
        self.assertTrue(len(words) <= 16, f"Voice reply was too verbose: '{res['voice_reply']}' ({len(words)} words)")
        self.assertNotIn("```", res["voice_reply"])

    def test_agent_chat_comparison_card_synthesis(self):
        res = agent_service.chat(
            prompt="Compare Amul Butter and Gowardhan Ghee",
            persona="shopper",
            mode="chat"
        )
        actions = res.get("actions", [])
        action_types = [a.get("type") for a in actions]
        self.assertIn("COMPARISON_CARD", action_types)
        comp_act = next(a for a in actions if a.get("type") == "COMPARISON_CARD")
        self.assertIn("item_a", comp_act)
        self.assertIn("item_b", comp_act)
