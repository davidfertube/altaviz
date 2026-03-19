# ===========================================================================
# PATTERN: RAG Retrieval Quality Evaluation
# WHY: The investigation agent's quality depends on TWO factors:
#      1. Retrieval quality: Did the knowledge base return the RIGHT documents?
#      2. Generation quality: Did the LLM use those documents correctly?
#
#      This test file evaluates factor #1 (retrieval) separately from
#      factor #2 (generation, tested in test_investigation_quality.py).
#      Separating them is important for debugging: if investigation quality
#      drops, you need to know whether the retrieval or the generation
#      is the problem. Different fixes apply to each:
#      - Bad retrieval -> improve embeddings, chunking, or search filters
#      - Bad generation -> improve system prompt or agent instructions
#
# METRICS:
#   Context Precision (threshold 0.6): "Are the TOP-RANKED results relevant?"
#      Measures ranking quality — the most relevant docs should be ranked
#      first. A precision of 0.6 means ~2 of 3 top results are relevant.
#      This matters because agents often only use the first 2-3 documents
#      from the retrieval context (due to context window limits).
#
#   Context Recall (threshold 0.6): "Were ALL relevant documents found?"
#      Measures completeness — did the search find everything relevant?
#      A recall of 0.6 means the retrieval found 60%+ of relevant docs.
#      Lower than precision threshold because some relevant docs may use
#      different terminology (e.g., "bearing failure" vs "bearing wear").
#
#   Faithfulness (threshold 0.7): "Is the answer grounded in retrieved docs?"
#      Same metric as investigation tests, but specifically testing whether
#      the RAG pipeline (retrieve + generate) produces grounded answers.
#      This catches a failure mode unique to RAG: the agent retrieves
#      correct docs but ignores them and generates from its training data.
#
# WHY LOWER THRESHOLDS (0.6) FOR RAG vs GENERATION (0.7):
#   Retrieval is inherently noisier than generation because:
#   - Embedding similarity is approximate (cosine similarity, not exact match)
#   - Knowledge base documents may use inconsistent terminology
#   - Chunking boundaries may split relevant information across chunks
#   - The "free" tier of AI Search lacks semantic reranking
#   0.6 is a realistic baseline for a production RAG system. As the
#   knowledge base grows and embeddings improve, raise these thresholds.
#
# SCALING: RAG quality may IMPROVE with fleet scale — more resolved
#          incidents means more knowledge base documents, which means
#          better coverage of failure modes and repair procedures.
# ===========================================================================

"""
RAG Quality Evaluation

Tests the quality of the knowledge base retrieval system:
- Context precision: Are the top-ranked docs actually relevant?
- Context recall: Are all relevant docs retrieved?
- Faithfulness: Is the answer grounded in retrieved context?

Run: pytest tests/eval/test_rag_quality.py -v
"""

import pytest

try:
    from deepeval import assert_test
    from deepeval.test_case import LLMTestCase
    from deepeval.metrics import (
        ContextualPrecisionMetric,
        ContextualRecallMetric,
        FaithfulnessMetric,
    )
    DEEPEVAL_AVAILABLE = True
except ImportError:
    DEEPEVAL_AVAILABLE = False


pytestmark = [
    pytest.mark.eval,
    pytest.mark.skipif(not DEEPEVAL_AVAILABLE, reason="deepeval not installed"),
]


class TestContextPrecision:
    """Test that top-ranked retrieved docs are the most relevant."""

    def test_bearing_wear_precision(self, bearing_wear_context):
        """Top results for bearing wear query should contain bearing-related docs.

        ContextualPrecisionMetric evaluates whether the retrieval system ranks
        the most relevant documents highest. It compares the retrieval_context
        against the expected_output to determine which retrieved docs are
        relevant, then checks if those relevant docs appear at the top.

        The expected_output provides the "ground truth" answer that DeepEval
        uses to judge which context documents are relevant. Documents whose
        content aligns with the expected_output are considered relevant.
        """
        test_case = LLMTestCase(
            input="What are the symptoms and repair procedure for bearing wear?",
            actual_output="Bearing wear shows exponential vibration increase above 6.0 mm/s.",
            expected_output="Bearing wear manifests as exponential vibration increase. "
                           "Repair cost: $8,000-15,000. Downtime: 8-16 hours.",
            retrieval_context=bearing_wear_context,
        )
        precision = ContextualPrecisionMetric(threshold=0.6)
        assert_test(test_case, [precision])


class TestContextRecall:
    """Test that all relevant docs are retrieved."""

    def test_bearing_wear_recall(self, bearing_wear_context):
        """All relevant bearing wear docs should be retrieved.

        ContextualRecallMetric checks whether the retrieval_context contains
        ALL the information needed to produce the expected_output. If the
        expected_output mentions "clogged oil filter" but no retrieved doc
        contains that info, recall is penalized.

        This test's expected_output references all 3 context documents:
        1. Vibration increase pattern (doc 1)
        2. Repair cost $8K-15K (doc 2)
        3. Incident INV-2025-00142 with clogged oil filter (doc 3)
        So a perfect recall score requires all 3 docs to be retrieved.
        """
        test_case = LLMTestCase(
            input="Find all information about bearing wear on Ajax DPC-360 compressors.",
            actual_output="Bearing wear on Ajax DPC-360: vibration increase pattern, "
                         "$8,000-15,000 repair cost, similar incident INV-2025-00142.",
            expected_output="Bearing wear manifests as exponential vibration increase. "
                           "Ajax DPC-360 bearing replacement costs $8,000-15,000. "
                           "Past incident: INV-2025-00142 caused by clogged oil filter.",
            retrieval_context=bearing_wear_context,
        )
        recall = ContextualRecallMetric(threshold=0.6)
        assert_test(test_case, [recall])


class TestRAGFaithfulness:
    """Test that agent answers are grounded in retrieved context."""

    def test_investigation_grounded_in_context(self, bearing_wear_context):
        """Investigation conclusions should only cite information from context.

        This test specifically targets the RAG faithfulness failure mode:
        the agent retrieves correct documents but generates claims from its
        training data instead of the retrieved context. For example, if the
        agent claims "bearing wear typically occurs after 10,000 operating
        hours" but no context document mentions operating hours, that's a
        faithfulness violation.

        The actual_output here is carefully written to ONLY reference
        information present in bearing_wear_context (exponential pattern,
        INV-2025-00142, clogged oil filter). A faithful agent should score
        highly on this test.
        """
        test_case = LLMTestCase(
            input="What caused the vibration increase on COMP-0003?",
            actual_output=(
                "Based on the retrieved maintenance records, the vibration increase "
                "on COMP-0003 is consistent with bearing wear. The exponential pattern "
                "matches known bearing degradation curves. Similar to incident "
                "INV-2025-00142 where a clogged oil filter caused insufficient lubrication."
            ),
            retrieval_context=bearing_wear_context,
        )
        faithfulness = FaithfulnessMetric(threshold=0.7)
        assert_test(test_case, [faithfulness])
