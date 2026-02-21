import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);
    const client = getConvexClient();

    const runResearchRef =
      "agents/researchAgent:runResearch" as unknown as FunctionReference<"action">;
    const result = await client.action(runResearchRef, {
      userId: parsed.userId,
      query: parsed.query,
      mode: parsed.mode,
      sessionId: parsed.sessionId as never,
      parentInsightId: parsed.parentInsightId as never,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json(
      {
        status: "error",
        message,
      },
      { status: 400 },
    );
  }
}
