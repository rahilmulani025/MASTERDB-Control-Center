import { apiClient } from './client';
import type {
  AdminConfigurationReport,
  AdminBackupSnapshot,
  AdminRestoreResponse,
  AuthTokenResponse,
} from '../types/masterdb';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Obtain or reuse a valid signed bearer token with `bhiv-admin` role.
 * POST /auth/token
 */
export async function getAdminToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60_000) {
    return cachedToken;
  }

  const res = await apiClient.request<AuthTokenResponse>('/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actor: 'control-center-admin',
      roles: ['bhiv-admin'],
    }),
  });

  cachedToken = res.access_token;
  tokenExpiresAt = new Date(res.expires_at).getTime();
  return cachedToken;
}

/**
 * Fetch live configuration validation report (read-only, never returns secrets).
 * GET /admin/configuration
 */
export async function getAdminConfiguration(): Promise<AdminConfigurationReport> {
  const token = await getAdminToken();
  return apiClient.request<AdminConfigurationReport>('/admin/configuration', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Generate and export an application-level store backup snapshot.
 * Controlled operation: GET /admin/backup
 */
export async function createAdminBackup(): Promise<AdminBackupSnapshot> {
  const token = await getAdminToken();
  return apiClient.request<AdminBackupSnapshot>('/admin/backup', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Restore records from an exported snapshot.
 * Destructive operation: POST /admin/restore
 */
export async function restoreAdminBackup(snapshot: AdminBackupSnapshot): Promise<AdminRestoreResponse> {
  const token = await getAdminToken();
  return apiClient.request<AdminRestoreResponse>('/admin/restore', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(snapshot),
  });
}
