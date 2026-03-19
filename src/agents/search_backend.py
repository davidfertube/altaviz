"""
Pluggable Search Backend for the Altaviz Knowledge Base.

Supports two backends:
- pgvector: PostgreSQL with pgvector extension (default, current)
- azure: Azure AI Search with hybrid search (vector + BM25 + semantic ranking)

Selection via SEARCH_BACKEND environment variable.
"""

# ===========================================================================
# PATTERN: Strategy Pattern (Pluggable Search Backends)
# WHY: The knowledge base search needs to work in multiple deployment contexts:
#   - Development/demo: pgvector (zero additional infra, PostgreSQL already deployed)
#   - Production (Azure): Azure AI Search (managed service, hybrid search, scaling)
#   The Strategy pattern lets us swap backends via a single env var (SEARCH_BACKEND)
#   without changing any calling code.
# SCALING: pgvector handles up to ~1M documents well. Beyond that, Azure AI Search
#   provides automatic sharding, replica scaling, and built-in monitoring.
# ALTERNATIVE: Protocol (typing.Protocol) instead of ABC — Protocol is more
#   Pythonic for structural typing ("duck typing with type hints"), but ABC
#   provides explicit contracts and clearer error messages when a method is
#   not implemented. For a 2-backend system, ABC is clearer to teach.
# ===========================================================================

import os
import json
import logging
from abc import ABC, abstractmethod
from typing import Optional

logger = logging.getLogger(__name__)


class SearchBackend(ABC):
    """Abstract search backend for knowledge base queries.

    Subclasses must implement search() and index_document(). This explicit
    contract (via ABC) means you get a clear TypeError at instantiation time
    if you forget to implement a method, rather than a cryptic AttributeError
    at runtime.
    """

    @abstractmethod
    def search(
        self,
        query: str,
        organization_id: str,
        doc_types: Optional[list[str]] = None,
        failure_modes: Optional[list[str]] = None,
        limit: int = 5,
    ) -> list[dict]:
        """Search for documents matching the query."""
        ...

    @abstractmethod
    def index_document(
        self,
        doc_id: str,
        organization_id: str,
        doc_type: str,
        title: str,
        content: str,
        embedding: list[float],
        compressor_models: Optional[list[str]] = None,
        failure_modes: Optional[list[str]] = None,
        components: Optional[list[str]] = None,
    ) -> None:
        """Index a document in the search backend."""
        ...


# ===========================================================================
# pgvector Backend (Default)
# WHY: pgvector is the default because it requires zero additional infrastructure.
#   PostgreSQL is already deployed for the agent tables (work_orders, investigations,
#   etc.), so adding vector search is just a CREATE EXTENSION and an index.
#   Total added cost: $0/month (it runs inside the existing database).
# PERFORMANCE: With an HNSW index, pgvector handles sub-50ms queries for up to
#   100K documents with 1536-dimensional vectors. Our knowledge base is < 10K docs.
# ===========================================================================
class PgVectorBackend(SearchBackend):
    """PostgreSQL pgvector-based search (cosine similarity)."""

    def search(
        self,
        query: str,
        organization_id: str,
        doc_types: Optional[list[str]] = None,
        failure_modes: Optional[list[str]] = None,
        limit: int = 5,
    ) -> list[dict]:
        from .knowledge_base import _get_embedding
        from .shared.db_tools import query_db

        embedding = _get_embedding(query)
        embedding_str = f"[{','.join(str(x) for x in embedding)}]"

        conditions = ["organization_id = %s"]
        params: list = [organization_id]

        if doc_types:
            placeholders = ','.join(['%s'] * len(doc_types))
            conditions.append(f"doc_type IN ({placeholders})")
            params.extend(doc_types)

        if failure_modes:
            conditions.append("failure_modes ?| %s")
            params.append(failure_modes)

        where = " AND ".join(conditions)

        rows = query_db(
            f"""SELECT doc_id, title, doc_type, content,
                       compressor_models, failure_modes, components,
                       1 - (embedding <=> %s::vector) as relevance_score
                FROM knowledge_base
                WHERE {where}
                  AND embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT %s""",
            params + [embedding_str, embedding_str, limit]
        )

        results = []
        for row in rows:
            if row.get('content') and len(row['content']) > 500:
                row['excerpt'] = row['content'][:500] + "..."
                del row['content']
            else:
                row['excerpt'] = row.get('content', '')
                if 'content' in row:
                    del row['content']
            row['relevance_score'] = round(float(row.get('relevance_score', 0)), 4)
            results.append(row)

        return results

    def index_document(self, doc_id, organization_id, doc_type, title, content,
                       embedding, compressor_models=None, failure_modes=None,
                       components=None):
        # pgvector indexing is handled by knowledge_base.add_document()
        pass


