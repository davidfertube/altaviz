# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

- **Email**: security@altaviz.com
- **Do NOT** open a public GitHub issue for security vulnerabilities
- You will receive acknowledgment within 48 hours
- We aim to provide a fix or mitigation within 7 days for critical issues

## Authentication Model

- **Provider**: NextAuth.js v5 (beta) with Azure AD (Microsoft Entra ID)
- **Strategy**: JWT with 8-hour expiry and hourly token refresh
- **Session enrichment**: `organizationId`, `role`, `subscriptionTier` embedded in JWT
- **Dev credentials**: Disabled by default; requires both `NODE_ENV=development` AND `DEV_CREDENTIALS_ENABLED=true`
- **Dev email allowlist**: Controlled via `DEV_ALLOWED_EMAILS` env var

## Multi-Tenant Data Isolation

- All database queries are scoped by `organization_id` parameter
- Direct `organization_id` column on all data tables (`alert_history`, `maintenance_events`, `data_quality_metrics`, `sensor_readings_agg`)
- API routes extract organization from authenticated session — no client-supplied org IDs in GET requests
- Views (`v_active_alerts`, `v_fleet_health_summary`) filter by organization

## API Security

- **Rate limiting**: 60 requests per minute per IP on all API routes (in-memory, Map-based)
- **Input validation**: All query parameters validated with `validateInt()` (bounds-checked), `validateEnum()` (allowlist), `validateUUID()` (format check)
- **Error handling**: Sanitized error responses with `requestId` for correlation; no stack traces or internal details leaked to clients
- **SQL injection prevention**: All queries use parameterized statements (`$1`, `$2`, ...) — no string interpolation in SQL
- **Timing-safe comparison**: API key auth uses `crypto.timingSafeEqual()` to prevent timing attacks
- **Webhook verification**: Stripe webhooks verified via `constructEvent()` with webhook secret

## Security Headers

Applied via `next.config.ts`:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy`: Restricts script/connect/frame sources to self + Stripe + Azure
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: Camera, microphone, geolocation disabled

## Infrastructure Security

- **Database**: Public network access disabled in production (Terraform)
- **Key Vault**: Purge protection enabled, 90-day soft delete retention
- **Container Registry**: Admin access disabled; managed identity for ACR pull
- **Container Apps**: System-assigned managed identity, 2Gi memory limit
- **Secrets**: All sensitive values in Azure Key Vault; never committed to git

## Environment Variables

Required in production (validated at startup via `lib/env.ts`):

| Variable | Purpose |
|----------|---------|
| `AUTH_SECRET` | JWT signing key (min 32 chars) |
| `DB_PASSWORD` | Database password |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `WORKFLOW_API_KEY` | Cron/scheduler authentication |

## Dependency Management

- `npm audit` run in CI pipeline on every PR
- Trivy filesystem scan for known CVEs
- Dependabot configured for automated dependency updates
- No `--no-verify` or `--force` flags in CI/CD scripts

## Known Limitations

- Rate limiting is in-memory (per-instance); not distributed across replicas. For multi-instance deployments, use Redis-based rate limiting.
- NextAuth.js v5 is still in beta (v5.0.0-beta.30). Monitor for stable release.
- Dev credentials provider relies on `NODE_ENV` which must be correctly set in all environments.
