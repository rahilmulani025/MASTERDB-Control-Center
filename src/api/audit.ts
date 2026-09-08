import { apiClient } from './client';
import type { PackageAuditReport, PackageReplayResult } from '../types/masterdb';

/**
 * Fetch audit completeness report for a package's transition history.
 * GET /packages/{package_id}/audit
 */
export async function getPackageAudit(packageId: string): Promise<PackageAuditReport> {
  return apiClient.request<PackageAuditReport>(`/packages/${encodeURIComponent(packageId)}/audit`);
}

/**
 * Recompute package status purely from transition history to verify replay consistency.
 * GET /packages/{package_id}/replay
 */
export async function getPackageReplay(packageId: string): Promise<PackageReplayResult> {
  return apiClient.request<PackageReplayResult>(`/packages/${encodeURIComponent(packageId)}/replay`);
}