# ===========================================================================
# Azure AI Search Backend (Production)
# WHY: Azure AI Search provides hybrid search — a triple fusion of:
#   1. Vector search (cosine similarity on embeddings, like pgvector)
#   2. BM25 (traditional keyword/term-frequency search)
#   3. Semantic ranking (cross-encoder re-ranking for relevance)
#   This triple fusion catches cases where pure vector search fails
#   (e.g., exact part numbers, regulatory codes like "OOOOb" that
#   embeddings may not represent well).
# SCALING: Managed service — Microsoft handles sharding, replication,
#   and index maintenance. Can scale to millions of documents.
# COST: ~$250/month for the Basic tier (15 GB, 3 replicas).
# ===========================================================================
class AzureSearchBackend(SearchBackend):
    """Azure AI Search backend with hybrid search (vector + BM25 + semantic)."""

    def __init__(self):
        self.endpoint = os.environ.get("AZURE_SEARCH_ENDPOINT", "")
        self.api_key = os.environ.get("AZURE_SEARCH_API_KEY", "")
        self.index_name = os.environ.get("AZURE_SEARCH_INDEX", "altaviz-knowledge-base")
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                from azure.search.documents import SearchClient
                from azure.core.credentials import AzureKeyCredential

                self._client = SearchClient(
                    endpoint=self.endpoint,
                    index_name=self.index_name,
                    credential=AzureKeyCredential(self.api_key),
                )
            except ImportError:
                raise ImportError(
                    "azure-search-documents not installed. "
                    "Install with: pip install azure-search-documents"
                )
        return self._client

    def search(
        self,
        query: str,
        organization_id: str,
        doc_types: Optional[list[str]] = None,
        failure_modes: Optional[list[str]] = None,
        limit: int = 5,
    ) -> list[dict]:
        from .knowledge_base import _get_embedding

        client = self._get_client()
        embedding = _get_embedding(query)

        # Build filter
        filters = [f"organization_id eq '{organization_id}'"]
        if doc_types:
            type_filter = " or ".join(f"doc_type eq '{dt}'" for dt in doc_types)
            filters.append(f"({type_filter})")

        filter_str = " and ".join(filters) if filters else None

        try:
            from azure.search.documents.models import VectorizedQuery

            # k_nearest_neighbors controls how many candidates the vector search
            # retrieves BEFORE fusion with BM25 results. Setting it equal to `limit`
            # means we get exactly `limit` vector matches to fuse with `limit` keyword
            # matches. In practice, you might set this to 2x-3x `limit` for better
            # recall, at the cost of slightly higher latency.
            vector_query = VectorizedQuery(
                vector=embedding,
                k_nearest_neighbors=limit,
                fields="embedding",  # The index field containing document embeddings
            )

            # Hybrid search: search_text triggers BM25 keyword matching,
            # vector_queries triggers cosine similarity. Azure AI Search
            # automatically fuses both result sets using Reciprocal Rank Fusion (RRF).
            results = client.search(
                search_text=query,  # BM25 keyword search (catches exact terms, part numbers)
                vector_queries=[vector_query],  # Vector similarity search (catches semantic meaning)
                filter=filter_str,
                top=limit,
                select=["doc_id", "title", "doc_type", "content",
                        "compressor_models", "failure_modes", "components"],
            )

            docs = []
            for result in results:
                doc = {
                    "doc_id": result.get("doc_id"),
                    "title": result.get("title"),
                    "doc_type": result.get("doc_type"),
                    "compressor_models": result.get("compressor_models"),
                    "failure_modes": result.get("failure_modes"),
                    "components": result.get("components"),
                    "relevance_score": round(result.get("@search.score", 0), 4),
                }
                content = result.get("content", "")
                doc["excerpt"] = content[:500] + "..." if len(content) > 500 else content
                docs.append(doc)

            return docs
        except Exception as e:
            logger.error(f"Azure AI Search failed: {e}")
            return []

    def index_document(self, doc_id, organization_id, doc_type, title, content,
                       embedding, compressor_models=None, failure_modes=None,
                       components=None):
        client = self._get_client()
        doc = {
            "doc_id": doc_id,
            "organization_id": organization_id,
            "doc_type": doc_type,
            "title": title,
            "content": content,
            "embedding": embedding,
            "compressor_models": compressor_models or [],
            "failure_modes": failure_modes or [],
            "components": components or [],
        }
        try:
            client.upload_documents(documents=[doc])
            logger.info(f"Indexed document {doc_id} in Azure AI Search")
        except Exception as e:
            logger.error(f"Failed to index document {doc_id}: {e}")


# ===========================================================================
# PATTERN: Factory Function (Backend Selection)
# WHY: Single point of configuration for search backend selection.
#   Calling code does: backend = get_search_backend(); backend.search(...)
#   and never knows whether it's talking to pgvector or Azure AI Search.
# ===========================================================================
def get_search_backend() -> SearchBackend:
    """Get the configured search backend.

    Set SEARCH_BACKEND=azure to use Azure AI Search.
    Defaults to pgvector.
    """
    backend = os.environ.get("SEARCH_BACKEND", "pgvector")
    if backend == "azure":
        return AzureSearchBackend()
    return PgVectorBackend()
