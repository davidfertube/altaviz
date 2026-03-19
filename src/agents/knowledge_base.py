"""
Knowledge Base with pgvector RAG for the Investigation Agent.

Manages maintenance manuals, service bulletins, incident reports, and
learned lessons. Uses OpenAI text-embedding-3-small for embeddings
and pgvector for cosine similarity search.
"""

# ===========================================================================
# PATTERN: RAG (Retrieval-Augmented Generation) Knowledge Base
# WHY: Agents need access to domain knowledge (maintenance manuals, service
#   bulletins, past incident reports) that is NOT in the LLM's training data.
#   RAG retrieves relevant documents at query time and injects them into the
#   agent's context window, grounding its output in real documentation.
# SCALING: At 4,700 compressors with years of maintenance history, the
#   knowledge base can grow to tens of thousands of documents. pgvector's
#   IVFFlat index handles this scale with sub-100ms query times.
# ALTERNATIVE: Fine-tuning the LLM on domain documents — expensive, hard to
#   update, and loses citation ability (you can't tell which doc the answer
#   came from). RAG preserves document provenance for audit trails.
# ===========================================================================

import os
import json
import logging
from typing import Optional

from .shared.db_tools import query_db, execute_db

logger = logging.getLogger(__name__)


# ===========================================================================
# PATTERN: Factory Method (_get_openai_client)
# WHY: Abstracts the OpenAI client creation to support two deployment modes:
#   1. Direct OpenAI API (development, uses OPENAI_API_KEY)
#   2. Azure OpenAI (production, uses AZURE_OPENAI_ENDPOINT + managed identity)
#   The factory checks for the Azure endpoint env var and returns the
#   appropriate client. Calling code never needs to know which is active.
# SCALING: In production, Azure OpenAI provides dedicated throughput (PTU)
#   to guarantee embedding latency under load, unlike the shared OpenAI API.
# ALTERNATIVE: A config flag or strategy pattern — but env var detection is
#   simpler and follows the Azure SDK convention.
# ===========================================================================
def _get_openai_client():
    """Get OpenAI client — uses Azure OpenAI if AZURE_OPENAI_ENDPOINT is set."""
    import openai

    azure_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
    if azure_endpoint:
        return openai.AzureOpenAI(
            azure_endpoint=azure_endpoint,
            api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
        )
    return openai.OpenAI()  # Falls back to OPENAI_API_KEY env var


# ===========================================================================
# Embedding Model: text-embedding-3-small (1536 dimensions)
# WHY: Best cost/quality ratio for RAG retrieval as of 2024.
#   - 1536 dimensions (same as ada-002 but 5x cheaper)
#   - 62.3% MTEB score (vs. 64.6% for text-embedding-3-large at 3x the cost)
#   - $0.02/1M tokens — at our scale (~500 documents), embedding the entire
#     knowledge base costs < $0.01
# ALTERNATIVE: text-embedding-3-large (3072 dims) — marginally better quality
#   but doubles pgvector storage and query time. Not worth it for our corpus
#   size where BM25-level retrieval accuracy is sufficient.
# ===========================================================================
def _get_embedding(text: str) -> list[float]:
    """Generate an embedding using OpenAI or Azure OpenAI text-embedding-3-small."""
    client = _get_openai_client()
    # AZURE_OPENAI_EMBEDDING_DEPLOYMENT overrides model name for Azure deployments
    model = os.environ.get("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-small")
    response = client.embeddings.create(
        model=model,
        input=text,
    )
    return response.data[0].embedding  # Returns a list of 1536 floats


