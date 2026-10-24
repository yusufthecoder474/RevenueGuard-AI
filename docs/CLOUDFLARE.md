# Cloudflare preparation (not deployed)

The code was built with Wrangler dry-run and exercised against local workerd and D1 emulation. No remote database was created and no public deployment was performed. `workers_dev` and preview URLs are disabled in `wrangler.toml`.

Local use needs no Cloudflare account or cloud database ID. The zero UUID is a documented local placeholder, not a real remote resource.

Only after deciding to deploy to a private/restricted environment, the operator can prepare a real D1 database:

```powershell
npx wrangler login
npx wrangler d1 create revenueguard
```

Copy the returned database ID into `wrangler.toml`. Never reuse the placeholder for a real deployment. Apply migrations and configure secrets:

```powershell
npx wrangler d1 migrations apply revenueguard --remote
npx wrangler secret put WRITE_SECRET
# Only if you intend to enable the respective live provider:
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put GROQ_API_KEY
```

Use a strong unique WRITE_SECRET. Without it, non-loopback API requests fail closed; with it, all API routes require the matching bearer token. No account/login system is provided. Add a private route protected by Cloudflare Access or your organization's equivalent restriction. Configure that route explicitly; no route is bundled.

Build locally with:

```powershell
npm ci
npm run typecheck
npm run benchmark
npm run build
npm test
```

`npm run build` bundles assets and performs `wrangler deploy --dry-run`; it does not publish. Do not issue a real `wrangler deploy` until the owner explicitly authorizes that deployment and the route/secret/database configuration has been reviewed.

Remote D1 behavior, Cloudflare Access, deployed routing, provider billing and real inference remain untested. The MVP has no distributed quotas or production abuse controls. Treat the shared token as a trusted-operator boundary, not multi-tenant authentication.
