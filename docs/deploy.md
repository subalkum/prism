# Deploy Guide (Vercel + Convex)

## Architecture split

- Frontend/API: Vercel (`apps/web`)
- Stateful backend + memory + RAG: Convex (`packages/backend/convex`)

## Required environment variables

### Vercel (web)

- `NEXT_PUBLIC_CONVEX_URL` - Convex deployment URL
- Optional auth integration variables (Clerk/NextAuth)

### Convex

- `CONVEX_DEPLOYMENT`
- Provider keys if connecting external LLM APIs (Gemini/Groq/Cerebras)

## Deployment steps

1. Deploy Convex backend first:
   - `pnpm --filter @ai/backend dev` for dev
   - `pnpm --filter @ai/backend deploy` for prod
2. Deploy Next.js app to Vercel:
   - root directory: `apps/web`
   - add `NEXT_PUBLIC_CONVEX_URL` pointing to matching Convex environment
3. Promote Convex then Vercel in the same environment order (dev -> preview -> prod)

## Latency and mode guarantees

- Quick mode budget: under 2 minutes (target)
- Deep mode budget: under 10 minutes (target)
- In code, each response records latency and cost telemetry to support SLO tracking.

## Error handling and fallback

- Agent validates output with Zod before returning response.
- If validation fails, agent returns a bounded fallback-safe response.
- Provider fallback route metadata is persisted per request (`primary` vs `fallback`).

## Recommended production hardening

- Add provider retries with exponential backoff.
- Add alerting on error rate, timeout rate, and cost drift.
- Add auth middleware (Clerk/NextAuth) and propagate user identity to Convex `userId`.
