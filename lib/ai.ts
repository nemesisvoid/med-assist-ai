/**
 * Single entry point for Gemini calls.
 *
 * Every failure (quota exhausted, rate limit, outage, timeout, missing key,
 * malformed output) is normalised into an `AIServiceError` with a `kind` and a
 * message that is safe to show to clinicians. Callers decide how to degrade;
 * nothing here throws raw SDK errors or crashes a request.
 *
 * Not a 'use server' module: these helpers are only reachable through the
 * server actions that import them.
 */

import { ApiError, GoogleGenAI } from '@google/genai';
import * as z from 'zod';

export const AI_MODEL = 'gemini-2.5-flash';

const REQUEST_TIMEOUT_MS = 45_000;

export type AIErrorKind = 'quota_exhausted' | 'rate_limited' | 'unavailable' | 'not_configured' | 'invalid_response';

const USER_MESSAGES: Record<AIErrorKind, string> = {
  quota_exhausted: 'The AI assistant has reached its daily usage limit. You can continue without it. AI features will be back once the limit resets.',
  rate_limited: 'The AI assistant is handling too many requests right now. Please wait a minute and try again.',
  unavailable: 'The AI assistant is temporarily unavailable. Please try again in a few minutes.',
  not_configured: 'The AI assistant is not configured. Please contact an administrator.',
  invalid_response: 'The AI assistant returned an unexpected response. Please try again.',
};

export class AIServiceError extends Error {
  readonly kind: AIErrorKind;
  readonly status?: number;

  constructor(kind: AIErrorKind, options: { cause?: unknown; status?: number } = {}) {
    super(USER_MESSAGES[kind], { cause: options.cause });
    this.name = 'AIServiceError';
    this.kind = kind;
    this.status = options.status;
  }
}

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AIServiceError('not_configured');
  // No SDK `retryOptions`: in retry mode the SDK throws a plain Error that drops
  // the HTTP status and Google's message, so a quota error would look like an
  // outage. Retries are handled in `generateText` instead.
  client ??= new GoogleGenAI({ apiKey, httpOptions: { timeout: REQUEST_TIMEOUT_MS } });
  return client;
}

/** Outages (5xx) and dropped connections are worth one retry; quota, auth and timeouts are not. */
function isRetryable(error: AIServiceError): boolean {
  if (error.kind !== 'unavailable') return false;
  if (error.status !== undefined) return error.status >= 500;
  return !(error.cause instanceof Error && error.cause.name === 'AbortError');
}

const RETRY_DELAY_MS = 1_000;

/** Map any error thrown while calling Gemini to a typed AIServiceError. */
export function toAIServiceError(error: unknown): AIServiceError {
  if (error instanceof AIServiceError) return error;

  if (error instanceof ApiError) {
    const { status, message } = error;
    if (status === 429) {
      // Daily free-tier quotas report a "PerDay" quota id; per-minute limits clear quickly.
      const isDaily = /per ?day/i.test(message);
      return new AIServiceError(isDaily ? 'quota_exhausted' : 'rate_limited', { cause: error, status });
    }
    if (status === 401 || status === 403 || (status === 400 && /api key/i.test(message))) {
      return new AIServiceError('not_configured', { cause: error, status });
    }
    return new AIServiceError('unavailable', { cause: error, status });
  }

  // Timeouts (AbortError) and network failures (fetch failed) are transient.
  return new AIServiceError('unavailable', { cause: error });
}

/** Server-side log line. Never logs prompts: they contain patient data. */
export function logAIError(context: string, error: AIServiceError) {
  const cause = error.cause instanceof Error ? error.cause.message.split('\n')[0].slice(0, 300) : undefined;
  console.error(`[ai] ${context} failed: ${error.kind}${error.status ? ` (HTTP ${error.status})` : ''}${cause ? ` - ${cause}` : ''}`);
}

type GenerateOptions = { json?: boolean };

/** Generate plain text. Throws AIServiceError on any failure. */
export async function generateText(prompt: string, options: GenerateOptions = {}): Promise<string> {
  const ai = getClient();
  const request = () =>
    ai.models.generateContent({
      model: AI_MODEL,
      contents: prompt,
      config: options.json ? { responseMimeType: 'application/json' } : undefined,
    });

  let text: string | undefined;
  try {
    text = (await request()).text?.trim();
  } catch (firstError) {
    const error = toAIServiceError(firstError);
    if (!isRetryable(error)) throw error;
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    try {
      text = (await request()).text?.trim();
    } catch (secondError) {
      throw toAIServiceError(secondError);
    }
  }
  if (!text) throw new AIServiceError('invalid_response');
  return text;
}

/** Generate JSON and validate it against a schema. Throws AIServiceError on any failure. */
export async function generateJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
  const text = await generateText(prompt, { json: true });
  // Tolerate a ```json fence even though JSON mode should never add one.
  const raw = text.replace(/^```(?:json)?\s*|\s*```$/g, '');
  try {
    return schema.parse(JSON.parse(raw));
  } catch (error) {
    throw new AIServiceError('invalid_response', { cause: error });
  }
}

export type AIFailure = { success: false; code: AIErrorKind; message: string };

/** Turn an AIServiceError into an action result; returns null for unrelated errors. */
export function aiFailure(error: unknown, context: string): AIFailure | null {
  if (!(error instanceof AIServiceError)) return null;
  logAIError(context, error);
  return { success: false, code: error.kind, message: error.message };
}
