import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiClient } from '../../api/client';
import type { APIError } from '../../types/masterdb';

describe('ApiClient Unit Tests', () => {
  let client: ApiClient;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    client = new ApiClient();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('handles successful JSON response', async () => {
    const mockData = { status: 'healthy', version: '1.0.0' };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockData,
    });

    const result = await client.request<{ status: string; version: string }>('/health');
    expect(result).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('handles non-JSON text response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => 'OK',
    });

    const result = await client.request<string>('/metrics');
    expect(result).toBe('OK');
  });

  it('normalizes authoritative FastAPI error contract { error: { message, type } }', async () => {
    const errorBody = {
      error: {
        message: 'Invalid authorization token',
        type: 'UNAUTHORIZED_ACCESS',
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(errorBody),
    });

    let caught: APIError | null = null;
    try {
      await client.request('/admin/protected');
    } catch (e) {
      caught = e as APIError;
    }

    expect(caught).not.toBeNull();
    expect(caught?.status).toBe(401);
    expect(caught?.message).toBe('Invalid authorization token');
    expect(caught?.type).toBe('UNAUTHORIZED_ACCESS');
  });

  it('normalizes FastAPI single string detail error', async () => {
    const errorBody = { detail: 'Package not found in registry' };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(errorBody),
    });

    let caught: APIError | null = null;
    try {
      await client.request('/packages/missing-id');
    } catch (e) {
      caught = e as APIError;
    }

    expect(caught?.status).toBe(404);
    expect(caught?.message).toBe('Package not found in registry');
  });

  it('normalizes Pydantic validation error lists', async () => {
    const errorBody = {
      detail: [
        { loc: ['body', 'filename'], msg: 'Field required' },
        { loc: ['body', 'file_size'], msg: 'Must be greater than 0' },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(errorBody),
    });

    let caught: APIError | null = null;
    try {
      await client.request('/upload', { method: 'POST', body: '{}' });
    } catch (e) {
      caught = e as APIError;
    }

    expect(caught?.status).toBe(422);
    expect(caught?.message).toContain('body.filename: Field required');
    expect(caught?.message).toContain('body.file_size: Must be greater than 0');
  });

  it('redacts raw Bearer JWT tokens from error messages', async () => {
    const secretToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitive_payload.signature';
    const errorBody = {
      detail: `Authorization failed for token ${secretToken}`,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(errorBody),
    });

    let caught: APIError | null = null;
    try {
      await client.request('/admin/restore');
    } catch (e) {
      caught = e as APIError;
    }

    expect(caught?.message).not.toContain(secretToken);
    expect(caught?.message).toContain('Bearer [REDACTED]');
  });

  it('handles network failure (fetch throws TypeError / Failed to fetch)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    let caught: APIError | null = null;
    try {
      await client.request('/health');
    } catch (e) {
      caught = e as APIError;
    }

    expect(caught?.message).toBe('Failed to fetch');
    expect(caught?.status).toBeUndefined();
  });

  it('handles request timeout cleanly', async () => {
    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        }
      });
    });

    let caught: APIError | null = null;
    try {
      await client.request('/slow-endpoint', {}, 50); // 50ms timeout
    } catch (e) {
      caught = e as APIError;
    }

    expect(caught?.message).toContain('aborted');
  });

  it('injects headers and custom request method properly', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ registered: true }),
    });

    await client.request(
      '/packages/register',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dataset_id: 'ds-1' }),
      }
    );

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/packages/register',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token-123',
          Accept: 'application/json',
        }),
      })
    );
  });
});
