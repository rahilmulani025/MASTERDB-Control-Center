import { apiClient } from './client';
import type { AuthTokenResponse } from '../types/masterdb';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let cachedActor = '';

/**
 * Obtain or reuse a valid signed Bearer JWT token from POST /auth/token.
 * Contract:
 * - Request: { "actor": string, "password": string | null, "roles": ["ignored"] }
 * - Backend assigns roles server-side; client-supplied roles are ignored.
 * - Caches token until 60 seconds before expiration.
 */
export async function getAuthToken(
  actor: string = 'control-center-operator',
  password?: string | null
): Promise<string> {
  const effectivePassword =
    password !== undefined
      ? password
      : (import.meta.env.VITE_MASTERDB_ADMIN_PASSWORD || null);

  const now = Date.now();
  if (cachedToken && cachedActor === actor && tokenExpiresAt > now + 60_000) {
    return cachedToken;
  }

  const res = await apiClient.request<AuthTokenResponse>('/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actor,
      password: effectivePassword,
      roles: ['ignored'],
    }),
  });

  cachedToken = res.access_token;
  cachedActor = res.actor || actor;
  tokenExpiresAt = new Date(res.expires_at).getTime();
  return cachedToken;
}

/** Clear cached token (e.g. on 401 response or explicit re-auth) */
export function clearAuthToken(): void {
  cachedToken = null;
  tokenExpiresAt = 0;
  cachedActor = '';
}

