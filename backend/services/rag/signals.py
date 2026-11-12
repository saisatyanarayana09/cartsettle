"""
Django Signals for Automated Real-Time RAG Knowledge Index Synchronization.
Listens to Product, Category, and StoreSettings model modifications and updates ChromaDB vector store.
"""
import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

logger = logging.getLogger(__name__)


def connect_rag_signals():
    """Connects RAG signals to Django models safely."""
    try:
        from products.models import Product, Category
        from store.models import StoreSettings

        @receiver(post_save, sender=Product)
        def on_product_save(sender, instance, **kwargs):
            try:
                from .ingestion import get_ingestion_service
                get_ingestion_service().sync_product(instance)
            except Exception as e:
                logger.warning(f"RAG signal error on Product save: {e}")

        @receiver(post_delete, sender=Product)
        def on_product_delete(sender, instance, **kwargs):
            try:
                from .ingestion import get_ingestion_service
                get_ingestion_service().delete_product(instance.id)
            except Exception as e:
                logger.warning(f"RAG signal error on Product delete: {e}")

        @receiver(post_save, sender=StoreSettings)
        def on_settings_save(sender, instance, **kwargs):
            try:
                from .ingestion import get_ingestion_service
                get_ingestion_service().sync_policies()
            except Exception as e:
                logger.warning(f"RAG signal error on StoreSettings save: {e}")

        logger.info("CartSettle RAG automated signals connected.")
    except Exception as e:
        logger.warning(f"Could not connect RAG signals: {e}")
