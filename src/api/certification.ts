import { apiClient } from './client';
import type { CertificationRequest, CertificationResponse } from '../types/masterdb';

/** Trigger certification for a dataset */
export async function certifyDataset(request: CertificationRequest): Promise<CertificationResponse> {
  return apiClient.request<CertificationResponse>('/certify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}
