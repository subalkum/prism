# Research Agent Runbook

## Scope

Operational runbook for the Perplexity-style technical research MVP across:
- `apps/web` (UI),
- `packages/backend/convex` (agent orchestration, memory, RAG, telemetry),
- `packages/shared` (Zod contracts).

## Reliability Controls

- Provider fallback order: `gemini` -> `groq` -> `cerebras`.
- Validation guardrail: all agent responses must pass `researchResponseSchema`.
- Repair/fallback: if validation fails after bounded retries, return safe fallback with limitations.
- Ambiguity gate: low-specificity queries trigger clarification prompt before synthesis.

## SLO Targets

- Quick mode p95 latency target: under 2 minutes.
- Deep mode p95 latency target: under 10 minutes.
- Citation coverage target: at least one citation for grounded answers where indexed sources exist.

## Incident Triage

1. Check frontend behavior (`pnpm dev:web`) for UI mode switch and source panel regressions.
2. Check backend logs (`pnpm dev:convex`) for:
   - validation failures,
   - fallback route usage spikes,
   - missing citations.
3. Review telemetry summary via `getUsageSummary()` and inspect:
   - request count,
   - error count,
   - average latency,
   - total estimated cost.
4. If fallback rate is elevated:
   - validate provider credentials,
   - confirm routing order,
   - reduce prompt breadth and retry.

## Integration Verification

Run type checks:
- `pnpm typecheck`

Use integration harness from:
- `packages/backend/convex/tests/researchAgent.integration.ts`

The suite covers:
- quick/deep orchestration paths,
- ambiguity clarification behavior,
- memory retrieval relevance,
- telemetry capture.

## Deployment Checklist

- Env vars set in Vercel and Convex for target environment.
- Convex schema pushed before frontend promotion.
- Confirm fallback providers are configured.
- Confirm runbook and deploy docs reflect current endpoints and environment names.
