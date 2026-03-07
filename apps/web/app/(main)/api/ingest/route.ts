import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { FunctionReference } from "convex/server";
import { z } from "zod";

const ingestSchema = z.object({
  userId: z.string().min(1),
  sourceUrl: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  chunkStrategy: z.enum(["fixed", "heading-aware", "semantic"]),
});

const listSchema = z.object({
  userId: z.string().min(1),
});

function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required.");
  }
  return new ConvexHttpClient(url);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, sourceUrl, title, content, chunkStrategy } =
      ingestSchema.parse(body);

    const client = getConvexClient();
    const ingestRef =
      "rag/ingest:ingestDocument" as unknown as FunctionReference<"mutation">;

    const result = await client.mutation(ingestRef, {
      userId,
      sourceUrl,
      title,
      content,
      chunkStrategy,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ status: "error", message }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    const { userId: validatedUserId } = listSchema.parse({ userId });

    const client = getConvexClient();
    const listRef =
      "rag/ingest:listIngestedDocuments" as unknown as FunctionReference<"query">;

    const result = await client.query(listRef, { userId: validatedUserId });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ status: "error", message }, { status: 400 });
  }
}
