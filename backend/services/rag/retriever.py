"""
Hybrid Semantic Retriever for CartSettle.
Combines Vector Similarity Search with Live SQL Database Grounding.
Guarantees:
- Semantic discovery for natural language concepts ("tough stains", "sensitive skin", "healthy snacks").
- Live database queries as the absolute source of truth for prices, active discounts, stock, and images.
- Synthesis of interactive card payloads (SEARCH_RESULTS, COMPARISON_CARD).
"""
import re
import logging
from typing import Dict, Any, List, Optional
from decimal import Decimal
from .config import RAG_SIMILARITY_THRESHOLD, RAG_TOP_K
from .embeddings import get_embedding_provider
from .vector_store import get_vector_store
from .router import QueryIntentRouter

logger = logging.getLogger(__name__)


class HybridRetriever:
    def __init__(self):
        self.embedding_provider = get_embedding_provider()
        self.vector_store = get_vector_store()

    def retrieve(
        self,
        query: str,
        persona: str = "shopper",
        top_k: int = RAG_TOP_K,
        similarity_threshold: float = RAG_SIMILARITY_THRESHOLD,
    ) -> Dict[str, Any]:
        """
        Executes semantic vector retrieval, performs live SQL joins on matching products,
        and constructs a factual grounded context block alongside UI action cards.
        """
        from products.models import Product
        from services.agent_service import AgentTools

        cleaned_query = query.strip()
        if not cleaned_query:
            return {"context": "", "products": [], "policies": [], "suggested_action": None, "matches_count": 0}

        # 0. Intent Classification for Guardrails & Routing
        intent_info = QueryIntentRouter.classify(cleaned_query)
        intent = intent_info.get("intent", "GENERAL")

        if intent in ("OUT_OF_SCOPE", "CUSTOMER_INQUIRY"):
            return {
                "context": "",
                "products": [],
                "policies": [],
                "faqs": [],
                "suggested_action": None,
                "matches_count": 0,
                "intent": intent,
            }

        # 1. Embed query
        query_vector = self.embedding_provider.embed_text(cleaned_query)
        if not any(query_vector):
            return {
                "context": "",
                "products": [],
                "policies": [],
                "faqs": [],
                "suggested_action": None,
                "matches_count": 0,
                "intent": intent,
            }

        # 2. Query Vector Store
        matches = self.vector_store.query(query_vector=query_vector, top_k=top_k)

        # 3. Filter by similarity threshold
        def _get_threshold(m):
            stype = m.get("metadata", {}).get("source_type")
            if intent == "STORE_POLICY" and stype in ("policy", "faq"):
                return 0.50
            return similarity_threshold

        accepted_matches = [m for m in matches if m.get("similarity", 0) >= _get_threshold(m)]

        product_ids = []
        policy_texts = []
        faq_texts = []

        for m in accepted_matches:
            meta = m.get("metadata", {})
            stype = meta.get("source_type")
            # Strictly suppress product collection if intent is policy-specific
            if stype == "product" and intent != "STORE_POLICY":
                pid = meta.get("product_id")
                if pid:
                    try:
                        product_ids.append(int(pid))
                    except (ValueError, TypeError):
                        pass
            elif stype == "policy":
                policy_texts.append(m.get("document", ""))
            elif stype == "faq":
                faq_texts.append(m.get("document", ""))

        if any(w in cleaned_query.lower() for w in ["return", "refund", "exchange"]):
            policy_texts.sort(key=lambda t: 0 if ("return" in t.lower() or "refund" in t.lower()) else 1)

        # 4. LIVE SQL ENRICHMENT (Source of Truth for Inventory & Prices)
        live_products_map = {}
        if product_ids:
            qs = Product.objects.filter(id__in=product_ids, is_active=True).select_related("category")
            for p in qs:
                live_products_map[p.id] = p

        ordered_live_products = []
        for pid in product_ids:
            if pid in live_products_map and pid not in [x.id for x in ordered_live_products]:
                ordered_live_products.append(live_products_map[pid])

        # 5. Build Serialized Card Products
        card_products = []
        for p in ordered_live_products:
            card_products.append(AgentTools.serialize_card_product(p))

        # 6. Format Grounded Context for LLM
        context_lines = []
        if ordered_live_products:
            context_lines.append("VERIFIED IN-STOCK PRODUCTS FROM LIVE DATABASE:")
            for p in ordered_live_products[:6]:
                selling = float(p.offer_price or p.regular_price)
                mrp = float(p.regular_price)
                stock_status = f"{p.stock_quantity} units in stock" if p.stock_quantity > 0 else "OUT OF STOCK"
                cat = p.category.name if p.category else "General"
                context_lines.append(
                    f"- {p.name} ({p.unit}): Selling Price ₹{selling:.2f} (MRP ₹{mrp:.2f}) | {stock_status} | Category: {cat}"
                )

        if policy_texts:
            context_lines.append("VERIFIED STORE POLICIES:")
            for pol in policy_texts[:3]:
                context_lines.append(f"- {pol}")

        if faq_texts:
            context_lines.append("VERIFIED STORE FAQS:")
            for faq in faq_texts[:2]:
                context_lines.append(f"- {faq}")

        grounded_context = "\n".join(context_lines)

        # 7. Identify Comparison or Discovery Action
        suggested_action = None
        lower_q = cleaned_query.lower()
        is_comparison = intent_info.get("is_comparison") or bool(re.search(r"\b(compare|difference between|versus|vs|better than)\b", lower_q))

        if is_comparison and len(card_products) >= 2:
            p1 = card_products[0]
            p2 = card_products[1]
            suggested_action = {
                "type": "COMPARISON_CARD",
                "item_a": p1,
                "item_b": p2,
                "comparison_notes": f"Comparing {p1['name']} (${p1['price']:.2f}) vs {p2['name']} (${p2['price']:.2f}). Both are genuine packaged retail goods.",
            }
        elif (
            len(card_products) > 0
            and not is_comparison
            and intent not in ("STORE_POLICY", "LIVE_SQL_ORDER", "DIRECT_ACTION", "OUT_OF_SCOPE")
        ):
            suggested_action = {
                "type": "SEARCH_RESULTS",
                "items": card_products[:4],
                "query": cleaned_query,
            }

        return {
            "context": grounded_context,
            "products": card_products,
            "policies": policy_texts,
            "faqs": faq_texts,
            "suggested_action": suggested_action,
            "matches_count": len(accepted_matches),
        }


_RETRIEVER_INSTANCE: Optional[HybridRetriever] = None


def get_retriever() -> HybridRetriever:
    global _RETRIEVER_INSTANCE
    if _RETRIEVER_INSTANCE is None:
        _RETRIEVER_INSTANCE = HybridRetriever()
    return _RETRIEVER_INSTANCE
