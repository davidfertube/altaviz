---
paths:
  - "**/*.py"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.tf"
---
# Security Rules for Altaviz

## Never Do
- Never hardcode API keys, passwords, or connection strings in source code
- Never commit .env files (.gitignore enforced)
- Never use string interpolation/concatenation in SQL queries
- Never log sensitive data (tokens, passwords, PII, patient data)
- Never use `eval()` or `exec()` with user input
- Never disable SSL verification in production
- Never store session tokens in localStorage (use httpOnly cookies)
- Never expose internal error details to API consumers

## Always Do
- Use parameterized queries for ALL SQL (`%s` placeholders, never f-strings)
- Use Azure Key Vault for production secrets (Terraform: keyvault.tf)
- Use environment variables for local development (.env.example as template)
- Validate all user input at API boundaries (compressor ID regex, UUID format)
- Use timing-safe comparison for API keys (`lib/crypto.ts`)
- Rate limit all API endpoints (60 req/min general, 10 req/min auth)
- Use Managed Identity for Azure service-to-service auth (no API keys in prod)
- Audit log sensitive operations (work order approvals, state transitions)
