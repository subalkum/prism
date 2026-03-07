import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const hasClerkKeys =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY);

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/chat",
]);

const isPublicRoute = createRouteMatcher([
  "/",
  "/demo",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/research(.*)",
  "/api/ingest(.*)",
  "/api/sessions(.*)",
]);

const middleware = hasClerkKeys
  ? clerkMiddleware(async (auth, req) => {
      // Let public routes through without any Clerk checks
      if (isPublicRoute(req)) {
        return NextResponse.next();
      }

      const { userId, redirectToSignIn } = await auth();

      if (!userId && isProtectedRoute(req)) {
        return redirectToSignIn();
      }

      return NextResponse.next();
    })
  : () => NextResponse.next();

export default middleware;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};