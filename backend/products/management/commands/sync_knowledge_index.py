"""
Django Management Command to synchronize the CartSettle RAG Knowledge Vector Index.
Usage:
    python manage.py sync_knowledge_index
    python manage.py sync_knowledge_index --rebuild
"""
from django.core.management.base import BaseCommand
from services.rag import sync_knowledge_index, get_ingestion_service


class Command(BaseCommand):
    help = "Synchronizes or rebuilds the ChromaDB RAG Knowledge Index for products and store policies."

    def add_arguments(self, parser):
        parser.add_argument(
            "--rebuild",
            action="store_true",
            help="Forces a full wipe and re-embedding of the knowledge index.",
        )
        parser.add_argument(
            "--status",
            action="store_true",
            help="Displays the current vector store count and metadata manifest status.",
        )

    def handle(self, *args, **options):
        ingestion = get_ingestion_service()
        if options.get("status"):
            st = ingestion.get_status()
            self.stdout.write(self.style.SUCCESS(f"RAG Index Status: {st}"))
            return

        rebuild = options.get("rebuild", False)
        self.stdout.write(self.style.NOTICE(f"Starting RAG knowledge synchronization (rebuild={rebuild})..."))

        res = sync_knowledge_index(force_rebuild=rebuild)

        self.stdout.write(self.style.SUCCESS(
            f"✓ RAG Index Sync Complete!\n"
            f"  - Total Entities: {res['total_documents']}\n"
            f"  - Newly Embedded: {res['embedded_count']}\n"
            f"  - Skipped (Unchanged): {res['skipped_count']}\n"
            f"  - Vector Store Count: {res['vector_store_count']}\n"
            f"  - Execution Time: {res['duration_ms']} ms\n"
            f"  - Model: {res['model']} ({res['dimension']} dim)"
        ))
