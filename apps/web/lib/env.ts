import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),
  NEXT_PUBLIC_APP_ENV: z.string().default("development"),
});

const parsedPublicEnv = publicEnvSchema.safeParse({
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
});

if (!parsedPublicEnv.success) {
  throw new Error(
    `Invalid frontend environment variables: ${parsedPublicEnv.error.message}`,
  );
}

export const publicEnv = parsedPublicEnv.data;

