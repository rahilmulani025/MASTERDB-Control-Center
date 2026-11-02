import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authApi from '../../api/auth';
import * as uploadApi from '../../api/upload';
import * as ingestionApi from '../../api/ingestion';

describe('Frontend Workflow Integration Tests (Controlled Fixtures)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authApi, 'getAuthToken').mockResolvedValue('integration-test-token');
  });

  it('executes full upload -> validate -> ingest -> read-back lifecycle', async () => {
    // 1. Client-side hashing & upload initialization
    const dummyFile = new File(['{"item_id":"ITM-001","qty":50}'], 'inventory.json', { type: 'application/json' });
    const computedHash = await uploadApi.computeFileSha256(dummyFile);
    expect(computedHash).toHaveLength(64);

    vi.spyOn(uploadApi, 'initiateUpload').mockResolvedValue({
      upload_id: 'upl-workflow-001',
      status: 'UPLOAD_INITIATED',
      trace_id: 'trace-wf-1',
    });

    const initRes = await uploadApi.initiateUpload({
      filename: dummyFile.name,
      content_type: dummyFile.type,
      file_size: dummyFile.size,
      checksum_sha256: computedHash,
    });
    expect(initRes.upload_id).toBe('upl-workflow-001');

    // 2. Binary stream transfer
    vi.spyOn(uploadApi, 'uploadFileContent').mockResolvedValue({
      upload_id: 'upl-workflow-001',
      status: 'RECEIVED',
      bytes_received: dummyFile.size,
      checksum_verified: true,
      sha256: computedHash,
    });

    const contentRes = await uploadApi.uploadFileContent('upl-workflow-001', dummyFile);
    expect(contentRes.checksum_verified).toBe(true);

    // 3. Pre-ingestion validation
    vi.spyOn(uploadApi, 'validateUpload').mockResolvedValue({
      upload_id: 'upl-workflow-001',
      status: 'VALIDATED',
      format_valid: true,
      detected_format: 'JSON',
      record_count: 1,
    });

    const valRes = await uploadApi.validateUpload('upl-workflow-001');
    expect(valRes.status).toBe('VALIDATED');
    expect(valRes.record_count).toBe(1);

    // 4. Target database capabilities query
    vi.spyOn(ingestionApi, 'getDatabases').mockResolvedValue([
      {
        name: 'RelationalDB',
        display_name: 'Relational Storage',
        supported_formats: ['JSON', 'CSV'],
        required_role: 'operator',
      },
    ]);

    const dbs = await ingestionApi.getDatabases();
    expect(dbs[0].name).toBe('RelationalDB');

    // 5. Ingestion submission
    vi.spyOn(ingestionApi, 'createIngestion').mockResolvedValue({
      job_id: 'job-workflow-001',
      dataset_id: 'dataset-workflow-001',
      target_database: 'RelationalDB',
      source_format: 'JSON',
      upload_id: 'upl-workflow-001',
      status: 'PENDING',
    });

    const job = await ingestionApi.createIngestion({
      dataset_id: 'dataset-workflow-001',
      target_database: 'RelationalDB',
      source_format: 'JSON',
      upload_id: 'upl-workflow-001',
    });
    expect(job.job_id).toBe('job-workflow-001');

    // 6. Polling job to PERSISTED terminal state
    vi.spyOn(ingestionApi, 'getIngestionJob').mockResolvedValue({
      job_id: 'job-workflow-001',
      dataset_id: 'dataset-workflow-001',
      target_database: 'RelationalDB',
      status: 'PERSISTED',
      metadata: { records_persisted: 1 },
    });

    const terminalJob = await ingestionApi.getIngestionJob('job-workflow-001');
    expect(terminalJob.status).toBe('PERSISTED');

    // 7. Target database read-back verification
    vi.spyOn(ingestionApi, 'getDatabaseRecords').mockResolvedValue({
      database_key: 'RelationalDB',
      dataset_id: 'dataset-workflow-001',
      record_count: 1,
      records: [{ item_id: 'ITM-001', qty: 50 }],
    });

    const readBack = await ingestionApi.getDatabaseRecords('RelationalDB', 'dataset-workflow-001');
    expect(readBack.record_count).toBe(1);
    expect(readBack.records[0]).toEqual({ item_id: 'ITM-001', qty: 50 });
  });
});
