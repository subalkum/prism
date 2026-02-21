# Operations Notes

## Cost model

Estimated USD cost per request:

- `cost = (promptTokens + completionTokens) / 1000 * providerPricePer1k`
- Current defaults in telemetry module:
  - gemini: `0.005`
  - groq: `0.002`
  - cerebras: `0.0015`

## Recovery behavior

- Validation failure -> fallback response with status `fallback`
- Low retrieval evidence -> model route degrades to fallback provider metadata
- Ambiguous query -> status `needs_clarification` and follow-up prompts

## Integration test entrypoint

- `packages/backend/convex/tests/researchAgent.integration.ts`
- This verifies:
  - chunking strategy behavior
  - lexical retrieval scoring
  - memory preference parsing
  - ambiguity detection
  - token/cost estimation

## Production checklist

- Enable provider API keys and secrets per environment.
- Enforce auth identity propagation from frontend to Convex `userId`.
- Monitor p95 latency for quick/deep mode separately.
- Monitor cost per response and source citation coverage.
