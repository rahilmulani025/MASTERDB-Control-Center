import { apiClient } from './client';
import { getAuthToken } from './auth';
import type {
  UploadInitiationRequest,
  UploadInitiationResponse,
  UploadContentResponse,
  UploadValidationResponse,
  UploadJob,
  UploadListResponse,
  UploadCancelResponse,
} from '../types/masterdb';

/**
 * Compute SHA-256 hash of a file using browser Web Crypto API.
 * Never invents values. Returns hex string or throws error if unavailable.
 */
export async function computeFileSha256(file: File): Promise<string> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not supported in this environment.');
  }
  const buffer = await file.arrayBuffer();
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * POST /upload
 * Initiates an upload session with MASTERDB backend.
 * Only non-empty and valid fields are dispatched.
 */
export async function initiateUpload(
  payload: UploadInitiationRequest
): Promise<UploadInitiationResponse> {
  const token = await getAuthToken();

  const body: Record<string, unknown> = {
    filename: payload.filename,
    content_type: payload.content_type,
    file_size: payload.file_size,
  };

  if (payload.checksum_sha256 && payload.checksum_sha256.trim()) {
    body.checksum_sha256 = payload.checksum_sha256.trim();
  }
  if (payload.classification && payload.classification.trim()) {
    body.classification = payload.classification.trim();
  }
  if (payload.source_reference && payload.source_reference.trim()) {
    body.source_reference = payload.source_reference.trim();
  }
  if (payload.provenance_metadata && Object.keys(payload.provenance_metadata).length > 0) {
    body.provenance_metadata = payload.provenance_metadata;
  }
  if (payload.schema_version && payload.schema_version.trim()) {
    body.schema_version = payload.schema_version.trim();
  }
  if (payload.product_source && payload.product_source.trim()) {
    body.product_source = payload.product_source.trim();
  }
  if (payload.intended_use && payload.intended_use.trim()) {
    body.intended_use = payload.intended_use.trim();
  }
  if (payload.metadata && Object.keys(payload.metadata).length > 0) {
    body.metadata = payload.metadata;
  }

  return apiClient.request<UploadInitiationResponse>('/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

/**
 * POST /upload/{upload_id}/content
 * Sends raw binary bytes of the file.
 * Sets the actual Content-Type and does not convert to JSON or base64.
 */
export async function uploadFileContent(
  uploadId: string,
  file: File | Blob | ArrayBuffer,
  contentType: string,
  timeoutMs: number = 120_000
): Promise<UploadContentResponse> {
  const token = await getAuthToken();

  return apiClient.request<UploadContentResponse>(
    `/upload/${encodeURIComponent(uploadId)}/content`,
    {
      method: 'POST',
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        Authorization: `Bearer ${token}`,
      },
      body: file as BodyInit,
    },
    timeoutMs
  );
}

/**
 * POST /upload/{upload_id}/validate
 * Triggers backend validation (checksum & structure checks) of the staged file.
 */
export async function validateUpload(uploadId: string): Promise<UploadValidationResponse> {
  const token = await getAuthToken();

  return apiClient.request<UploadValidationResponse>(
    `/upload/${encodeURIComponent(uploadId)}/validate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * GET /upload/jobs/{upload_id}
 * Retrieves current status, timestamps, and step details for an upload job.
 */
export async function getUploadJob(uploadId: string): Promise<UploadJob> {
  const token = await getAuthToken();

  return apiClient.request<UploadJob>(
    `/upload/jobs/${encodeURIComponent(uploadId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * GET /upload/jobs
 * Lists upload jobs with optional query filtering.
 */
export async function listUploadJobs(params?: {
  status?: string;
  actor?: string;
  product_source?: string;
}): Promise<UploadListResponse> {
  const token = await getAuthToken();

  const queryParams = new URLSearchParams();
  if (params?.status && params.status !== 'ALL') {
    queryParams.set('status', params.status);
  }
  if (params?.actor && params.actor.trim()) {
    queryParams.set('actor', params.actor.trim());
  }
  if (params?.product_source && params.product_source.trim()) {
    queryParams.set('product_source', params.product_source.trim());
  }

  const queryString = queryParams.toString();
  const path = `/upload/jobs${queryString ? `?${queryString}` : ''}`;

  return apiClient.request<UploadListResponse>(path, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * DELETE /upload/jobs/{upload_id}
 * Cancels a pending upload and cleans up backend staging.
 */
export async function cancelUploadJob(
  uploadId: string,
  reason: string
): Promise<UploadCancelResponse> {
  const token = await getAuthToken();

  return apiClient.request<UploadCancelResponse>(
    `/upload/jobs/${encodeURIComponent(uploadId)}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    }
  );
}
