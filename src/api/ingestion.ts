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
 */
export async function createIngestion(payload: IngestionRequest): Promise<IngestionJob> {
  const token = await getAuthToken();

  const body: Record<string, unknown> = {
    dataset_id: payload.dataset_id,
    target_database: payload.target_database,
    source_format: payload.source_format,
    metadata: payload.metadata ?? {},
  };

  if (payload.package_id && payload.package_id.trim()) {
    body.package_id = payload.package_id.trim();
  }

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
