import { apiClient } from './client';
import type { RetrievalEvidence } from '../types/masterdb';

/**
 * Fetch retrieval evidence and rule evaluations for a package.
 * GET /packages/{package_id}/retrieval
 */
export async function getPackageRetrieval(packageId: string): Promise<RetrievalEvidence> {
  return apiClient.request<RetrievalEvidence>(`/packages/${encodeURIComponent(packageId)}/retrieval`);
}
