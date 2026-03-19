# ADR-002: pgvector Default with Azure AI Search Upgrade Path

## Status
Accepted

## Context
The Investigation Agent needs RAG (Retrieval-Augmented Generation) to search maintenance manuals, service bulletins, and past incident reports. Two options:
1. pgvector in PostgreSQL (already deployed)
2. Azure AI Search (managed service with hybrid search)

## Decision
Use **pgvector as default** with a **pluggable Strategy Pattern** that allows switching to Azure AI Search via environment variable.

### pgvector (default)
- Zero additional infrastructure (PostgreSQL already deployed for the app)
- Cosine similarity search via `embedding <=> query_vector`
- Good enough for development and small knowledge bases (<10K docs)
- Cost: $0 (included in existing PostgreSQL)

### Azure AI Search (upgrade path)
- Hybrid search: vector + BM25 keyword + semantic ranking (triple fusion)
- Better relevance for natural language queries
- Managed scaling, no index management
- Free tier: 50 MB, 3 indexes (sufficient for dev)

### Implementation
```python
# Strategy Pattern in search_backend.py
backend = get_search_backend()  # Reads SEARCH_BACKEND env var
results = backend.search(query, org_id)  # Same interface, different implementation
```

## Alternatives Considered
- **Pinecone**: SaaS-only, no self-hosted option, vendor lock-in
- **Weaviate**: Good but adds another service to manage
- **ChromaDB**: Good for prototyping but not production-ready at scale
- **FAISS**: In-memory only, no persistence without custom code

## Consequences
- Developers can work locally with just PostgreSQL (no Azure account needed)
- Production can use Azure AI Search for better relevance
- `SEARCH_BACKEND=azure` switches backends without code changes
- Both backends implement the same `SearchBackend` abstract class
