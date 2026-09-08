import { apiClient } from './client';
import type {
  RuntimeIdentityResponse,
  SharedRegistryResponse,
  SharedContractsResponse,
  OperationalSyncResponse,
  ReplayRegistryManifestResponse,
} from '../types/masterdb';

/**
 * Fetch MASTERDB runtime identity and capabilities manifest for TANTRA runtime registration.
 * GET /runtime/identity
 */
export async function getRuntimeIdentity(): Promise<RuntimeIdentityResponse> {
  return apiClient.request<RuntimeIdentityResponse>('/runtime/identity');
}

/**
 * Fetch shared data registry entries (Authentication, Identity, Organizations, etc.).
 * GET /shared/registry
 */
export async function getSharedRegistry(): Promise<SharedRegistryResponse> {
  return apiClient.request<SharedRegistryResponse>('/shared/registry');
}

/**
 * Fetch shared data service convergence contracts.
 * GET /shared/contracts
 */
export async function getSharedContracts(): Promise<SharedContractsResponse> {
  return apiClient.request<SharedContractsResponse>('/shared/contracts');
}

/**
 * Fetch PARIKSHAK engineering review references synchronization status.
 * GET /parikshak/review-references
 */
export async function getParikshakReviewReferences(): Promise<OperationalSyncResponse> {
  return apiClient.request<OperationalSyncResponse>('/parikshak/review-references');
}

/**
 * Fetch NIYANTRAN operational task lifecycle state synchronization records.
 * GET /niyantran/task-state
 */
export async function getNiyantranTaskState(): Promise<OperationalSyncResponse> {
  return apiClient.request<OperationalSyncResponse>('/niyantran/task-state');
}

/**
 * Fetch replay registry manifest of replay-capable subsystems and hashes.
 * GET /replay-registry/manifest
 */
export async function getReplayRegistryManifest(): Promise<ReplayRegistryManifestResponse> {
  return apiClient.request<ReplayRegistryManifestResponse>('/replay-registry/manifest');
}
