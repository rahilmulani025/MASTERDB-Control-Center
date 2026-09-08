import { apiClient } from './client';
import type { KnowledgeObject, KnowledgeObjectRegisterRequest } from '../types/masterdb';

/**
 * Register a Knowledge Object (provenance/lineage pointer) for a package.
 * POST /packages/{package_id}/knowledge-object
 */
export async function registerKnowledgeObject(
  packageId: string,
  request: KnowledgeObjectRegisterRequest,
): Promise<KnowledgeObject> {
  return apiClient.request<KnowledgeObject>(
    `/packages/${encodeURIComponent(packageId)}/knowledge-object`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
  );
}
