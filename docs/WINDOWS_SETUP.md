# Windows PowerShell setup

Use Node.js 24 LTS and npm. Git is needed only to publish. Python is optional for reprocessing Excel; the bundled real/synthetic CSVs need no Python installation.

## Run the working offline application

Open PowerShell in the folder containing RevenueGuard-AI.zip:

```powershell
Expand-Archive -Path .\RevenueGuard-AI.zip -DestinationPath .\RevenueGuard-AI-Extracted
Set-Location .\RevenueGuard-AI-Extracted\RevenueGuard-AI
node --version
npm --version
npm ci
Copy-Item .env.example .dev.vars
npm run typecheck
npm run benchmark
npm run build
npm run db:local
npm test
npm run test:workers
npm run dev
```

Open http://127.0.0.1:8787. Click **Load synthetic demo** or **Load UCI real sample**, then **Generate report**. MockAdapter is deterministic and requires no API credentials. Use **Test an injected error** to see `VALUE_MISMATCH` in the inspector.

Do not run the integration or screenshot server on a port already occupied by another dev server. `npm run test:workers` uses port 8790; screenshots use 8787. Close `npm run dev` with Ctrl+C before running screenshots.

## Reproduce browser checks and screenshots

```powershell
npx playwright install chromium
npm run screenshots
```

Screenshots and browser assertions are produced by a real headless Chromium session. This repository includes previously captured screenshots and a browser-check result file. For a locally installed Chrome executable, an optional override is:

```powershell
$env:CHROMIUM_EXECUTABLE_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run screenshots
Remove-Item Env:CHROMIUM_EXECUTABLE_PATH
```

The screenshot suite expects empty provider credentials and no access token to verify provider-unavailable behavior. Keep `.dev.vars` blank while reproducing that suite. Both the browser suite and Worker integration suite insert metadata rows into local D1; they do not send live inference requests.

## Optional live providers

Edit `.dev.vars` in a trusted local editor:

```dotenv
ANTHROPIC_API_KEY="your-own-key"
GROQ_API_KEY="your-own-key"
WRITE_SECRET=""
CLAUDE_MODEL="claude-sonnet-5-5"
OPEN_MODEL="openai/gpt-oss-120b"
```

Restart `npm run dev` and select a provider. This sends registered aggregate facts to that provider and may incur charges. It does not send raw rows, names, invoice numbers or customer identifiers. The same local checker verifies the returned JSON. Provider prompts request structured output; malformed or unsupported outputs are rejected. Live availability and model behavior have not been verified in the supplied results. IDs are configurable because provider catalogs change.

Never commit `.dev.vars`, `.env` or keys. Wrangler local development uses `.dev.vars`; `.env.example` is a committed template only.

## Reprocess real data

See [data/README.md](../data/README.md) for the exact download, environment and pandas conversion commands. Then run `npm run build` to bundle the updated CSV for the dashboard.

## Troubleshooting

- **D1 table missing:** stop the dev server and run `npm run db:local`.
- **Demo missing or benchmark not populated:** run `npm run benchmark`, then `npm run build`.
- **Provider unavailable:** this is expected without the corresponding key. Do not describe the offline demo as a live model response.
- **Column/date errors:** use the documented CSV headers and ISO dates; do not upload the original Excel file directly.
- **401:** configure the same `WRITE_SECRET` through the dashboard's access-token button. The token is held only in memory.
- **Sandbox cannot enumerate interfaces:** `scripts/local-env.mjs` automatically supplies a loopback-only compatibility shim when Node's `os.networkInterfaces()` throws. It is used only for local CLI startup; it does not modify deployed Worker logic. This was needed on the build host.
