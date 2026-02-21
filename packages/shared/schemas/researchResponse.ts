import { z } from "zod";

export const researchCitationSchema = z.object({
  sourceId: z.string().optional(),
  chunkId: z.string().optional(),
  title: z.string(),
  url: z.string().url(),
  snippet: z.string(),
  relevance: z.number().min(0).max(1).optional(),
  /** Citation label used for inline references, e.g. "[1]" */
  label: z.number().int().positive().optional(),
});

export const researchTradeoffSchema = z.object({
  option: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
});

export const clarificationPromptSchema = z.object({
  question: z.string(),
  reason: z.string(),
});

export const researchTelemetrySchema = z.object({
  provider: z.string(),
  model: z.string(),
  route: z.enum(["primary", "fallback"]),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  estimatedCostUsd: z.number().nonnegative(),
  latencyMs: z.number().nonnegative(),
});

export const researchModeSchema = z.enum(["quick", "deep"]);

export const researchResponseSchema = z.object({
  mode: researchModeSchema,
  status: z.enum(["answered", "needs_clarification", "fallback"]),
  answer: z.string(),
  citations: z.array(researchCitationSchema).default([]),
  tradeoffs: z.array(researchTradeoffSchema).default([]),
  followUpQuestions: z.array(z.string()).default([]),
  clarificationPrompt: clarificationPromptSchema.optional(),
  confidence: z.number().min(0).max(1),
  limitations: z.array(z.string()).default([]),
  telemetry: researchTelemetrySchema.optional(),
});

export type ResearchCitation = z.infer<typeof researchCitationSchema>;
export type ResearchMode = z.infer<typeof researchModeSchema>;
export type ResearchResponse = z.infer<typeof researchResponseSchema>;
