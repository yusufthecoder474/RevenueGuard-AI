# Local API

All endpoints are same-origin JSON except the CSV export. Server recalculates facts from the CSV for every request. Client-supplied facts are never trusted. The app keeps the raw CSV in browser memory for the session and request processing; D1 retains only run metadata and hashes.

| Method | Route | Request | Result |
|---|---|---|---|
| GET | `/api/health` | — | Runtime status and configured provider flags |
| POST | `/api/facts` | `{ "csv": "..." }` | FactSet, SHA-256 input hash and fact-set hash |
| POST | `/api/reports` | `{ "csv": "...", "provider": "mock" }` | Candidate, guard verdict, authoritative facts, audit ID and provenance |
| POST | `/api/reports` | Above plus `"injectFailure": true`, mock only | Explicitly labeled controlled revenue mismatch |
| POST | `/api/export` | `{ "csv": "..." }` | Source-calculated facts as CSV |
| GET | `/api/audit` | — | Latest 25 run metadata records |

Report provider is `mock`, `claude` or `open`. Optional `injectFailure` defaults false. Requests use strict Zod schemas. Unexpected fields are rejected. CSV limit: 1 MiB / 10,000 rows. Request body limit: 2 MiB, enforced while streaming rather than solely from Content-Length.

Status codes: 200 for facts, accepted reports and guarded rejection (inspect `status`); 400 for invalid requests; 401 for token failure; 403 for mismatched Origin; 503 for provider unavailable, timeout or audit failure. Audit insertion must succeed before a report is returned as accepted. Each valid report request records acceptance, rejection or provider failure in D1. Invalid upload requests have no report record.

D1 fields: ID, UTC timestamp, input hash, provider/model, prompt version, fact-set hash, validation status, failure reason, elapsed generation/guard latency in milliseconds, token usage if returned and nullable cost. Latency excludes database insertion and browser/network round-trip. Null cost means unknown; it is never a fabricated zero-cost inference claim.

Remote API access fails closed unless `WRITE_SECRET` is configured; then every endpoint including audit and health requires `Authorization: Bearer <secret>`. Loopback is open by default for local development only. The dashboard's Configure access token button keeps a supplied secret only in memory. The server uses parameterized SQL and never returns API keys. The public static shell and bundled demo CSVs contain only synthetic or attributed public UCI data.

Error codes include `SCHEMA_INVALID`, `MISSING_EVIDENCE`, `MISSING_REQUIRED_FACT`, `VALUE_MISMATCH`, `UNIT_MISMATCH`, `PERIOD_MISMATCH`, `PERCENTAGE_MISMATCH`, `NON_FINITE_OR_INVALID_NUMBER`, `UNAUTHORIZED_CALCULATION`, `CONFLICTING_FACTS`, `CONFLICTING_CLAIMS` and `ZERO_DENOMINATOR`. Provider codes include `PROVIDER_UNAVAILABLE`, `PROVIDER_TIMEOUT`, `PROVIDER_HTTP` and `MALFORMED_JSON`.

Outbound provider requests use fixed official HTTPS endpoints, per-attempt AbortController deadlines of 12 seconds, and at most two attempts for transient/network/timeout errors. Auth/client errors and invalid JSON are not retried. Provider raw error bodies are not disclosed. This MVP has no shared rate limiter, user accounts or per-user quotas; keep any future deployment private to a trusted operator.
