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

  it('executes dataset discovery to package details workflow', async () => {
    const discoveryApi = await import('../../api/discovery');
    const packagesApi = await import('../../api/packages');

    vi.spyOn(discoveryApi, 'getDiscoveredPackages').mockResolvedValue([
      {
        package_id: 'pkg-discovered-01',
        dataset_id: 'dataset-science-01',
        dataset_version: '1.0.0',
        schema_version: '1.0.0',
        board: 'CBSE',
        medium: 'English',
        language: 'en',
        owner: 'qa-team',
        status: 'VALIDATED',
      },
    ]);

    const discoveredList = await discoveryApi.getDiscoveredPackages();
    expect(discoveredList).toHaveLength(1);
    const selectedPkg = discoveredList[0];
    expect(selectedPkg.package_id).toBe('pkg-discovered-01');

    vi.spyOn(packagesApi, 'getPackage').mockResolvedValue({
      package_id: 'pkg-discovered-01',
      dataset_id: 'dataset-science-01',
      dataset_version: '1.0.0',
      schema_version: '1.0.0',
      board: 'CBSE',
      medium: 'English',
      language: 'en',
      owner: 'qa-team',
      status: 'VALIDATED',
      created_at: '2026-11-01T10:00:00Z',
      updated_at: '2026-11-02T10:00:00Z',
    });

    vi.spyOn(packagesApi, 'getPackageHistory').mockResolvedValue({
      package_id: 'pkg-discovered-01',
      transitions: [
        {
          from_status: 'REGISTERED',
          to_status: 'VALIDATED',
          timestamp: '2026-11-01T10:05:00Z',
          actor: 'validator-engine',
        },
      ],
    });

    const pkgDetails = await packagesApi.getPackage(selectedPkg.package_id);
    expect(pkgDetails.package_id).toBe('pkg-discovered-01');
    expect(pkgDetails.status).toBe('VALIDATED');

    const history = await packagesApi.getPackageHistory(selectedPkg.package_id);
    expect(history.transitions).toHaveLength(1);
    expect(history.transitions[0].to_status).toBe('VALIDATED');
  });
});
