/**
 * Real LLM provider client with mode-aware fallback chains:
 * - quick: Gemini (primary) -> OpenAI -> Groq -> Cerebras
 * - deep: OpenAI (primary) -> Gemini -> Groq -> Cerebras
 *
 * NOTE: "use node" is NOT set here — this file is imported by researchAgent.ts
 * which has "use node". Convex bundles imports into the caller's runtime.
 *
 * All three expose OpenAI-compatible or simple REST chat completion endpoints.
 * This module is designed to run inside a Convex **action** (which can make
 * external HTTP calls). It must NOT be called from mutations/queries.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProviderName = "openai" | "gemini" | "groq" | "cerebras";
export type RouteKind = "primary" | "fallback";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  mode: "quick" | "deep";
  /** Previous conversation messages for multi-turn context */
  conversationHistory?: ChatMessage[];
  /** Max tokens to generate */
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
  provider: ProviderName;
  model: string;
  route: RouteKind;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}

interface ProviderConfig {
  name: ProviderName;
  route: RouteKind;
  quickModel: string;
  deepModel: string;
  call: (
    model: string,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
    history: ChatMessage[],
    timeoutMs: number,
  ) => Promise<{ text: string; promptTokens: number; completionTokens: number }>;
}

// ---------------------------------------------------------------------------
// Timeout helper — creates an AbortSignal that fires after `ms` milliseconds
// ---------------------------------------------------------------------------

function createTimeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

// ---------------------------------------------------------------------------
// OpenAI (OpenAI-compatible – api.openai.com)
// ---------------------------------------------------------------------------

async function callOpenAI(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  history: ChatMessage[],
  timeoutMs: number,
) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: "user", content: userPrompt });

  const { signal, clear } = createTimeoutSignal(timeoutMs);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.4,
      }),
      signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`OpenAI ${res.status}: ${errorBody.slice(0, 300)}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    const text: string = json?.choices?.[0]?.message?.content ?? "";
    const usage = json?.usage ?? {};

    return {
      text,
      promptTokens: (usage.prompt_tokens as number) ?? estimateTokens(systemPrompt + userPrompt),
      completionTokens: (usage.completion_tokens as number) ?? estimateTokens(text),
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`OpenAI timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clear();
  }
}

// ---------------------------------------------------------------------------
// Gemini (Google AI Studio REST – generativelanguage.googleapis.com)
// ---------------------------------------------------------------------------

async function callGemini(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  history: ChatMessage[],
  timeoutMs: number,
) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build Gemini contents array with conversation history
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  for (const msg of history) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }

  // Add the current user message
  contents.push({ role: "user", parts: [{ text: userPrompt }] });

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.4,
    },
  };

  const { signal, clear } = createTimeoutSignal(timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Gemini ${res.status}: ${errorBody.slice(0, 300)}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    const text: string =
      json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const usage = json?.usageMetadata ?? {};

    return {
      text,
      promptTokens: (usage.promptTokenCount as number) ?? estimateTokens(userPrompt + systemPrompt),
      completionTokens: (usage.candidatesTokenCount as number) ?? estimateTokens(text),
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Gemini timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clear();
  }
}

// ---------------------------------------------------------------------------
// Groq (OpenAI-compatible – api.groq.com)
// ---------------------------------------------------------------------------

async function callGroq(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  history: ChatMessage[],
  timeoutMs: number,
) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }

  // Build OpenAI-format messages array
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: "user", content: userPrompt });

  const { signal, clear } = createTimeoutSignal(timeoutMs);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.4,
      }),
      signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Groq ${res.status}: ${errorBody.slice(0, 300)}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    const text: string = json?.choices?.[0]?.message?.content ?? "";
    const usage = json?.usage ?? {};

    return {
      text,
      promptTokens: (usage.prompt_tokens as number) ?? estimateTokens(systemPrompt + userPrompt),
      completionTokens: (usage.completion_tokens as number) ?? estimateTokens(text),
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Groq timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clear();
  }
}

// ---------------------------------------------------------------------------
// Cerebras (OpenAI-compatible – api.cerebras.ai)
// ---------------------------------------------------------------------------

