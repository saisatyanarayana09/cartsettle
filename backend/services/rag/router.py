"""
Intent Router for CartSettle AI.
Classifies user queries into optimal execution and retrieval routes:
1. DIRECT_ACTION: Immediate UI commands (clear cart, checkout, switch theme).
2. LIVE_SQL_ORDER: Real-time transactional order lookups.
3. PRODUCT_COMPARISON: Side-by-side product evaluation (triggers COMPARISON_CARD).
4. SEMANTIC_DISCOVERY: Conceptual or descriptive shopping searches (triggers Hybrid RAG).
5. STORE_POLICY: Store rules, timings, delivery, and refund inquiries.
6. GENERAL: Conversational inquiries or general knowledge.
"""
import re
from typing import Dict, Any


class QueryIntentRouter:
    @staticmethod
    def classify(query: str) -> Dict[str, Any]:
        q = (query or "").strip().lower()
        if not q:
            return {"intent": "GENERAL", "needs_rag": False, "is_comparison": False}

        # 0. Security Guardrail for Malicious Exploits
        if re.search(r"\b(hack|exploit|malware|virus|phishing|bypass access|ddos|cyberattack|illegal contraband)\b", q):
            return {"intent": "OUT_OF_SCOPE", "needs_rag": False, "is_comparison": False}

        # 1. Direct Actions
        if (
            re.search(r"\b(clear|empty|wipe)\b.*\bcart\b", q)
            or re.search(r"\b(checkout|place order|pay)\b", q)
            or re.search(r"\b(view|show|open|check)\b.*\bcart\b", q)
            or any(w == q for w in ["clear", "clear cart", "empty cart", "checkout", "pay", "view cart"])
        ):
            return {"intent": "DIRECT_ACTION", "needs_rag": False, "is_comparison": False}

        if re.search(r"\b(dark mode|light mode|theme|switch mode)\b", q):
            return {"intent": "DIRECT_ACTION", "needs_rag": False, "is_comparison": False}

        # 1B. Catalog Browsing & Category Overview
        if (
            re.search(r"\b(what products|all products|show products|browse products|what do you sell|what is in store|what's in store|what do you have|show me what you sell|list products|list of products|show items|show all items|browse store|browse catalog|store catalog)\b", q)
            or q in ["products", "catalog", "items", "all items", "what do you have"]
        ):
            return {"intent": "CATALOG_BROWSE", "needs_rag": False, "is_comparison": False}

        # 1C. Customer Profile & Account Inquiries (Zero RAG Grocery Retrieval)
        if (
            (
                re.search(r"\b(customer|shopper|user|profile|dossier|account details|who is customer|about customer|details of customer|what about the customer)\b", q)
                or re.search(r"\bwho\s+is\s+(?:the\s+)?([a-z0-9_\-.@ ]{2,50})\b", q)
                or re.search(r"\b(?:what\s+about|about|details\s+of)\s+(?:the\s+)?(sai|satyanarayana|rahul|priya|narendra|vikram|raju|testcustomer)\b", q)
                or re.search(r"\b(sai\s+satyanarayana|rahul\s+sharma|priya\s+sharma)\b", q)
            )
            and not any(w in q for w in ["support", "care", "service", "policy", "product", "item"])
        ):
            return {"intent": "CUSTOMER_INQUIRY", "needs_rag": False, "is_comparison": False}

        # 2. Live Order Tracking
        if re.search(r"\b(ord\d+\w*|where is my order|order status|track order)\b", q):
            return {"intent": "LIVE_SQL_ORDER", "needs_rag": False, "is_comparison": False}

        # 3. Product Comparison
        if re.search(r"\b(compare|difference between|versus|vs|better than|which one is better)\b", q):
            return {"intent": "PRODUCT_COMPARISON", "needs_rag": True, "is_comparison": True}

        # 4. Store Policies & FAQs
        if any(w in q for w in [
            "policy", "return", "refund", "delivery fee", "delivery time", "how fast",
            "shipping", "timing", "hours", "contact", "whatsapp", "paypal", "cod", "cash on delivery",
            "cancel order", "cancellation", "minimum order", "free delivery"
        ]):
            return {"intent": "STORE_POLICY", "needs_rag": True, "is_comparison": False}

        # 5. Semantic Product Discovery
        if any(w in q for w in [
            "recommend", "suggest", "find", "search", "show me", "looking for", "need something",
            "stain", "breakfast", "dinner", "snack", "healthy", "organic", "affordable", "cheap",
            "spicy", "sweet", "clean", "wash", "cook", "soap", "tea", "coffee", "milk", "oil"
        ]):
            return {"intent": "SEMANTIC_DISCOVERY", "needs_rag": True, "is_comparison": False}

        # Default: Enable RAG as additive intelligence to see if store facts are relevant
        return {"intent": "GENERAL", "needs_rag": True, "is_comparison": False}
