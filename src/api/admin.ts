import { apiClient } from './client';
import { getAuthToken } from './auth';
import type {
  AdminConfigurationReport,
  AdminBackupSnapshot,
  AdminRestoreResponse,
} from '../types/masterdb';

/**
 * Obtain or reuse a valid signed bearer token with `bhiv-admin` role.
 * POST /auth/token
 */
export async function getAdminToken(): Promise<string> {
  return getAuthToken(['bhiv-admin'], 'control-center-admin');
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
