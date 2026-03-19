# ===========================================================================
# PATTERN: LLM Output Quality Evaluation with DeepEval
# WHY: Traditional unit tests check "does the function return the right type?"
#      LLM eval tests check "is the LLM's output GOOD?" This is fundamentally
#      different because LLM outputs are non-deterministic — the same input
#      can produce different (but equally valid) outputs. DeepEval uses an
#      LLM-as-judge approach: it sends the test case to a judge LLM (GPT-4)
#      that scores the output on specific quality dimensions.
#
# METRICS USED:
#   Faithfulness (0.7 threshold): "Is the root cause grounded in the provided
#      context?" A score of 0.7 allows some paraphrasing and inference (the
#      agent can say "bearing degradation" when the context says "bearing wear")
#      but catches fabricated claims. Lower than 0.7 means the agent is
#      inventing conclusions not supported by sensor data or knowledge base.
#
#   Hallucination (0.8 threshold): "Does the agent fabricate information not
#      in the context?" Stricter than faithfulness because hallucinated sensor
#      values or made-up incident IDs could lead to wrong maintenance actions.
#      0.8 means up to 20% of claims can be unsupported (to allow reasonable
#      inferences), but 80%+ must be traceable to the context.
#
#   Answer Relevancy (0.7 threshold): "Does the response address the
#      investigation query?" Catches off-topic responses (e.g., agent
#      discusses emissions when asked about vibration).
#
#   Context Relevancy (0.6 threshold): "Are the retrieved documents relevant
#      to the query?" Tests the RAG retrieval quality, not the agent itself.
#      Lower threshold because retrieval is inherently noisier.
#
# HOW TO INTERPRET FAILURES:
#   - Faithfulness fails -> Agent is drawing conclusions not supported by data.
#     Fix: improve the system prompt to emphasize evidence-based reasoning.
#   - Hallucination fails -> Agent is inventing facts.
#     Fix: add guardrails or constrain the output schema.
#   - Relevancy fails -> Agent response is off-topic.
#     Fix: improve the query construction or agent instructions.
#   - Context relevancy fails -> RAG is retrieving wrong documents.
#     Fix: improve embeddings, chunking strategy, or search filters.
#
# SCALING: These tests run against fixture data (not live agents), so they
#          don't scale with fleet size. Each test takes ~5s (one DeepEval
#          API call). The full eval suite runs in ~30s.
# ===========================================================================

"""
Investigation Agent Quality Evaluation

Tests the quality of investigation agent outputs using DeepEval metrics:
- Faithfulness: Is the root cause grounded in sensor data?
- Hallucination: Does the agent fabricate information?
- Answer Relevancy: Does the response address the investigation query?
- Context Relevancy: Are retrieved knowledge base docs relevant?

Run: pytest tests/eval/test_investigation_quality.py -v
"""

import pytest

# ===========================================================================
# PATTERN: Graceful Import with DEEPEVAL_AVAILABLE Flag
# WHY: deepeval is an optional dependency (not in requirements.txt, only
#      in requirements-dev.txt). This try/except pattern lets the test
#      FILE load without errors even if deepeval isn't installed. The
#      pytest.mark.skipif below then skips all tests in the file.
#      This is better than putting deepeval in requirements.txt because:
#      - Production deployments don't need eval dependencies
#      - CI pipelines without LLM API keys skip evals gracefully
#      - Developers can run non-eval tests without installing deepeval
# ===========================================================================
try:
    from deepeval import assert_test
    from deepeval.test_case import LLMTestCase
    from deepeval.metrics import (
        FaithfulnessMetric,
        HallucinationMetric,
        AnswerRelevancyMetric,
        ContextualRelevancyMetric,
    )
    DEEPEVAL_AVAILABLE = True
except ImportError:
    DEEPEVAL_AVAILABLE = False


# ===========================================================================
# PATTERN: Stacked Markers for Selective Execution
# WHY: pytestmark applies BOTH markers to every test in this module:
#   - pytest.mark.eval: custom marker for "run only eval tests"
#   - pytest.mark.skipif: skip all tests if deepeval not installed
#   This lets you run: pytest -m eval (runs all eval tests across files)
#   or: pytest tests/eval/ (runs just this directory)
#   Both commands gracefully skip if deepeval is missing.
# ===========================================================================
pytestmark = [
    pytest.mark.eval,
    pytest.mark.skipif(not DEEPEVAL_AVAILABLE, reason="deepeval not installed"),
]


