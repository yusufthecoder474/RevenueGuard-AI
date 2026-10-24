# Research basis and scope

Primary references checked on 23 October 2026. These works motivate design choices; this student project does not reproduce their systems or make comparable performance claims.

| Research | Finding relevant to this project | RevenueGuard response | Boundary |
|---|---|---|---|
| He et al., *Are Large Language Models Reliable Reviewers? A Benchmark for Error Detection in Financial Documents*, Findings of ACL 2026. [Paper](https://aclanthology.org/2026.findings-acl.1481/) · [PDF](https://aclanthology.org/2026.findings-acl.1481.pdf) | Financial-document error detection remains difficult, particularly when reasoning and long context are required. | Use executable checks and explicit error codes rather than asking the generator to certify itself. | Our compact CSV contract does not evaluate long documents, domain knowledge or the FinED-Bench task. |
| Yi He et al., *FinMathBench: A Formula-Driven Benchmark for Evaluating LLMs’ Math Reasoning Capabilities in Finance*, AAAI 2026. [Paper](https://ojs.aaai.org/index.php/AAAI/article/view/40358) · [DOI](https://doi.org/10.1609/aaai.v40i37.40358) | Formula composition, arithmetic and rejection of valid extreme values create difficulties for models. | Decimal arithmetic, authorized formulas and valid extreme-value acceptance tests. | Our error injection is much narrower than the paper's formula-driven question benchmark. |
| Hall, Shome and Eiers, *VeriFin: A Neurosymbolic Framework for Verifying LLM-Generated Financial Claims*, arXiv:2608.10213v2, revised 17 October 2026. [Paper](https://arxiv.org/abs/2608.10213) · [Full text](https://arxiv.org/html/2608.10213v2) | Claim verification needs grounded facts, authorized calculations, units and reporting periods. | Registered fact IDs and deterministic checks on values, periods, units and one allowed percentage formula. | We do not implement XBRL grounding, Z3, unsatisfiable cores or solver-guided repair. |

Practical engineering contribution: a small, reproducible CSV-to-report pipeline that separates numerical truth from model output and records acceptance decisions. This is an implementation project, not a claim of a novel general verifier.

Self-verification policy: the generator never determines acceptance. The same deterministic checker applies to MockAdapter, Claude and the Groq open-weight adapter. Narrative is limited to pre-approved explanation codes. Quantitative sentences come from source facts; arbitrary prose is rejected even if it contains no digits. This deliberately trades generative freedom for a contract that can be checked.

## Platform documentation

- [Cloudflare Workers local testing](https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/). This project uses Vitest for unit tests and an independent HTTP script against Wrangler/workerd and local D1 for runtime integration.
- [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).
- [Cloudflare static assets](https://developers.cloudflare.com/workers/static-assets/).
- [Claude Messages API](https://platform.claude.com/docs/en/api/messages/create).
- [Groq OpenAI-compatible endpoint](https://console.groq.com/docs/openai) and [supported models](https://console.groq.com/docs/models).
- [Groq model deprecations](https://console.groq.com/docs/deprecations). OpenModelAdapter defaults to `openai/gpt-oss-120b`, an open-weight model listed in the provider documentation at review time. Claude defaults to `claude-sonnet-5-5`. Both model IDs are configurable; account availability and live API behavior are untested here.

## Dataset attribution

Chen, D. (2015). *Online Retail* [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5BW33. Licensed CC BY 4.0. See [data provenance](../data/README.md) and the conversion manifest for modifications.
