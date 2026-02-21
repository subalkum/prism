# Perplexity-Style Technical Research Agent

Production-oriented research assistant scaffold using Next.js + Convex.

## What is implemented

- Dual research modes:
  - `quick` mode target under 2 minutes
  - `deep` mode target under 10 minutes
- Persistent memory:
  - profile preferences (code examples, verbosity, citation style)
  - episodic session memory entries
- Convex-backed RAG:
  - ingestion with `fixed`, `heading-aware`, and `semantic` chunking
  - retrieval scoring + citation mapping
- Structured responses + guardrails:
  - Zod response validation with fallback safe response
- Telemetry and cost accounting:
  - per-query prompt/completion tokens
  - latency and estimated cost tracking
  - provider/model route metadata
- Perplexity-style UI:
  - chat workflow, mode switch, source panel, follow-up prompts

## Monorepo layout

- `apps/web` - Next.js App Router UI and API route
- `packages/backend` - Convex schema/functions
- `packages/shared` - shared Zod contracts/types
- `docs` - deployment + production notes

## Local setup

1. Install dependencies:
   - `pnpm install`
2. Set required env vars:
   - `NEXT_PUBLIC_CONVEX_URL`
3. Run frontend:
   - `pnpm dev:web`
4. Run Convex backend:
   - `pnpm dev:convex`

## Main flows

- `POST /api/research` in web app calls Convex mutation `agents/researchAgent:runResearch`
- agent writes session/messages/insights/citations + usage telemetry
- RAG data is ingested via `rag/ingest:ingestDocument`
- retrieval is served by `rag/retrieve:retrieveChunks`

## Verification

- Typecheck all packages:
  - `npm run typecheck`
- Lint web app:
  - `npm run lint`
