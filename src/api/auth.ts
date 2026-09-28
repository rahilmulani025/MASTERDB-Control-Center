import { apiClient } from './client';
import type { AuthTokenResponse } from '../types/masterdb';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Obtain or reuse a valid signed Bearer JWT token from POST /auth/token.
 * Caches token until 60 seconds before expiration.
 */
export async function getAuthToken(
  roles: string[] = ['bhiv-admin'],
  actor: string = 'control-center-operator'
): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60_000) {
    return cachedToken;
  }

  const res = await apiClient.request<AuthTokenResponse>('/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actor,
      roles,
    }),
  });

  cachedToken = res.access_token;
  tokenExpiresAt = new Date(res.expires_at).getTime();
  return cachedToken;
}

/** Clear cached token (e.g. on 401 response or explicit re-auth) */
export function clearAuthToken(): void {
  cachedToken = null;
  tokenExpiresAt = 0;
}
