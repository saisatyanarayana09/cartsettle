from django.apps import AppConfig


class ProductsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'products'

    def ready(self):
        try:
            from services.rag.signals import connect_rag_signals
            connect_rag_signals()
        except Exception:
            pass

