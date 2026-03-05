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

/** GET /api/sessions?userId=xxx — list user sessions */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ message: "userId is required" }, { status: 400 });
    }

    const client = getConvexClient();
    const ref = "agents/sessions:getUserSessions" as unknown as FunctionReference<"query">;
    const sessions = await client.query(ref, { userId, limit: 30 });

    return NextResponse.json(sessions, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
