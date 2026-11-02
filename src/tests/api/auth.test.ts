import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAuthToken, clearAuthToken } from '../../api/auth';
import { apiClient } from '../../api/client';
import type { AuthTokenResponse } from '../../types/masterdb';

describe('Auth Service Unit Tests', () => {
  beforeEach(() => {
    clearAuthToken();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearAuthToken();
  });

  it('retrieves and caches valid Bearer JWT token', async () => {
    const futureExpiry = new Date(Date.now() + 3600 * 1000).toISOString();
    const mockAuthResponse: AuthTokenResponse = {
      access_token: 'jwt-operator-valid-token-12345',
      token_type: 'bearer',
      actor: 'control-center-operator',
      roles: ['operator', 'viewer'],
      expires_at: futureExpiry,
    };

    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValue(mockAuthResponse);

    const token1 = await getAuthToken('control-center-operator');
    expect(token1).toBe('jwt-operator-valid-token-12345');
    expect(requestSpy).toHaveBeenCalledTimes(1);

    // Verify request payload conforms to server-assigned RBAC contract
    expect(requestSpy).toHaveBeenCalledWith(
      '/auth/token',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          actor: 'control-center-operator',
          password: null,
          roles: ['ignored'], // Client cannot forge roles; server assigns authoritatively
        }),
      })
    );

    // Second call should return cached token without issuing another HTTP call
    const token2 = await getAuthToken('control-center-operator');
    expect(token2).toBe('jwt-operator-valid-token-12345');
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });

  it('re-fetches token when cached token is expired or near expiry', async () => {
    // Expiring in 10 seconds (less than 60s buffer)
    const expiredSoon = new Date(Date.now() + 10_000).toISOString();
    const freshExpiry = new Date(Date.now() + 3600 * 1000).toISOString();

    const mockResponse1: AuthTokenResponse = {
      access_token: 'expiring-token',
      token_type: 'bearer',
      actor: 'control-center-operator',
      roles: ['operator'],
      expires_at: expiredSoon,
    };

    const mockResponse2: AuthTokenResponse = {
      access_token: 'fresh-token',
      token_type: 'bearer',
      actor: 'control-center-operator',
      roles: ['operator'],
      expires_at: freshExpiry,
    };

    const requestSpy = vi
      .spyOn(apiClient, 'request')
      .mockResolvedValueOnce(mockResponse1)
      .mockResolvedValueOnce(mockResponse2);

    const token1 = await getAuthToken('control-center-operator');
    expect(token1).toBe('expiring-token');

    // Should fetch fresh token because expires_at is within 60s threshold
    const token2 = await getAuthToken('control-center-operator');
    expect(token2).toBe('fresh-token');
    expect(requestSpy).toHaveBeenCalledTimes(2);
  });

  it('clearing token invalidates cache immediately', async () => {
    const futureExpiry = new Date(Date.now() + 3600 * 1000).toISOString();
    const mockAuthResponse: AuthTokenResponse = {
      access_token: 'token-to-clear',
      token_type: 'bearer',
      actor: 'bhiv-admin',
      roles: ['bhiv-admin', 'admin', 'operator'],
      expires_at: futureExpiry,
    };

    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValue(mockAuthResponse);

    await getAuthToken('bhiv-admin');
    expect(requestSpy).toHaveBeenCalledTimes(1);

    clearAuthToken();

    await getAuthToken('bhiv-admin');
    expect(requestSpy).toHaveBeenCalledTimes(2);
  });

  it('propagates authentication error if backend rejects credentials', async () => {
    vi.spyOn(apiClient, 'request').mockRejectedValue({
      status: 401,
      message: 'Invalid credentials or inactive actor',
    });

    await expect(getAuthToken('unauthorized-actor')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid credentials or inactive actor',
    });
  });
});
