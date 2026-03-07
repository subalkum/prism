"use client";

import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-6">
        <div className="max-w-md rounded-2xl border border-border bg-surface-raised p-8 text-center shadow-card">
          <h1 className="text-2xl font-semibold text-tx">Auth not configured</h1>
          <p className="mt-3 text-sm text-tx-secondary">
            Sign-up is unavailable because Clerk keys have not been configured for this deployment.
          </p>
          <Link
            href="/demo"
            className="mt-6 inline-flex rounded-full bg-[#131313] px-5 py-3 text-sm font-medium text-white"
          >
            Continue to demo
          </Link>
        </div>
      </main>
    );
  }

  return <SignUp forceRedirectUrl="/chat" />;
}
