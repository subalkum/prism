import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { FunctionReference } from "convex/server";

function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required.");
  }
  return new ConvexHttpClient(url);
}

/** GET /api/sessions/[sessionId] — get full session messages + insights */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ message: "sessionId is required" }, { status: 400 });
    }

    const client = getConvexClient();
    const ref = "agents/sessions:getSessionMessages" as unknown as FunctionReference<"query">;
    const data = await client.query(ref, { sessionId });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
