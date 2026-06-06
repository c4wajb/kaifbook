"use client";

type FetchJsonOptions = RequestInit & {
  debugLabel: string;
  userMessage: string;
  logPayload?: unknown;
};

const NETWORK_ERROR_MESSAGE = "Не удалось загрузить данные. Проверьте интернет и попробуйте ещё раз.";

export class FriendlyFetchError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, options: { status?: number; details?: unknown } = {}) {
    super(message);
    this.name = "FriendlyFetchError";
    this.status = options.status;
    this.details = options.details;
  }
}

function shouldLogVerbose() {
  return process.env.NODE_ENV !== "production";
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function requestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID().slice(0, 8);
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function fetchJsonWithDiagnostics<T>(url: string, options: FetchJsonOptions): Promise<T> {
  const { debugLabel, userMessage, logPayload, ...requestOptions } = options;
  const id = requestId();
  const method = requestOptions.method || "GET";
  const startedAt = performance.now();

  if (shouldLogVerbose()) {
    console.info(`[Kaifbook:${debugLabel}] request`, { requestId: id, method, url, payload: logPayload });
  }

  try {
    const response = await fetch(url, requestOptions);
    const text = await response.text();
    let data: unknown = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error(`[Kaifbook:${debugLabel}] invalid JSON response`, { requestId: id, method, url, status: response.status, text, parseError });
      throw new FriendlyFetchError(userMessage || NETWORK_ERROR_MESSAGE, { status: response.status, details: text });
      }
    }

    if (shouldLogVerbose()) {
      console.info(`[Kaifbook:${debugLabel}] response`, {
        requestId: id,
        method,
        url,
        status: response.status,
        durationMs: Math.round(performance.now() - startedAt),
        data,
      });
    }

    if (!response.ok) {
      const serverMessage = typeof data === "object" && data && "error" in data ? String((data as { error?: unknown }).error || "") : "";
      throw new FriendlyFetchError(serverMessage || userMessage, { status: response.status, details: data });
    }

    return data as T;
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (error instanceof FriendlyFetchError) {
      console.error(`[Kaifbook:${debugLabel}] failed`, { requestId: id, method, url, status: error.status, details: error.details });
      throw error;
    }

    console.error(`[Kaifbook:${debugLabel}] network failed`, { requestId: id, method, url, error });
      throw new FriendlyFetchError(userMessage || NETWORK_ERROR_MESSAGE);
  }
}

export function isFriendlyAbort(error: unknown) {
  return isAbortError(error);
}
