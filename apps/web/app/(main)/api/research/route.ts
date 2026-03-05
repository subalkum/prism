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
    const {userId,query,mode,sessionId,parentInsightId} = requestSchema.parse(body);
    if (!userId) throw new Error("User ID is required to run research queries.");
    if (!query) throw new Error("Query is required to run research queries.");
    if (!mode) throw new Error("Mode is required to run research queries.");
    const client = getConvexClient();
    console.log(userId,query,mode,sessionId,parentInsightId);
    const runResearchRef =
      "agents/researchAgent:runResearch" as unknown as FunctionReference<"action">;
    const result = await client.action(runResearchRef, {
      userId: userId,
      query: query,
      mode: mode,
      sessionId: sessionId as never,
      parentInsightId: parentInsightId as never,
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
