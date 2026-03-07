import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { FunctionReference } from "convex/server";
import { z } from "zod";

const requestSchema = z.object({
  userId: z.string().min(1),
  query: z.string().min(1),
  mode: z.enum(["quick", "deep"]),
  sessionId: z.string().optional(),
  parentInsightId: z.string().optional(),
});

function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required to run research queries.");
  }
  return new ConvexHttpClient(url);
}

/**
 * Streaming research endpoint — calls the Convex action and streams the
 * response back via SSE (Server-Sent Events).
 *
 * Event types:
 *   - "status"  → loading step updates (retrieving, analyzing, generating)
 *   - "chunk"   → incremental answer text tokens
 *   - "result"  → full structured response (citations, tradeoffs, telemetry, etc.)
 *   - "error"   → error message
 *   - "done"    → stream complete
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      }

      try {
        const body = await request.json();
        const { userId, query, mode, sessionId, parentInsightId } =
          requestSchema.parse(body);

        // Step 1: Send loading status updates
        send("status", { step: "retrieving", message: "Retrieving sources..." });

        const client = getConvexClient();
        const runResearchRef =
          "agents/researchAgent:runResearch" as unknown as FunctionReference<"action">;

        // Step 2: Call the Convex action (this is the slow part)
        // We send status updates to keep the connection alive
        const statusInterval = setInterval(() => {
          send("status", { step: "analyzing", message: "Analyzing context..." });
        }, 3000);

        const generatingTimeout = setTimeout(() => {
          send("status", { step: "generating", message: "Generating answer..." });
        }, 5000);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: any;
        try {
          result = await client.action(runResearchRef, {
            userId,
            query,
            mode,
            sessionId: sessionId as never,
            parentInsightId: parentInsightId as never,
          });
        } finally {
          clearInterval(statusInterval);
          clearTimeout(generatingTimeout);
        }

        // Step 3: Stream the answer text word-by-word
        send("status", { step: "streaming", message: "Streaming response..." });

        const answerText: string = result.answer ?? "";
        const words = answerText.split(/(\s+)/);

        // Stream in word batches for smooth rendering
        const batchSize = 3;
        for (let i = 0; i < words.length; i += batchSize) {
          const batch = words.slice(i, i + batchSize).join("");
          send("chunk", { text: batch });
          // Small delay between batches for visual streaming effect
          await new Promise((resolve) => setTimeout(resolve, 15));
        }

        // Step 4: Send the full structured result (without answer text, already streamed)
        send("result", result);

        // Step 5: Done
        send("done", {});
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unexpected error";
        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
