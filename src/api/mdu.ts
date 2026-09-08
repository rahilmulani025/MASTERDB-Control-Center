import { apiClient } from './client';
import type {
  MDUProvenanceEvent,
  MDUSchemaResponse,
  MDUSchemaCompatibilityResponse,
} from '../types/masterdb';

/**
 * Fetch MDU provenance records for a dataset.
 * GET /mdu/provenance/{dataset_id}
 */
export async function getMDUProvenance(datasetId: string): Promise<MDUProvenanceEvent[]> {
  return apiClient.request<MDUProvenanceEvent[]>(`/mdu/provenance/${encodeURIComponent(datasetId)}`);
}

/**
 * Fetch canonical schema contract from MDU.
 * GET /mdu/schema/{dataset_id}
 */
export async function getMDUSchema(datasetId: string): Promise<MDUSchemaResponse> {
  return apiClient.request<MDUSchemaResponse>(`/mdu/schema/${encodeURIComponent(datasetId)}`);
}

/**
 * Validate schema compatibility between local package version and MDU canonical schema.
 * GET /mdu/schema-compatibility/{dataset_id}?local_schema_version={local_schema_version}
 */
export async function getMDUSchemaCompatibility(
  datasetId: string,
  localSchemaVersion: string = '1.0',
): Promise<MDUSchemaCompatibilityResponse> {
  const query = `?local_schema_version=${encodeURIComponent(localSchemaVersion)}`;
  return apiClient.request<MDUSchemaCompatibilityResponse>(
    `/mdu/schema-compatibility/${encodeURIComponent(datasetId)}${query}`,
  );
}
