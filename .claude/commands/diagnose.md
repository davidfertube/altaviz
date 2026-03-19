# Diagnose Compressor

Run AI diagnostics for a specific compressor using the Altaviz agent system.

## Usage
```
/diagnose COMP-0003
```

## Steps

1. Verify the compressor ID format matches `COMP-XXXX`
2. Check if the Agent API is running on port 8001
3. If not running, start it: `uvicorn src.agents.api:app --port 8001`
4. Run the diagnostics CLI: `python3 -m src.agents.run_diagnosis $ARGUMENTS`
5. Parse the DiagnosticReport output and display:
   - Root cause analysis
   - Severity level
   - Confidence score
   - Recommended actions
6. If the diagnosis confidence is below 0.6, suggest running a full investigation instead

## Notes
- Requires OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT in .env
- Uses the DIAGNOSTICS_MODEL env var (default: openai:gpt-4o-mini)
- For Azure OpenAI: set DIAGNOSTICS_MODEL=azure-openai:gpt-4o-mini
