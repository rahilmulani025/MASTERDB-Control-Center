import { apiClient } from './client';
import type { PackageLineageResponse } from '../types/masterdb';

/**
 * Fetch package lineage and ancestor/descendant relationships.
 * GET /packages/{package_id}/lineage
 */
export async function getPackageLineage(packageId: string): Promise<PackageLineageResponse> {
  return apiClient.request<PackageLineageResponse>(`/packages/${encodeURIComponent(packageId)}/lineage`);
}
