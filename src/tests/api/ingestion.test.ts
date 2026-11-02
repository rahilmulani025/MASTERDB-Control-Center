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
});
