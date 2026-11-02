import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  computeFileSha256,
  initiateUpload,
  uploadFileContent,
  validateUpload,
  getUploadJob,
  listUploadJobs,
  cancelUploadJob,
} from '../../api/upload';
import { apiClient } from '../../api/client';
import * as auth from '../../api/auth';
import type {
  UploadInitiationResponse,
  UploadContentResponse,
  UploadValidationResponse,
  UploadJob,
} from '../../types/masterdb';

describe('Upload API Service Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(auth, 'getAuthToken').mockResolvedValue('mock-auth-token');
  });

  it('computes correct deterministic SHA-256 hash of a file using Web Crypto API', async () => {
    const fileContent = '{"record_id":"test-001","value":42}';
    const file = new File([fileContent], 'test.json', { type: 'application/json' });

    const hash = await computeFileSha256(file);
    expect(hash).toHaveLength(64);
    expect(typeof hash).toBe('string');

    // SHA-256 must be deterministic for identical content
    const hash2 = await computeFileSha256(file);
    expect(hash).toBe(hash2);
  });

  it('computes correct SHA-256 hash for an empty file', async () => {
    const emptyFile = new File([], 'empty.txt', { type: 'text/plain' });
    const hash = await computeFileSha256(emptyFile);
    // Well-known SHA-256 hash of empty input
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('initializes upload session via POST /upload', async () => {
    const mockInitResponse: UploadInitiationResponse = {
      upload_id: 'upl-test-12345',
      status: 'UPLOAD_INITIATED',
      trace_id: 'trace-test-1',
      max_file_size_bytes: 524288000,
      supported_formats: ['JSON', 'CSV', 'XLSX'],
    };

    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValue(mockInitResponse);

    const resp = await initiateUpload({
      filename: 'customers.json',
      content_type: 'application/json',
      file_size: 1024,
      checksum_sha256: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
      classification: 'internal',
    });

    expect(resp.upload_id).toBe('upl-test-12345');
    expect(resp.status).toBe('UPLOAD_INITIATED');
    expect(requestSpy).toHaveBeenCalledWith(
      '/upload',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-auth-token',
        }),
      })
    );
  });

  it('streams raw binary file content with Content-Type: application/octet-stream', async () => {
    const mockContentResponse: UploadContentResponse = {
      upload_id: 'upl-test-12345',
      status: 'RECEIVED',
      bytes_received: 512,
      checksum_verified: true,
      sha256: 'matched-hash',
    };

    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValue(mockContentResponse);

    const file = new File(['binary payload test'], 'data.bin');
    const resp = await uploadFileContent('upl-test-12345', file);

    expect(resp.status).toBe('RECEIVED');
    expect(resp.checksum_verified).toBe(true);
    expect(requestSpy).toHaveBeenCalledWith(
      '/upload/upl-test-12345/content',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/octet-stream',
          Authorization: 'Bearer mock-auth-token',
        }),
      }),
      120000
    );
  });

  it('triggers pre-ingestion validation via POST /upload/{id}/validate', async () => {
    const mockValResponse: UploadValidationResponse = {
      upload_id: 'upl-test-12345',
      status: 'VALIDATED',
      format_valid: true,
      detected_format: 'JSON',
      record_count: 100,
      validation_checks: {
        checksum: 'passed',
        structure: 'passed',
      },
    };

    const requestSpy = vi.spyOn(apiClient, 'request').mockResolvedValue(mockValResponse);

    const resp = await validateUpload('upl-test-12345');
    expect(resp.status).toBe('VALIDATED');
    expect(resp.record_count).toBe(100);
    expect(requestSpy).toHaveBeenCalledWith(
      '/upload/upl-test-12345/validate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-auth-token',
        }),
      })
    );
  });

  it('fetches upload job status via GET /upload/jobs/{upload_id}', async () => {
    const mockJob: UploadJob = {
      upload_id: 'upl-test-12345',
      status: 'VALIDATED',
      filename: 'dataset.csv',
      file_size_bytes: 4096,
      checksum_sha256: 'hash-abc',
      timestamps: {
        created_at: new Date().toISOString(),
      },
    };

    vi.spyOn(apiClient, 'request').mockResolvedValue(mockJob);

    const job = await getUploadJob('upl-test-12345');
    expect(job.upload_id).toBe('upl-test-12345');
    expect(job.status).toBe('VALIDATED');
  });

  it('lists upload jobs with query filters via GET /upload/jobs', async () => {
    vi.spyOn(apiClient, 'request').mockResolvedValue({
      count: 1,
      uploads: [
        {
          upload_id: 'upl-1',
          status: 'VALIDATED',
          filename: 'test.json',
          file_size_bytes: 100,
          actor: 'operator',
          uploaded_at: new Date().toISOString(),
        },
      ],
    });

    const list = await listUploadJobs({ status: 'VALIDATED', actor: 'operator' });
    expect(list.count).toBe(1);
    expect(list.uploads[0].upload_id).toBe('upl-1');
  });

  it('cancels pending upload job via DELETE /upload/jobs/{upload_id}', async () => {
    vi.spyOn(apiClient, 'request').mockResolvedValue({
      upload_id: 'upl-test-12345',
      status: 'REJECTED',
      rejection_reason: 'User cancelled upload session',
    });

    const res = await cancelUploadJob('upl-test-12345', 'User cancelled upload session');
    expect(res.status).toBe('REJECTED');
    expect(res.rejection_reason).toBe('User cancelled upload session');
  });
});