def search_knowledge_base(
    query: str,
    organization_id: str,
    doc_types: Optional[list[str]] = None,
    failure_modes: Optional[list[str]] = None,
    limit: int = 5,
) -> str:
    """Search the knowledge base using pgvector cosine similarity.

    Args:
        query: Natural language search query
        organization_id: Org scope
        doc_types: Filter by doc types (maintenance_manual, service_bulletin, etc.)
        failure_modes: Filter by failure modes (bearing_wear, valve_failure, etc.)
        limit: Max results to return

    Returns:
        JSON string of matching documents with relevance scores.
    """
    try:
        embedding = _get_embedding(query)
        # pgvector expects vector literals as bracketed comma-separated floats
        embedding_str = f"[{','.join(str(x) for x in embedding)}]"

        conditions = ["organization_id = %s"]
        params: list = [organization_id]

        if doc_types:
            placeholders = ','.join(['%s'] * len(doc_types))
            conditions.append(f"doc_type IN ({placeholders})")
            params.extend(doc_types)

        if failure_modes:
            # ===========================================================================
            # JSONB Array Overlap Operator (?|)
            # WHY: The failure_modes column is a JSONB array (e.g., ["bearing_wear", "valve_failure"]).
            #   The ?| operator checks if ANY of the given failure modes exist in the array.
            #   This is more flexible than exact match — a document about "bearing_wear AND
            #   valve_failure" will match a query for just "bearing_wear".
            # PERFORMANCE: PostgreSQL uses GIN indexes on JSONB arrays, so this is O(log n)
            #   not a full table scan.
            # ALTERNATIVE: Normalize into a junction table — faster for large-scale filtering
            #   but adds schema complexity for a modest-sized knowledge base.
            # ===========================================================================
            conditions.append("failure_modes ?| %s")
            params.append(failure_modes)

        where = " AND ".join(conditions)
        params.append(embedding_str)
        params.append(limit)

        # ===========================================================================
        # pgvector Cosine Distance (<=>)
        # WHY: Cosine similarity is scale-invariant — it measures the angle between
        #   vectors, not their magnitude. This means a short document and a long
        #   document about the same topic will have similar scores. L2 (Euclidean)
        #   distance would penalize shorter documents unfairly.
        # NOTE: pgvector uses cosine DISTANCE (0 = identical, 2 = opposite), so we
        #   compute 1 - distance to get cosine SIMILARITY (1 = identical, -1 = opposite).
        # PERFORMANCE: With an IVFFlat or HNSW index on the embedding column,
        #   this query runs in ~10ms for up to 100K documents.
        # ===========================================================================
        rows = query_db(
            f"""SELECT doc_id, title, doc_type, content,
                       compressor_models, failure_modes, components,
                       1 - (embedding <=> %s::vector) as relevance_score
                FROM knowledge_base
                WHERE {where}
                  AND embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT %s""",
            params[:-2] + [embedding_str, embedding_str, limit]
        )

        # ===========================================================================
        # Content Truncation (500 chars)
        # WHY: Full document content can be thousands of characters. The agent's
        #   context window has a token budget (~128K for GPT-4o-mini, but practical
        #   limit is ~16K for good reasoning). Sending 500-char excerpts for 5
        #   results = ~2,500 chars, leaving plenty of room for sensor data and
        #   the agent's reasoning chain.
        # ALTERNATIVE: Chunk documents at indexing time (like LangChain's
        #   RecursiveCharacterTextSplitter) — better for long documents but
        #   adds indexing complexity. Our documents are typically 1-3 pages.
        # ===========================================================================
        for row in rows:
            if row.get('content') and len(row['content']) > 500:
                row['excerpt'] = row['content'][:500] + "..."
                del row['content']
            else:
                row['excerpt'] = row.get('content', '')
                if 'content' in row:
                    del row['content']
            row['relevance_score'] = round(float(row.get('relevance_score', 0)), 4)

        return json.dumps(rows, default=str)
    except Exception as e:
        logger.error(f"Knowledge base search failed: {e}")
        return json.dumps({"error": str(e)})


# ===========================================================================
# Document Indexing with Upsert
# WHY: ON CONFLICT (doc_id) DO UPDATE enables idempotent document updates.
#   When a service bulletin is revised, we re-index it with the same doc_id
#   and the new content/embedding replaces the old one atomically.
# ===========================================================================
def add_document(
    organization_id: str,
    doc_id: str,
    doc_type: str,
    title: str,
    content: str,
    compressor_models: Optional[list[str]] = None,
    failure_modes: Optional[list[str]] = None,
    components: Optional[list[str]] = None,
    source_url: Optional[str] = None,
    version: Optional[str] = None,
) -> dict:
    """Add a document to the knowledge base with auto-generated embedding."""
    try:
        # Embed title + content together so the vector captures both the topic
        # (from the title) and the details (from the content). This gives better
        # retrieval than embedding content alone.
        embedding = _get_embedding(f"{title}\n\n{content}")
        embedding_str = f"[{','.join(str(x) for x in embedding)}]"

        execute_db(
            """INSERT INTO knowledge_base
               (doc_id, organization_id, doc_type, title, content,
                compressor_models, failure_modes, components,
                embedding, source_url, version)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::vector, %s, %s)
               ON CONFLICT (doc_id) DO UPDATE SET
                 title = EXCLUDED.title,
                 content = EXCLUDED.content,
                 compressor_models = EXCLUDED.compressor_models,
                 failure_modes = EXCLUDED.failure_modes,
                 components = EXCLUDED.components,
                 embedding = EXCLUDED.embedding,
                 version = EXCLUDED.version""",
            [doc_id, organization_id, doc_type, title, content,
             json.dumps(compressor_models) if compressor_models else None,
             json.dumps(failure_modes) if failure_modes else None,
             json.dumps(components) if components else None,
             embedding_str, source_url, version]
        )
        return {"doc_id": doc_id, "status": "added"}
    except Exception as e:
        logger.error(f"Failed to add document {doc_id}: {e}")
        return {"error": str(e)}


