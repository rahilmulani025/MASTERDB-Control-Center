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
  if (err && typeof err === 'object' && 'message' in err && 'status' in err) {
    return err as APIError;
  }
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
        let parsedDetail: unknown = text;
        let errorMessage = `MASTERDB request failed (${response.status}).`;
        try {
          const json = JSON.parse(text);
          parsedDetail = json;
          if (json && typeof json === 'object') {
            if (typeof (json as { detail?: unknown }).detail === 'string') {
              errorMessage = (json as { detail: string }).detail;
            } else if (typeof (json as { message?: unknown }).message === 'string') {
              errorMessage = (json as { message: string }).message;
            }
          }
        } catch {
          // fallback to raw text if not JSON
          if (text && text.length < 200) {
            errorMessage = text;
          }
        }

        throw {
          message: errorMessage,
          status: response.status,
          path,
          detail: parsedDetail,
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

