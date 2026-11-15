import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiClient } from '../../api/client';
import { config } from '../../lib/config';
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

  it('normalizes response with message property in error JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ message: 'Custom bad request message' }),
    });

    let caught: APIError | null = null;
    try {
      await client.request('/test');
    } catch (e) {
      caught = e as APIError;
    }
    expect(caught?.message).toBe('Custom bad request message');
    expect(caught?.status).toBe(400);
  });

  it('normalizes response with rejection_reason property in error JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ rejection_reason: 'Dataset schema mismatch' }),
    });

    let caught: APIError | null = null;
    try {
      await client.request('/test');
    } catch (e) {
      caught = e as APIError;
    }
    expect(caught?.message).toBe('Dataset schema mismatch');
    expect(caught?.status).toBe(422);
  });

  it('normalizes non-JSON text error responses with fallback', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => 'Bad Gateway upstream error',
    });

    let caught: APIError | null = null;
    try {
      await client.request('/test');
    } catch (e) {
      caught = e as APIError;
    }
    expect(caught?.message).toBe('Bad Gateway upstream error');
    expect(caught?.status).toBe(502);
  });

  it('handles empty non-JSON response body returning null', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => '',
    });

    const res = await client.request('/empty-endpoint');
    expect(res).toBeNull();
  });

  it('handles non-Error thrown during fetch', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue('Primitive string error');

    let caught: APIError | null = null;
    try {
      await client.request('/crash');
    } catch (e) {
      caught = e as APIError;
    }
    expect(caught?.message).toBe('Primitive string error');
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

  it('joins URL properly when config.apiUrl is set and handles path prefixing', async () => {
    const originalApiUrl = config.apiUrl;
    try {
      config.apiUrl = 'https://api.masterdb.io/';
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true }),
      });

      // with leading slash
      await client.request('/upload');
      expect(globalThis.fetch).toHaveBeenLastCalledWith('https://api.masterdb.io/upload', expect.anything());

      // with no leading slash
      await client.request('datasets');
      expect(globalThis.fetch).toHaveBeenLastCalledWith('https://api.masterdb.io/datasets', expect.anything());

      // with empty path
      await client.request('');
      expect(globalThis.fetch).toHaveBeenLastCalledWith('https://api.masterdb.io/', expect.anything());

      // with config.apiUrl unset and path without leading slash
      config.apiUrl = '';
      await client.request('relative-endpoint');
      expect(globalThis.fetch).toHaveBeenLastCalledWith('/relative-endpoint', expect.anything());
    } finally {
      config.apiUrl = originalApiUrl;
    }
  });

  it('handles error payloads with type only, or long non-JSON body > 200 chars', async () => {
    // Error object with type but no message
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ error: { type: 'VALIDATION_FAILED' } }),
    });

    let caught: APIError | null = null;
    try {
      await client.request('/test');
    } catch (e) {
      caught = e as APIError;
    }
    expect(caught?.type).toBe('VALIDATION_FAILED');
    expect(caught?.message).toBe('MASTERDB request failed (400).');

    // Long non-JSON response > 200 chars
    const longHtml = '<html><body>' + 'x'.repeat(250) + '</body></html>';
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => longHtml,
    });

    try {
      await client.request('/error');
    } catch (e) {
      caught = e as APIError;
    }
    expect(caught?.message).toBe('MASTERDB request failed (500).');
  });

  it('handles validation details with empty loc or non-string msg', async () => {
    const errorBody = {
      detail: [
        { loc: [], msg: 'Generic schema violation' },
        { loc: ['field'], code: 'invalid' },
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
      await client.request('/test-loc');
    } catch (e) {
      caught = e as APIError;
    }
    expect(caught?.message).toContain('Generic schema violation');
    expect(caught?.message).toContain('{"loc":["field"],"code":"invalid"}');
  });
});
