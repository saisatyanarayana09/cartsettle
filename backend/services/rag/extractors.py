"""
Knowledge Extractors for CartSettle Hybrid RAG.
Converts Django ORM entities (Products, Categories, StoreSettings, Policies, FAQs)
into standardized, token-efficient knowledge documents with SHA-256 change detection hashes.
"""
import hashlib
import json
from typing import Dict, Any, List
from django.conf import settings


def compute_content_hash(text: str, metadata: Dict[str, Any]) -> str:
    """Computes a deterministic SHA-256 hash of document text and metadata."""
    payload = json.dumps({"text": text.strip(), "meta": metadata}, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class ProductExtractor:
    @staticmethod
    def extract(product) -> Dict[str, Any]:
        cat_name = product.category.name if product.category else "Uncategorized"
        brand_name = product.brand or "Store Brand"
        unit_str = product.unit or "1 unit"
        desc = (product.description or "").strip()
        tags_str = product.tags or ""

        # Construct high-signal semantic text
        doc_parts = [
            f"Product: {product.name}",
            f"Brand: {brand_name}",
            f"Category: {cat_name}",
            f"Unit Size: {unit_str}",
        ]
        if desc:
            doc_parts.append(f"Description: {desc}")
        if tags_str:
            doc_parts.append(f"Tags & Attributes: {tags_str}")

        # Dietary and usage cues based on category/name
        name_lower = product.name.lower()
        if any(w in name_lower for w in ["atta", "flour", "rice", "dal", "salt", "sugar", "oil", "ghee"]):
            doc_parts.append("Type: Essential pantry staple for daily cooking and recipes.")
        elif any(w in name_lower for w in ["soap", "detergent", "cleaner", "harpic", "surf", "vim"]):
            doc_parts.append("Type: Household hygiene, fabric care, and surface cleaning product.")
        elif any(w in name_lower for w in ["biscuit", "noodle", "chips", "snack", "maggi", "chocolate"]):
            doc_parts.append("Type: Ready-to-eat packaged snack, instant food, and confectionery.")
        elif any(w in name_lower for w in ["milk", "butter", "cheese", "paneer", "dahi"]):
            doc_parts.append("Type: Chilled fresh dairy product, requires refrigeration.")

        content = " | ".join(doc_parts)
        metadata = {
            "source_type": "product",
            "product_id": product.id,
            "title": product.name,
            "category": cat_name,
            "brand": brand_name,
            "sku": product.sku or "",
            "is_active": bool(product.is_active),
            "is_in_stock": bool(product.is_in_stock and product.stock_quantity > 0),
        }
        content_hash = compute_content_hash(content, metadata)
        return {
            "id": f"prod_{product.id}",
            "title": product.name,
            "document": content,
            "metadata": metadata,
            "content_hash": content_hash,
        }


class CategoryExtractor:
    @staticmethod
    def extract(category) -> Dict[str, Any]:
        content = (
            f"Department Category: {category.name}. "
            f"This category contains genuine packaged groceries, staples, or household items. "
            f"Active: {'Yes' if category.is_active else 'No'}."
        )
        metadata = {
            "source_type": "category",
            "category_id": category.id,
            "title": category.name,
            "is_active": bool(category.is_active),
        }
        content_hash = compute_content_hash(content, metadata)
        return {
            "id": f"cat_{category.id}",
            "title": category.name,
            "document": content,
            "metadata": metadata,
            "content_hash": content_hash,
        }


class PolicyExtractor:
    @staticmethod
    def extract_all(store_settings) -> List[Dict[str, Any]]:
        docs = []

        # 1. Delivery & Shipping Policy
        free_del = float(store_settings.free_delivery_threshold or 0)
        del_fee = float(store_settings.delivery_fee or 0)
        min_order = float(store_settings.min_order_amount or 0)
        rad_km = float(store_settings.delivery_radius_km or 5.0)

        del_text = (
            f"Delivery Policy: CartSettle delivers orders rapidly within 15 to 25 minutes. "
            f"Home delivery is {'active' if store_settings.is_home_delivery_active else 'available alongside store pickup'}. "
            f"Standard delivery fee is ₹{del_fee:.2f}. "
            f"Free home delivery applies on orders above ₹{free_del:.2f}. "
            f"Minimum order value is ₹{min_order:.2f}. "
            f"Delivery service radius covers up to {rad_km:.1f} km from the store."
        )
        del_meta = {"source_type": "policy", "policy_key": "delivery", "title": "Delivery & Shipping Policy"}
        docs.append({
            "id": "policy_delivery",
            "title": "Delivery & Shipping Policy",
            "document": del_text,
            "metadata": del_meta,
            "content_hash": compute_content_hash(del_text, del_meta),
        })

        # 2. Return & Refund Policy
        terms = store_settings.invoice_terms_and_conditions or (
            "1. Goods once sold will not be taken back without original bill.\n"
            "2. Perishable goods must be reported within 24 hours."
        )
        ret_text = (
            f"Return & Refund Policy: We prioritize customer satisfaction and product quality. "
            f"Perishable items (dairy, fresh produce) must be reported within 24 hours of delivery. "
            f"Unopened packaged items can be returned with the original tax invoice. "
            f"Approved refunds for missing or damaged items are processed automatically via PayPal or Store Wallet. "
            f"Terms: {terms}"
        )
        ret_meta = {"source_type": "policy", "policy_key": "returns", "title": "Return & Refund Policy"}
        docs.append({
            "id": "policy_returns",
            "title": "Return & Refund Policy",
            "document": ret_text,
            "metadata": ret_meta,
            "content_hash": compute_content_hash(ret_text, ret_meta),
        })

        # 3. Payment Methods Policy
        pay_text = (
            "Payment Methods: CartSettle supports secure multi-channel payments: "
            "1. PayPal Checkout & Dynamic Pre-Authorization (settled dynamically at the packing table). "
            "2. Cash on Delivery (COD) for convenient doorstep cash payment. "
            "3. Store Loyalty Wallet with instant cashback and balance application. "
            "4. UPI Instant QR code scanning for zero-fee digital transactions."
        )
        pay_meta = {"source_type": "policy", "policy_key": "payments", "title": "Payment Methods"}
        docs.append({
            "id": "policy_payments",
            "title": "Payment Methods Policy",
            "document": pay_text,
            "metadata": pay_meta,
            "content_hash": compute_content_hash(pay_text, pay_meta),
        })

        # 4. Store Hours & Contact Info
        store_name = store_settings.store_name or "CartSettle Kirana"
        phone = store_settings.store_phone or "+91 98765 43210"
        email = store_settings.store_email or "support@cartsettle.in"
        whatsapp = store_settings.whatsapp_number or phone
        addr = store_settings.store_address or "123 Market Street"

        contact_text = (
            f"Store Information & Support: {store_name} is located at {addr}. "
            f"Operating Status: {'Open for orders' if store_settings.is_open else 'Temporarily closed'}. "
            f"Customer support is available via WhatsApp ({whatsapp}), Phone ({phone}), and Email ({email}). "
            f"Standard opening hours are 7:00 AM to 10:30 PM daily."
        )
        contact_meta = {"source_type": "policy", "policy_key": "contact", "title": "Store Info & Support"}
        docs.append({
            "id": "policy_contact",
            "title": "Store Info & Customer Support",
            "document": contact_text,
            "metadata": contact_meta,
            "content_hash": compute_content_hash(contact_text, contact_meta),
        })

        return docs


class FAQExtractor:
    @staticmethod
    def get_standard_faqs() -> List[Dict[str, Any]]:
        faqs = [
            (
                "faq_dynamic_settlement",
                "How does packing table settlement and refund work?",
                "CartSettle utilizes autonomous packing table settlement. When an order is packed, any unavailable or damaged item is removed, and unfulfilled funds are instantly auto-released back to your PayPal or Wallet before delivery dispatch."
            ),
            (
                "faq_order_tracking",
                "How do I track my order?",
                "You can track your order in real time from the Orders page or simply ask the AI Assistant 'Where is my order?' to view the live status card and delivery ETA."
            ),
            (
                "faq_bargaining",
                "Can I bargain or ask for discounts?",
                "Yes! The AI assistant has autonomous margin-safe bargaining. You can ask for a discount (e.g. 'Can I get 10% off Amul Butter?'), and the system checks against the 12% safety margin to approve or make a safe counter-offer."
            ),
            (
                "faq_quality_guarantee",
                "Are products genuine and fresh?",
                "All items are 100% authentic packaged goods sourced directly from verified distributors and authorized FMCG manufacturers with guaranteed quality and tamper-evident packaging."
            ),
        ]
        docs = []
        for faq_id, q, a in faqs:
            text = f"FAQ: {q} Answer: {a}"
            meta = {"source_type": "faq", "title": q}
            docs.append({
                "id": faq_id,
                "title": q,
                "document": text,
                "metadata": meta,
                "content_hash": compute_content_hash(text, meta),
            })
        return docs
