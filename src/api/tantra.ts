import { apiClient } from './client';
import type { RetrievalEvidence, TantraCertificationStatus, TantraRuntimeLookup } from '../types/masterdb';

/**
 * Fetch retrieval readiness assessment for a package via TANTRA interface.
 * GET /tantra/packages/{package_id}/retrieval-readiness
 */
export async function getRetrievalReadiness(packageId: string): Promise<RetrievalEvidence> {
  return apiClient.request<RetrievalEvidence>(`/tantra/packages/${encodeURIComponent(packageId)}/retrieval-readiness`);
}

/**
 * Fetch TANTRA runtime certification status for a dataset.
 * GET /tantra/certification/{dataset_id}
 */
export async function getTantraCertification(datasetId: string): Promise<TantraCertificationStatus> {
  return apiClient.request<TantraCertificationStatus>(`/tantra/certification/${encodeURIComponent(datasetId)}`);
}

/**
 * Fetch bundled TANTRA runtime package lookup (package state, lineage, retrieval readiness, certification).
 * GET /tantra/packages/{package_id}/runtime
 */
export async function getPackageRuntime(packageId: string): Promise<TantraRuntimeLookup> {
  return apiClient.request<TantraRuntimeLookup>(`/tantra/packages/${encodeURIComponent(packageId)}/runtime`);
}


