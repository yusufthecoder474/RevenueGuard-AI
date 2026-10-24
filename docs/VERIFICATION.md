# Executed verification

Recorded on 23 October 2026. Linux build host, Node.js 24.19.0. Versions are pinned in package-lock.json.

| Command / check | Executed outcome |
|---|---|
| `npm install --no-fund --no-audit` | Dependencies installed successfully after resolving an unavailable date-based Workers types version; exact resolution locked |
| `npm run typecheck` | Backend and frontend TypeScript checks passed |
| `npm run benchmark` | 180 controlled cases: 140 invalid and 40 valid; JSON and individual cases saved |
| `npm run build` | Browser assets bundled; Wrangler Worker dry-run passed, no remote deployment |
| `npm run db:local` | Local D1 migration applied successfully |
| `npm test` | 249 passed, zero failed; [Vitest JSON](results/vitest.json) |
| `npm run test:workers` | 20 passed against actual local workerd and D1; [result](results/worker-integration.json) |
| `npm run screenshots` with local Chromium executable override | 13 browser checks passed; four real screenshots captured; [result](results/browser-checks.json) |
| `python scripts/prepare_uci.py ... --limit 200` | Downloaded actual UCI Excel source, validated 541,909 rows at ingestion, exported first 200 eligible rows; [conversion](results/uci-conversion.json) |

## Controlled benchmark

All three strategies use the same 180 labeled fixtures. Full guard: TP 140, FP 0, FN 0, TN 40. Schema-only: TP 20, FP 0, FN 120, TN 40. No guard: TP 0, FP 0, FN 140, TN 40. See [definitions and caveats](FAILURES.md). These are not genuine observed model failures or external research benchmark scores.

## Environment details and resolved issues

- The build host cannot enumerate OS network interfaces. The local launcher detects that error and supplies a loopback-only CLI compatibility shim. Actual workerd execution and local D1 were used; no HTTP or database mock stands in for integration results.
- Standard Playwright browser downloads returned invalid archives on this host. A Chromium executable distributed through the `@sparticuz/chromium` npm package was extracted into scratch and used with `CHROMIUM_EXECUTABLE_PATH`; see the recorded browser version. That external binary is not included in the source ZIP. Standard Windows setup uses `npx playwright install chromium` or an installed Chrome executable.
- Initial development checks exposed a frontend/Workers DOM type conflict, two incorrect integration-test expectations and static headers bypassing Worker routing. Separate frontend typechecking, corrected assertions and `run_worker_first = true` resolved them. Current passing evidence describes the final behavior.
- D1 integration and screenshots create local audit rows. Local database contents are excluded from the bundle.

## Not tested / not claimed

No live Claude/Groq inference, live-model benchmark, provider billing measurement, remote D1, public Cloudflare route, CI workflow, cross-browser coverage or real Windows execution. PowerShell instructions are provided, but Windows was not available on this host. No coverage percentage or business ROI is claimed.

The source package includes executable unit tests, local runtime integration, screenshot capture and benchmark generation so these results can be independently reproduced.
