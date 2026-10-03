import { apiClient } from './client';
import { getAuthToken } from './auth';
import type {
  DatabasesResponse,
  TargetDatabaseInfo,
  IngestionRequest,
  IngestionJob,
  IngestionJobsResponse,
} from '../types/masterdb';

/**
 * GET /databases
 * Authoritative target databases configuration from MASTERDB backend.
 */
export async function getDatabases(): Promise<TargetDatabaseInfo[]> {
  const token = await getAuthToken();
  const res = await apiClient.request<DatabasesResponse>('/databases', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (Array.isArray(res)) {
    return res;
  }
  if (res && Array.isArray((res as { databases?: TargetDatabaseInfo[] }).databases)) {
    return (res as { databases: TargetDatabaseInfo[] }).databases;
  }
  return [];
}

/**
 * POST /ingest
 * Initiates a controlled ingestion request with Bearer JWT.
 * Contract:
 * {
 *   "dataset_id": string,
 *   "target_database": TargetDatabase,
 *   "source_format": IngestionFormat,
 *   "package_id": string | null,
 *   "upload_id": string | null,
 *   "metadata": {}
 * }
 */
export async function createIngestion(payload: IngestionRequest): Promise<IngestionJob> {
  const token = await getAuthToken();

  const body: Record<string, unknown> = {
    dataset_id: payload.dataset_id,
    target_database: payload.target_database,
    source_format: payload.source_format,
    package_id: payload.package_id && payload.package_id.trim() ? payload.package_id.trim() : null,
    upload_id: payload.upload_id && payload.upload_id.trim() ? payload.upload_id.trim() : null,
    metadata: payload.metadata ?? {},
  };

  return apiClient.request<IngestionJob>('/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

/**
 * GET /ingest/jobs/{job_id}
 * Retrieves current status and evidence of a controlled ingestion job.
 */
export async function getIngestionJob(jobId: string): Promise<IngestionJob> {
  const token = await getAuthToken();
  return apiClient.request<IngestionJob>(`/ingest/jobs/${encodeURIComponent(jobId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * GET /ingest/jobs
 * Lists recent controlled ingestion jobs.
 */
export async function getIngestionJobs(): Promise<IngestionJob[]> {
  const token = await getAuthToken();
  const res = await apiClient.request<IngestionJobsResponse>('/ingest/jobs', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (Array.isArray(res)) {
    return res;
  }
  if (res && Array.isArray((res as { jobs?: IngestionJob[] }).jobs)) {
    return (res as { jobs: IngestionJob[] }).jobs;
  }
  return [];
}