async function callCerebras(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  history: ChatMessage[],
  timeoutMs: number,
) {
  const apiKey = process.env.CEREBRAS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("CEREBRAS_API_KEY is not set");
  }

  // Build OpenAI-format messages array
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: "user", content: userPrompt });

  const { signal, clear } = createTimeoutSignal(timeoutMs);
  try {
    const res = await fetch(
      "https://api.cerebras.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.4,
        }),
        signal,
      },
    );

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Cerebras ${res.status}: ${errorBody.slice(0, 300)}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    const text: string = json?.choices?.[0]?.message?.content ?? "";
    const usage = json?.usage ?? {};

    return {
      text,
      promptTokens: (usage.prompt_tokens as number) ?? estimateTokens(systemPrompt + userPrompt),
      completionTokens: (usage.completion_tokens as number) ?? estimateTokens(text),
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Cerebras timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clear();
  }
}

// ---------------------------------------------------------------------------
// Token estimation fallback (when provider doesn't return usage)
// ---------------------------------------------------------------------------

import { estimateTokens } from "../lib/utils";

// ---------------------------------------------------------------------------
// Fallback chain: mode-aware provider ordering
// ---------------------------------------------------------------------------

function getProviderChain(): ProviderConfig[] {
  return [
    {
      name: "openai",
      route: "primary",
      quickModel: "gpt-4.1-mini",
      deepModel: "gpt-4.1",
      call: callOpenAI,
    },
    {
      name: "gemini",
      route: "fallback",
      quickModel: "gemini-2.0-flash",
      deepModel: "gemini-2.5-pro-preview-05-06",
      call: callGemini,
    },
    {
      name: "groq",
      route: "fallback",
      quickModel: "llama-3.3-70b-versatile",
      deepModel: "llama-3.3-70b-versatile",
      call: callGroq,
    },
    {
      name: "cerebras",
      route: "fallback",
      quickModel: "llama-3.3-70b",
      deepModel: "llama-3.3-70b",
      call: callCerebras,
    },
  ];
}

function getRouteKind(index: number): RouteKind {
  return index === 0 ? "primary" : "fallback";
}

function getProviderChainForMode(mode: "quick" | "deep"): ProviderConfig[] {
  const providers = getProviderChain();

  if (mode === "deep") {
    return providers.map((provider, index) => ({
      ...provider,
      route: getRouteKind(index),
    }));
  }

  const quickOrder = ["gemini", "openai", "groq", "cerebras"] as const;
  const reordered = quickOrder
    .map((name) => providers.find((provider) => provider.name === name))
    .filter((provider): provider is ProviderConfig => provider !== undefined);

  return reordered.map((provider, index) => ({
    ...provider,
    route: getRouteKind(index),
  }));
}

/** Timeout per provider: quick mode = 30s, deep mode = 120s */
function getTimeoutMs(mode: "quick" | "deep"): number {
  return mode === "deep" ? 120_000 : 30_000;
}

/**
 * Try each provider in order. Return on first success, or throw if all fail.
 */
export async function callLLMWithFallback(
  request: LLMRequest,
): Promise<LLMResponse> {
  const chain = getProviderChainForMode(request.mode);
  const maxTokens = request.maxTokens ?? (request.mode === "deep" ? 4096 : 1500);
  const history = request.conversationHistory ?? [];
  const timeoutMs = getTimeoutMs(request.mode);
  const errors: string[] = [];

  for (const provider of chain) {
    const model =
      request.mode === "deep" ? provider.deepModel : provider.quickModel;
    const start = Date.now();

    try {
      const result = await provider.call(
        model,
        request.systemPrompt,
        request.userPrompt,
        maxTokens,
        history,
        timeoutMs,
      );

      const latencyMs = Date.now() - start;
      console.log(
        `[LLM] ${provider.name}/${model} succeeded in ${latencyMs}ms (route: ${provider.route})`,
      );
      return {
        text: result.text,
        provider: provider.name,
        model,
        route: provider.route,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.promptTokens + result.completionTokens,
        latencyMs,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const elapsed = Date.now() - start;
      errors.push(`[${provider.name}/${model}] ${msg}`);
      console.error(
        `[LLM] ${provider.name}/${model} FAILED after ${elapsed}ms: ${msg}`,
      );
      // continue to next provider
    }
  }

  throw new Error(
    `All LLM providers failed:\n${errors.join("\n")}`,
  );
}
