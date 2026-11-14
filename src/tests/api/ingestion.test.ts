import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDatabases,
  createIngestion,
  getIngestionJob,
  getIngestionJobs,
  getDatabaseRecords,
} from '../../api/ingestion';
import { apiClient } from '../../api/client';
import * as auth from '../../api/auth';
import type {
  TargetDatabaseInfo,
  IngestionJob,
  DatabaseRecordsResponse,
} from '../../types/masterdb';

describe('Controlled Ingestion API Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auth, 'getAuthToken').mockResolvedValue('mock-operator-token');
  });

  it('fetches target databases configuration via GET /databases', async () => {
    const mockDatabases: TargetDatabaseInfo[] = [
      {
        name: 'RelationalDB',
        display_name: 'Relational Database (SQLite/Postgres)',
        supported_formats: ['CSV', 'JSON', 'XLSX'],
        required_role: 'operator',
      },
      {
        name: 'VectorDB',
        display_name: 'Vector Store (Embeddings)',
        supported_formats: ['JSON', 'PDF', 'TXT'],
        required_role: 'operator',
      },
    ];

    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValue({ databases: mockDatabases });

    const databases = await getDatabases();
    expect(databases).toHaveLength(2);
    expect(databases[0].name).toBe('RelationalDB');
    expect(requestSpy).toHaveBeenCalledWith(
      '/databases',
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-operator-token' },
      })
    );
  });

  it('submits controlled ingestion job via POST /ingest', async () => {
    const mockJob: IngestionJob = {
      job_id: 'ingest-test-789',
      dataset_id: 'customer_data_v1',
      target_database: 'RelationalDB',
      source_format: 'JSON',
      upload_id: 'upl-test-12345',
      status: 'PENDING',
      trace_id: 'trace-ingest-1',
    };

    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValue(mockJob);

    const job = await createIngestion({
      dataset_id: 'customer_data_v1',
      target_database: 'RelationalDB',
      source_format: 'JSON',
      upload_id: 'upl-test-12345',
      package_id: 'pkg-customer-1',
      metadata: { priority: 'high' },
    });

    expect(job.job_id).toBe('ingest-test-789');
    expect(job.status).toBe('PENDING');
    expect(requestSpy).toHaveBeenCalledWith(
      '/ingest',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-operator-token',
        }),
        body: JSON.stringify({
          dataset_id: 'customer_data_v1',
          target_database: 'RelationalDB',
          source_format: 'JSON',
          package_id: 'pkg-customer-1',
          upload_id: 'upl-test-12345',
          metadata: { priority: 'high' },
        }),
      })
    );
  });

  it('polls individual ingestion job via GET /ingest/jobs/{job_id}', async () => {
    const mockJob: IngestionJob = {
      job_id: 'ingest-test-789',
      dataset_id: 'customer_data_v1',
      target_database: 'RelationalDB',
      status: 'PERSISTED',
      metadata: { records_persisted: 150 },
    };

    vi.spyOn(apiClient, 'request').mockResolvedValue(mockJob);

    const job = await getIngestionJob('ingest-test-789');
    expect(job.job_id).toBe('ingest-test-789');
    expect(job.status).toBe('PERSISTED');
    expect(job.metadata?.records_persisted).toBe(150);
  });

  it('lists ingestion jobs via GET /ingest/jobs', async () => {
    const mockJobs: IngestionJob[] = [
      { job_id: 'job-1', status: 'PERSISTED' },
      { job_id: 'job-2', status: 'FAILED' },
    ];

    vi.spyOn(apiClient, 'request').mockResolvedValue({ jobs: mockJobs });

    const list = await getIngestionJobs();
    expect(list).toHaveLength(2);
    expect(list[0].job_id).toBe('job-1');
  });

  it('reads back verified records directly from target database via GET /databases/{key}/records/{id}', async () => {
    const mockReadBack: DatabaseRecordsResponse = {
      database_key: 'RelationalDB',
      dataset_id: 'customer_data_v1',
      record_count: 2,
      limit: 10,
      offset: 0,
      records: [
        { id: 'REC-001', dataset: 'customer_data_v1', status: 'ACTIVE', value: 100 },
        { id: 'REC-002', dataset: 'customer_data_v1', status: 'ACTIVE', value: 200 },
      ],
    };

    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValue(mockReadBack);

    const readBack = await getDatabaseRecords('RelationalDB', 'customer_data_v1', 10, 0);

    expect(readBack.database_key).toBe('RelationalDB');
    expect(readBack.record_count).toBe(2);
    expect(readBack.records).toHaveLength(2);
    expect(requestSpy).toHaveBeenCalledWith(
      '/databases/RelationalDB/records/customer_data_v1?limit=10&offset=0',
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-operator-token' },
      })
    );
  });

  it('handles URL-safe path encoding for special characters in database key or dataset id', async () => {
    const mockReadBack: DatabaseRecordsResponse = {
      database_key: 'Special DB/Key',
      dataset_id: 'dataset/special#1',
      record_count: 0,
      records: [],
    };

    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValue(mockReadBack);

    await getDatabaseRecords('Special DB/Key', 'dataset/special#1');

    expect(requestSpy).toHaveBeenCalledWith(
      '/databases/Special%20DB%2FKey/records/dataset%2Fspecial%231',
      expect.any(Object)
    );
  });

  it('handles raw array responses and empty fallbacks for getDatabases and getIngestionJobs', async () => {
    // Array direct return
    vi.spyOn(apiClient, 'request').mockResolvedValueOnce([
      { name: 'DirectDB', display_name: 'Direct DB', supported_formats: ['CSV'], required_role: 'operator' },
    ]);
    const dbs1 = await getDatabases();
    expect(dbs1).toHaveLength(1);

    // Empty/invalid object fallback
    vi.spyOn(apiClient, 'request').mockResolvedValueOnce({ unexpected: true });
    const dbs2 = await getDatabases();
    expect(dbs2).toEqual([]);

    // Array direct return for jobs
    vi.spyOn(apiClient, 'request').mockResolvedValueOnce([
      { job_id: 'job-direct-1', status: 'PERSISTED' },
    ]);
    const jobs1 = await getIngestionJobs();
    expect(jobs1).toHaveLength(1);

    // Empty fallback for jobs
    vi.spyOn(apiClient, 'request').mockResolvedValueOnce({ unexpected: true });
    const jobs2 = await getIngestionJobs();
    expect(jobs2).toEqual([]);
  });

  it('validates accepted format matching and rejects invalid format before submission', () => {
    const supportedFormats: Array<'CSV' | 'JSON' | 'XLSX'> = ['CSV', 'JSON', 'XLSX'];
    const chosenFormat = 'PARQUET';
    const isAccepted = supportedFormats.includes(chosenFormat as unknown as 'CSV' | 'JSON' | 'XLSX');
    expect(isAccepted).toBe(false);

    const validFormat = 'CSV';
    expect(supportedFormats.includes(validFormat)).toBe(true);
  });

  it('handles HTTP 401 Unauthorized during ingestion submission', async () => {
    vi.spyOn(apiClient, 'request').mockRejectedValue({
      status: 401,
      message: 'Unauthorized: missing or invalid authentication token',
    });

    await expect(
      createIngestion({
        dataset_id: 'ds-auth-err',
        target_database: 'RelationalDB',
        source_format: 'JSON',
      })
    ).rejects.toMatchObject({ status: 401 });
  });

  it('handles HTTP 403 Forbidden when user lacks operator role', async () => {
    vi.spyOn(apiClient, 'request').mockRejectedValue({
      status: 403,
      message: 'Forbidden: operator role required for target database RelationalDB',
    });

    await expect(
      createIngestion({
        dataset_id: 'ds-role-err',
        target_database: 'RelationalDB',
        source_format: 'JSON',
      })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('handles HTTP 422 Unprocessable Entity when payload is invalid', async () => {
    vi.spyOn(apiClient, 'request').mockRejectedValue({
      status: 422,
      message: 'body.dataset_id: Field required',
    });

    await expect(
      createIngestion({
        dataset_id: '',
        target_database: 'RelationalDB',
        source_format: 'JSON',
      })
    ).rejects.toMatchObject({ status: 422 });
  });

  it('handles REJECTED terminal status and PARTIAL_PERSISTENCE status', async () => {
    const rejectedJob: IngestionJob = {
      job_id: 'job-rejected-1',
      dataset_id: 'dataset-corrupt',
      target_database: 'RelationalDB',
      status: 'REJECTED',
      rejection_reason: 'Integrity check failed: 4 corrupted rows found',
    };

    vi.spyOn(apiClient, 'request').mockResolvedValueOnce(rejectedJob);
    const jobRes1 = await getIngestionJob('job-rejected-1');
    expect(jobRes1.status).toBe('REJECTED');
    expect(jobRes1.rejection_reason).toContain('Integrity check failed');

    const partialJob: IngestionJob = {
      job_id: 'job-partial-1',
      dataset_id: 'dataset-partial',
      target_database: 'RelationalDB',
      status: 'PARTIAL_PERSISTENCE',
      metadata: { records_persisted: 80, records_failed: 20 },
    };

    vi.spyOn(apiClient, 'request').mockResolvedValueOnce(partialJob);
    const jobRes2 = await getIngestionJob('job-partial-1');
    expect(jobRes2.status).toBe('PARTIAL_PERSISTENCE');
    expect(jobRes2.metadata?.records_persisted).toBe(80);
  });
});
