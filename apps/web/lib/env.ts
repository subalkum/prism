import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),
  NEXT_PUBLIC_APP_ENV: z.string().default("development"),
});

const parsedPublicEnv = publicEnvSchema.safeParse({
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
});

// Don't throw during build — env vars are injected at runtime on Vercel
if (!parsedPublicEnv.success && typeof window !== "undefined") {
  console.error(
    `Invalid frontend environment variables: ${parsedPublicEnv.error.message}`,
  );
}

export const publicEnv = parsedPublicEnv.success
  ? parsedPublicEnv.data
  : {
      NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL ?? "",
      NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
    };

