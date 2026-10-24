# Observed and Injected LLM Failures

## Live observed model failures

**None collected.** No Claude or Groq live inference was executed. There is no measured live hallucination rate, model-quality comparison or provider latency benchmark. Provider tests use mocked HTTP transport; application demos use MockAdapter. HTTP `PROVIDER_UNAVAILABLE` responses are operational failures, not evidence of LLM hallucination.

## Controlled injected failures

`tests/fixtures.ts` deliberately constructs 140 invalid and 40 valid reports across ten varied fact sets. These are controlled test cases, not text observed from a live model. The fixture inputs include decimal rounding and valid extreme amounts. `docs/results/controlled-cases.json` records every input fact set, candidate, category and ground-truth label.

The dashboard's **Test an injected error** action takes a deterministic mock report and replaces only its `sales_total` claim with `999999999.99`. This is explicitly marked as an injection. The captured [rejection inspector](screenshots/rejection-inspector.png) shows the actual request result: `VALUE_MISMATCH`, a rejected verdict, the authoritative source value and the corrupted candidate. The report is not silently repaired or accepted.

| Controlled corruption | Check |
|---|---|
| Revenue increased while source remains unchanged | `VALUE_MISMATCH` |
| GBP replaced by USD | `UNIT_MISMATCH` |
| Correct value attached to a different period | `PERIOD_MISMATCH` |
| Order count altered | `VALUE_MISMATCH` |
| Evidence ID replaced or invented metric appended | `MISSING_EVIDENCE` |
| Required revenue fact removed | `MISSING_REQUIRED_FACT` |
| JSON number supplied instead of decimal string | `SCHEMA_INVALID` |
| Extra fraction of a penny supplied | `VALUE_MISMATCH` |
| Product share percentage replaced | `PERCENTAGE_MISMATCH` |
| NaN or Infinity supplied as string | `NON_FINITE_OR_INVALID_NUMBER` |
| Arbitrary narrative added, including spelled-out numbers | `SCHEMA_INVALID` |
| Duplicate quantitative claim | `CONFLICTING_CLAIMS` |
| Unapproved percentage operands | `UNAUTHORIZED_CALCULATION` |

## Baseline definitions

The positive class is an invalid report. A rejection is a detection. TP = invalid rejected; FP = valid rejected; FN = invalid accepted; TN = valid accepted.

- Precision = TP / (TP + FP); reported as null when no reports are rejected.
- Recall = TP / (TP + FN).
- False-accept rate = FN / (TP + FN), measured among invalid reports.
- False-reject rate = FP / (FP + TN), measured among valid reports.

No guard accepts every candidate. Zod-only checks shape and allowed enum values but does not compare values to evidence. The full guard adds deterministic evidence and formula verification. All strategies use exactly the same fixtures. The resulting perfect score for the full guard applies only to these designed fixtures and the deliberately narrow output contract. It is not proof that all financial hallucinations can be detected.

Regenerate the benchmark with `npm run benchmark`; run `npm run build` afterward to refresh the UI's benchmark table.