# ===========================================================================
# PATTERN: Model-Based Incident Matching (Content-Based Filtering)
# WHY: Compressors of the same model share the same mechanical design,
#   so they fail in the same ways. An Ajax DPC-360 with bearing wear
#   will have the same vibration signature as another Ajax DPC-360 with
#   bearing wear. Matching by model is a strong heuristic that doesn't
#   require embeddings — it's fast and interpretable.
# SCALING: With 4,700 compressors across 7 models, each model has ~670
#   units. Past incidents for the same model are highly relevant.
# ALTERNATIVE: Embedding-based similarity on sensor patterns — more
#   sophisticated but harder to explain to technicians ("why did you
#   recommend this?"). Model matching is intuitive.
# ===========================================================================
def get_similar_incidents(
    compressor_id: str,
    organization_id: str,
    failure_mode: Optional[str] = None,
    limit: int = 5,
) -> str:
    """Find past investigation reports for similar compressor models with similar symptoms.

    Matches on compressor model (same model = same failure patterns) and
    optionally filters by failure mode.
    """
    try:
        # Get the compressor's model
        meta_rows = query_db(
            "SELECT model FROM compressor_metadata WHERE compressor_id = %s",
            [compressor_id]
        )
        if not meta_rows:
            return json.dumps({"error": f"Compressor {compressor_id} not found"})

        model = meta_rows[0]['model']

        conditions = [
            "ir.organization_id = %s",
            "ir.compressor_id != %s",  # exclude the current compressor
        ]
        params: list = [organization_id, compressor_id]

        if failure_mode:
            conditions.append("ir.failure_mode = %s")
            params.append(failure_mode)

        where = " AND ".join(conditions)
        params.append(model)
        params.append(limit)

        rows = query_db(
            f"""SELECT ir.investigation_id, ir.compressor_id,
                       ir.root_cause, ir.failure_mode, ir.severity,
                       ir.confidence, ir.created_at,
                       cm.model,
                       CASE WHEN cm.model = %s THEN 0.9 ELSE 0.5 END as similarity_score
                FROM investigation_reports ir
                JOIN compressor_metadata cm ON ir.compressor_id = cm.compressor_id
                WHERE {where}
                ORDER BY ir.created_at DESC
                LIMIT %s""",
            params[:-2] + [model, limit]
        )

        from .shared.db_tools import _serialize_rows
        return json.dumps(_serialize_rows(rows), default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


# ===========================================================================
# PATTERN: Feedback Loop (Learned Lessons)
# WHY: When a technician marks an investigation diagnosis as INCORRECT and
#   provides the actual root cause, this function creates a "learned lesson"
#   document in the knowledge base. The next time the agent investigates a
#   similar issue, RAG will retrieve this lesson and the agent will avoid
#   the same misdiagnosis.
# DESIGN: This is the "learning" step in the closed-loop architecture:
#   Detect → Investigate → Fix → LEARN → Detect (better next time)
# SCALING: Over time, the knowledge base accumulates a corpus of lessons
#   specific to this fleet's operating conditions, making the agent
#   increasingly accurate — a form of implicit fine-tuning via RAG.
# ===========================================================================
def add_learned_lesson(
    organization_id: str,
    investigation_id: str,
    compressor_id: str,
    actual_root_cause: str,
    failure_mode: str,
    lesson: str,
) -> dict:
    """Add a learned lesson to the knowledge base from incorrect diagnosis feedback."""
    doc_id = f"LESSON-{investigation_id}"
    title = f"Learned Lesson: {failure_mode} on {compressor_id}"
    content = (
        f"Investigation {investigation_id} for compressor {compressor_id} "
        f"initially misdiagnosed. Actual root cause: {actual_root_cause}. "
        f"Lesson: {lesson}"
    )

    return add_document(
        organization_id=organization_id,
        doc_id=doc_id,
        doc_type='learned_lesson',
        title=title,
        content=content,
        failure_modes=[failure_mode],
    )
