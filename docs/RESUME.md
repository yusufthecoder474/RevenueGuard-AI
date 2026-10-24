# Evidence-based resume bullets

- Built RevenueGuard AI using TypeScript, Cloudflare Workers, Zod and D1 to compute decimal-safe sales metrics, verify structured model claims, and store report provenance with SHA-256 hashes.
- Evaluated three validation strategies on 180 controlled reports; the deterministic guard rejected all 140 corrupted cases and accepted all 40 valid cases, compared with 20 detections for schema-only validation.
- Verified the MVP with 249 passing Vitest tests, 20 local Worker/D1 integration checks and 13 Chromium browser checks; integrated Claude and Groq adapters with an explicitly labeled offline demo and attributed UCI data.

Do not turn the second bullet into a claim of 100% real-world hallucination detection. Do not claim live provider benchmarking, cloud deployment, GitHub CI or measured business savings.

## Explain it in an interview

“A business can ask an AI model to summarize sales and get a convincing answer with the wrong numbers. My application calculates the sales facts in code first. Each model claim must cite an approved fact and match its value, currency and period. The guard also verifies an explicitly allowed product-share formula. Unsupported output is rejected rather than silently repaired. I use constrained explanation codes because unrestricted prose would create a verification gap. I tested deliberate errors separately from model behavior; my current benchmark is controlled injection, and live model evaluation is still pending.”

## Technical follow-ups

- Why Decimal.js? Binary floating point cannot exactly represent many monetary decimal values; calculations use supported decimal strings and a documented rounding contract.
- Why Zod plus a second checker? Shape validation can accept a correctly structured but false amount. The deterministic checker compares the candidate to registered evidence.
- Why D1? A small audit table fits the scope and keeps provider, hashes, status and latency together without an unnecessary backend database service.
- Why no RAG/vector database? The source is a small transaction file with calculable facts; document retrieval does not solve this numerical consistency problem.
- Why no free-form narrative? The MVP cannot reliably verify arbitrary implied numbers or causal claims. Approved templates make its acceptance boundary explainable and testable.
