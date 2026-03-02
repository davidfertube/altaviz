"""
Knowledge Base with pgvector RAG for the Investigation Agent.

Manages maintenance manuals, service bulletins, incident reports, and
learned lessons. Uses OpenAI text-embedding-3-small for embeddings
and pgvector for cosine similarity search.
"""

import os
import json
import logging
from typing import Optional

from .shared.db_tools import query_db, execute_db

logger = logging.getLogger(__name__)


def _get_embedding(text: str) -> list[float]:
    """Generate an embedding using OpenAI text-embedding-3-small."""
    import openai
    client = openai.OpenAI()
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


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
        embedding_str = f"[{','.join(str(x) for x in embedding)}]"

        conditions = ["organization_id = %s"]
        params: list = [organization_id]

        if doc_types:
            placeholders = ','.join(['%s'] * len(doc_types))
            conditions.append(f"doc_type IN ({placeholders})")
            params.extend(doc_types)

        if failure_modes:
            # JSONB array overlap: failure_modes column contains any of the given modes
            conditions.append("failure_modes ?| %s")
            params.append(failure_modes)

        where = " AND ".join(conditions)
        params.append(embedding_str)
        params.append(limit)

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

        # Truncate content to excerpts for the agent
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
