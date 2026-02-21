"""
CLI tool to run compressor diagnostics.

Usage:
    python -m src.agents.run_diagnosis COMP-003
    python -m src.agents.run_diagnosis COMP-007

Requires:
    - DATABASE_URL environment variable
    - OPENAI_API_KEY (or ANTHROPIC_API_KEY if using claude model)
"""

import asyncio
import sys
import json

from src.agents.diagnostics_agent import diagnose_compressor


async def main():
    if len(sys.argv) < 2:
        print("Usage: python -m src.agents.run_diagnosis <COMP-XXX>")
        sys.exit(1)

    compressor_id = sys.argv[1]
    print(f"\nRunning AI diagnostics for {compressor_id}...\n")

    try:
        report = await diagnose_compressor(compressor_id)
        print("=" * 70)
        print(f"DIAGNOSTIC REPORT: {report.compressor_id}")
        print("=" * 70)
        print(f"Severity:        {report.severity}")
        print(f"Confidence:      {report.confidence:.0%}")
        print(f"Time to failure: {report.estimated_time_to_failure or 'N/A'}")
        print(f"\nRoot Cause Analysis:")
        print(f"  {report.root_cause_analysis}")
        print(f"\nContributing Factors:")
        for factor in report.contributing_factors:
            print(f"  - {factor}")
        print(f"\nRecommended Actions:")
        for action in report.recommended_actions:
            print(f"  [{action.priority.upper()}] {action.action}")
            print(f"    Rationale: {action.rationale}")
            if action.estimated_downtime_hours:
                print(f"    Downtime: {action.estimated_downtime_hours}h")
        print(f"\nData Summary:")
        print(f"  {report.data_summary}")
        print("=" * 70)

        # Also output as JSON for programmatic use
        print(f"\nJSON output:")
        print(json.dumps(report.model_dump(), indent=2))

    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
