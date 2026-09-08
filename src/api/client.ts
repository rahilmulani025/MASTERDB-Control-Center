import { config } from '../lib/config';
import type { APIError } from '../types/masterdb';

/** Default request timeout (ms) */
const DEFAULT_TIMEOUT_MS = 10_000;

/** Helper to join URL paths without duplicate slashes */
function joinPath(base: string, path: string): string {
  if (!path) return base;
  const cleanBase = base.replace(/\/*$/, '');
  const cleanPath = path.replace(/^\/*/, '');
  return `${cleanBase}/${cleanPath}`;
}

/** Normalizes fetch errors into APIError */
function normalizeError(err: unknown, path: string): APIError {
  if (err instanceof Error) {
    return { message: err.message, status: undefined, path } satisfies APIError;
  }
  return { message: String(err), path } satisfies APIError;
}

export class ApiClient {
  /** Perform a fetch request with JSON handling and timeout */
  async request<T>(
    path: string,
    init: RequestInit = {},
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ): Promise<T> {
    const url = config.apiUrl
      ? joinPath(config.apiUrl, path)
      : (path.startsWith('/') ? path : `/${path}`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(init.headers ?? {}),
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw {
          message: 'MASTERDB request failed.',
          status: response.status,
          path,
          detail: text,
        } satisfies APIError;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        return (await response.json()) as T;
      }

      // Non‑JSON response: treat empty as null, otherwise return raw text
      const text = await response.text();
      if (!text) return null as unknown as T;
      return text as unknown as T;
    } catch (e) {
      // AbortError or other fetch failures
      throw normalizeError(e, path);
    } finally {
      clearTimeout(timer);
    }
  }
}

export const apiClient = new ApiClient();
