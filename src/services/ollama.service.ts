import { env } from '../config/env.js';
import { AppError } from '../middleware/errors.js';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface OllamaChatResponse {
  message?: { role?: string; content?: string; thinking?: string };
  error?: string;
}

interface OllamaTagsResponse {
  models?: Array<{ name?: string }>;
}

export interface OllamaStatus {
  available: boolean;
  model: string;
  modelAvailable: boolean;
  loaded: boolean;
  models: string[];
}

function endpoint(path: string): string {
  return `${env.ollamaUrl.replace(/\/+$/, '')}${path}`;
}

function modelMatches(candidate: string, target: string): boolean {
  const name = candidate.trim();
  return name === target || name.split(':')[0] === target;
}

export async function listOllamaModels(
  timeoutMs: number = env.ollamaStatusTimeoutMs,
): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint('/api/tags'), { signal: controller.signal });
    if (!res.ok) return [];
    const data = (await res.json()) as OllamaTagsResponse;
    return (data.models ?? []).map((m) => m.name ?? '').filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function listLoadedModels(
  timeoutMs: number = env.ollamaStatusTimeoutMs,
): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint('/api/ps'), { signal: controller.signal });
    if (!res.ok) return [];
    const data = (await res.json()) as OllamaTagsResponse;
    return (data.models ?? []).map((m) => m.name ?? '').filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function getOllamaStatus(): Promise<OllamaStatus> {
  const [models, loaded] = await Promise.all([listOllamaModels(), listLoadedModels()]);
  return {
    available: models.length > 0,
    model: env.ollamaModel,
    modelAvailable: models.some((name) => modelMatches(name, env.ollamaModel)),
    loaded: loaded.some((name) => modelMatches(name, env.ollamaModel)),
    models,
  };
}

/**
 * Loads the model into memory (if not already) and keeps it warm for
 * `OLLAMA_KEEP_ALIVE`, so the first real question does not pay the cold-start cost.
 */
export async function warmOllamaModel(): Promise<boolean> {
  if (!env.ollamaWarm) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.ollamaTimeoutMs);
  try {
    const res = await fetch(endpoint('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.ollamaModel,
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
        think: false,
        keep_alive: env.ollamaKeepAlive,
        options: { num_predict: 1 },
      }),
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function chat(
  messages: ChatMessage[],
  options: { model?: string; think?: boolean; numPredict?: number } = {},
): Promise<string> {
  const model = options.model ?? env.ollamaModel;
  const think = options.think ?? true;
  const numPredict = options.numPredict ?? env.ollamaNumPredict;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.ollamaTimeoutMs);

  try {
    const res = await fetch(endpoint('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        think,
        keep_alive: env.ollamaKeepAlive,
        options: { temperature: 0.2, num_predict: numPredict },
      }),
      signal: controller.signal,
    });

    if (res.status === 404) {
      throw new AppError(
        503,
        'AI_MODEL_UNAVAILABLE',
        `AI model "${model}" is not available. Pull it with "ollama pull ${model}".`,
      );
    }

    if (!res.ok) {
      throw new AppError(502, 'AI_PROVIDER_ERROR', 'The AI service returned an unexpected response.');
    }

    const data = (await res.json()) as OllamaChatResponse;
    const content = data.message?.content?.trim();
    if (!content) {
      throw new AppError(502, 'AI_EMPTY_RESPONSE', 'The AI service returned an empty response.');
    }
    return content;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(504, 'AI_TIMEOUT', 'The AI service took too long to respond. Please try again.');
    }
    throw new AppError(
      503,
      'AI_UNAVAILABLE',
      'The AI service (Ollama) is unavailable. Make sure it is running and reachable.',
    );
  } finally {
    clearTimeout(timer);
  }
}
