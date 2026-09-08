import { apiClient } from './client';
import type { PackageDetail, PackageHistory } from '../types/masterdb';

/** GET /packages/{package_id} – returns full package detail */
export async function getPackage(packageId: string): Promise<PackageDetail> {
  return apiClient.request<PackageDetail>(`/packages/${encodeURIComponent(packageId)}`);
}

/** GET /packages/{package_id}/history – returns transition history */
export async function getPackageHistory(packageId: string): Promise<PackageHistory> {
  return apiClient.request<PackageHistory>(`/packages/${encodeURIComponent(packageId)}/history`);
}

