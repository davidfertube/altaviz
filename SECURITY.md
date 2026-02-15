# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

- **Email**: security@altaviz.com
- **Do NOT** open a public GitHub issue for security vulnerabilities
- You will receive acknowledgment within 48 hours
- We aim to provide a fix or mitigation within 7 days for critical issues

## Authentication Model

- **Provider**: NextAuth.js v5 (beta) with GitHub + Google OAuth
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

- **Rate limiting**: 60 requests per minute per IP on general API routes; 10/min on auth endpoints (in-memory, Map-based)
- **CORS**: Origin validation on all API routes; configure `ALLOWED_ORIGINS` env var for additional origins
- **Input validation**: All query parameters validated with `validateInt()` (bounds-checked), `validateEnum()` (allowlist), `validateUUID()` (format check)
- **Error handling**: Sanitized error responses with `requestId` for correlation; no stack traces or internal details leaked to clients
- **SQL injection prevention**: All queries use parameterized statements (`$1`, `$2`, ...) — no string interpolation in SQL
- **Timing-safe comparison**: API key auth uses `crypto.timingSafeEqual()` to prevent timing attacks
- **Webhook verification**: Stripe webhooks verified via `constructEvent()` with webhook secret

## Security Headers

Applied via `next.config.ts`:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy`: Restricts script/connect/frame sources to self + Stripe
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: Camera, microphone, geolocation, accelerometer, gyroscope, magnetometer disabled

## Infrastructure Security

- **Database**: PostgreSQL on Supabase free tier with SSL enforcement
- **SSL**: `rejectUnauthorized: true` by default; set `DATABASE_SSL=false` only for local dev
- **Container Registry**: Admin access disabled; managed identity for ACR pull
- **Secrets**: All sensitive values in environment variables; never committed to git

## Environment Variables

Required in production (validated at startup via `lib/env.ts`):

| Variable | Purpose |
|----------|---------|
| `AUTH_SECRET` | JWT signing key (min 32 chars) |
| `DATABASE_URL` | PostgreSQL connection string |

## Dependency Management

- `npm audit` run in CI pipeline on every PR
- Trivy filesystem scan for known CVEs
- Dependabot configured for automated dependency updates
- No `--no-verify` or `--force` flags in CI/CD scripts

## Known Limitations

- Rate limiting is in-memory (per-instance); not distributed across replicas. For multi-instance deployments, use Redis-based rate limiting.
- CORS origin validation relies on the `Origin` header which is not sent by all clients (e.g., server-side requests, Postman).
- NextAuth.js v5 is still in beta (v5.0.0-beta.30). Monitor for stable release.
- Dev credentials provider relies on `NODE_ENV` which must be correctly set in all environments.
