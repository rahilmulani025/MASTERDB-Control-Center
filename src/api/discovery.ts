import { apiClient } from './client';
import type { DiscoveryResponse } from '../types/masterdb';

/** GET /discovery/packages – returns discovered package metadata */
export async function getDiscoveredPackages(): Promise<DiscoveryResponse> {
  // No query parameters needed.
  return apiClient.request<DiscoveryResponse>('/discovery/packages');
}