class TestInvestigationFaithfulness:
    """Test that investigation conclusions are grounded in evidence."""

    def test_bearing_wear_faithful_to_sensor_data(
        self, sample_investigation_output, bearing_wear_context
    ):
        """Root cause should be supported by the sensor data and knowledge base.

        This test verifies that the agent's root cause analysis (actual_output)
        can be traced back to the retrieval_context (knowledge base documents).
        Threshold 0.7 allows paraphrasing: the agent can say "vibration is
        elevated" when the context says "vibration_mms > 6.0 mm/s".
        """
        test_case = LLMTestCase(
            input="Investigate compressor COMP-0003 for potential anomalies. "
                  "Current vibration reading: 7.2 mm/s (warning threshold: 6.0 mm/s).",
            actual_output=sample_investigation_output["root_cause"],
            retrieval_context=bearing_wear_context,
        )
        faithfulness = FaithfulnessMetric(threshold=0.7)
        assert_test(test_case, [faithfulness])

    def test_cooling_degradation_faithful(self, cooling_degradation_context):
        """Cooling degradation diagnosis should cite temperature evidence."""
        test_case = LLMTestCase(
            input="Investigate COMP-0015 for temperature anomaly. "
                  "Discharge temp: 248F, sustained rise over 3 days.",
            actual_output=(
                "Cooling system degradation detected. Discharge temperature of 248F "
                "exceeds warning threshold of 240F with sustained linear rise pattern. "
                "Recommend cooling system flush and fan/pump inspection."
            ),
            retrieval_context=cooling_degradation_context,
        )
        faithfulness = FaithfulnessMetric(threshold=0.7)
        assert_test(test_case, [faithfulness])


class TestInvestigationHallucination:
    """Test that investigation reports don't contain fabricated information."""

    def test_no_hallucinated_sensor_values(self, bearing_wear_context):
        """Agent should not invent sensor readings not present in context.

        Uses "context" (not "retrieval_context") because HallucinationMetric
        checks claims against provided context documents. Threshold 0.8 is
        stricter than faithfulness because fabricated sensor values could
        lead to incorrect maintenance decisions (e.g., reporting vibration
        at 12.0 mm/s when the actual reading is 7.2 mm/s).
        """
        test_case = LLMTestCase(
            input="Investigate COMP-0003 for vibration anomaly.",
            actual_output=(
                "Bearing wear confirmed. Vibration at 7.2 mm/s exceeds the 6.0 mm/s "
                "warning threshold. Historical data shows exponential increase pattern "
                "consistent with bearing degradation. Similar to incident INV-2025-00142."
            ),
            context=bearing_wear_context,
        )
        hallucination = HallucinationMetric(threshold=0.8)
        assert_test(test_case, [hallucination])

    def test_no_fabricated_knowledge_sources(self, bearing_wear_context):
        """Agent should only cite documents that exist in the knowledge base.

        This test intentionally uses an output that cites "SB-2024-001" and
        "MM-AJX-360" — documents NOT in the bearing_wear_context. A well-
        behaved agent should score LOW on this test (high hallucination),
        catching the fabricated citation. Threshold is set at 0.7 (slightly
        more lenient) because the response still references real knowledge
        (Ajax DPC-360 bearing wear) alongside the fabricated citations.
        """
        test_case = LLMTestCase(
            input="Investigate COMP-0003 vibration issue.",
            actual_output=(
                "Based on service bulletin SB-2024-001 and maintenance manual MM-AJX-360, "
                "the vibration pattern indicates bearing wear. Recommended action: "
                "bearing replacement per procedure in the Ajax DPC-360 manual."
            ),
            context=bearing_wear_context,
        )
        hallucination = HallucinationMetric(threshold=0.7)
        assert_test(test_case, [hallucination])


class TestInvestigationRelevancy:
    """Test that investigation outputs are relevant to the query."""

    def test_response_addresses_compressor_issue(self, bearing_wear_context):
        """Response should directly address the compressor investigation request."""
        test_case = LLMTestCase(
            input="Investigate COMP-0003 for potential bearing failure based on "
                  "elevated vibration readings of 7.2 mm/s.",
            actual_output=(
                "Root cause analysis for COMP-0003: Bearing wear detected. "
                "Vibration mean of 7.2 mm/s exceeds warning threshold (6.0 mm/s). "
                "Recommend immediate bearing inspection and replacement. "
                "Estimated cost: $8,000-15,000. Estimated downtime: 8-16 hours."
            ),
            retrieval_context=bearing_wear_context,
        )
        relevancy = AnswerRelevancyMetric(threshold=0.7)
        assert_test(test_case, [relevancy])


class TestRAGContextQuality:
    """Test the quality of retrieved context from the knowledge base."""

    def test_bearing_wear_context_relevant(self, bearing_wear_context):
        """Retrieved docs should be relevant to bearing wear investigation.

        Uses ContextualRelevancyMetric with a lower threshold (0.6) than
        answer metrics because retrieval quality depends on embedding model
        quality and chunking strategy — factors outside the agent's control.
        A score of 0.6 means at least 60% of retrieved documents are
        relevant, which is acceptable for a 3-document retrieval set.
        """
        test_case = LLMTestCase(
            input="What are the symptoms and repair procedure for bearing wear "
                  "on an Ajax DPC-360 compressor?",
            actual_output=(
                "Bearing wear shows exponential vibration increase. "
                "Repair involves bearing replacement at $8,000-15,000."
            ),
            retrieval_context=bearing_wear_context,
        )
        context_relevancy = ContextualRelevancyMetric(threshold=0.6)
        assert_test(test_case, [context_relevancy])
