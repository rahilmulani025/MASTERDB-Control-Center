import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../../api/client';
import { validateDataset, getValidationStatus, getValidationReport } from '../../api/validation';
import { certifyDataset } from '../../api/certification';
import { getDiscoveredPackages } from '../../api/discovery';
import { getRetrievalReadiness, getTantraCertification, getPackageRuntime } from '../../api/tantra';
import { getPackageLineage } from '../../api/lineage';
import { getMDUProvenance, getMDUSchema, getMDUSchemaCompatibility } from '../../api/mdu';
import { getPackageAudit, getPackageReplay } from '../../api/audit';
import { getAdminToken, getAdminConfiguration, createAdminBackup, restoreAdminBackup } from '../../api/admin';
import {
  getRuntimeIdentity,
  getSharedRegistry,
  getSharedContracts,
  getParikshakReviewReferences,
  getNiyantranTaskState,
  getReplayRegistryManifest,
} from '../../api/operations';
import { getPackage, getPackageHistory } from '../../api/packages';
import { getHealth, getReadiness } from '../../api/health';

describe('Governance & Operations API Clients Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('tests validation API endpoints', async () => {
    const mockReq = vi.spyOn(apiClient, 'request').mockResolvedValue({ status: 'VALIDATED' });

    await validateDataset({
      dataset_id: 'ds-100',
      board: 'CBSE',
      medium: 'English',
      language: 'en',
      subject: 'Math',
      grade: '10',
    });
    expect(mockReq).toHaveBeenCalledWith('/validate', expect.objectContaining({ method: 'POST' }));

    await getValidationStatus('ds-100');
    expect(mockReq).toHaveBeenCalledWith('/status/ds-100');

    await getValidationReport('ds-100');
    expect(mockReq).toHaveBeenCalledWith('/report/ds-100');
  });

  it('tests certification API endpoints', async () => {
    const mockReq = vi.spyOn(apiClient, 'request').mockResolvedValue({ status: 'CERTIFIED' });

    await certifyDataset({ dataset_id: 'ds-100', certified_by: 'qa-lead' });
    expect(mockReq).toHaveBeenCalledWith('/certify', expect.objectContaining({ method: 'POST' }));
  });

  it('tests discovery API endpoints', async () => {
    const mockReq = vi.spyOn(apiClient, 'request').mockResolvedValue([]);
    await getDiscoveredPackages();
    expect(mockReq).toHaveBeenCalledWith('/discovery/packages');
  });

  it('tests TANTRA runtime endpoints', async () => {
    const mockReq = vi.spyOn(apiClient, 'request').mockResolvedValue({ ready: true });

    await getRetrievalReadiness('pkg-1');
    expect(mockReq).toHaveBeenCalledWith('/tantra/packages/pkg-1/retrieval-readiness');

    await getTantraCertification('ds-1');
    expect(mockReq).toHaveBeenCalledWith('/tantra/certification/ds-1');

    await getPackageRuntime('pkg-1');
    expect(mockReq).toHaveBeenCalledWith('/tantra/packages/pkg-1/runtime');
  });

  it('tests Lineage & Provenance endpoints', async () => {
    const mockReq = vi.spyOn(apiClient, 'request').mockResolvedValue({ package_id: 'pkg-1' });

    await getPackageLineage('pkg-1');
    expect(mockReq).toHaveBeenCalledWith('/packages/pkg-1/lineage');

    await getMDUProvenance('ds-1');
    expect(mockReq).toHaveBeenCalledWith('/mdu/provenance/ds-1');

    await getMDUSchema('ds-1');
    expect(mockReq).toHaveBeenCalledWith('/mdu/schema/ds-1');

    await getMDUSchemaCompatibility('ds-1', '2.0');
    expect(mockReq).toHaveBeenCalledWith('/mdu/schema-compatibility/ds-1?local_schema_version=2.0');
  });

  it('tests Audit & Replay endpoints', async () => {
    const mockReq = vi.spyOn(apiClient, 'request').mockResolvedValue({ status: 'COMPLETE' });

    await getPackageAudit('pkg-1');
    expect(mockReq).toHaveBeenCalledWith('/packages/pkg-1/audit');

    await getPackageReplay('pkg-1');
    expect(mockReq).toHaveBeenCalledWith('/packages/pkg-1/replay');
  });

  it('tests Admin endpoints with bearer token', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).includes('/auth/token')) {
        return new Response(
          JSON.stringify({
            access_token: 'test-admin-token',
            actor: 'bhiv-admin',
            expires_at: new Date(Date.now() + 3600_000).toISOString(),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const token = await getAdminToken('secret-pass');
    expect(token).toBe('test-admin-token');

    const config = await getAdminConfiguration();
    expect(config).toBeDefined();

    const backup = await createAdminBackup();
    expect(backup).toBeDefined();

    const restoreRes = await restoreAdminBackup({
      snapshot_id: 'snap-1',
      created_at: '2026-11-02',
      records: [],
      integrity_hash: 'abc',
    });
    expect(restoreRes).toBeDefined();
  });

  it('tests Shared Operations endpoints', async () => {
    const mockReq = vi.spyOn(apiClient, 'request').mockResolvedValue({ status: 'ok' });

    await getRuntimeIdentity();
    expect(mockReq).toHaveBeenCalledWith('/runtime/identity');

    await getSharedRegistry();
    expect(mockReq).toHaveBeenCalledWith('/shared/registry');

    await getSharedContracts();
    expect(mockReq).toHaveBeenCalledWith('/shared/contracts');

    await getParikshakReviewReferences();
    expect(mockReq).toHaveBeenCalledWith('/parikshak/review-references');

    await getNiyantranTaskState();
    expect(mockReq).toHaveBeenCalledWith('/niyantran/task-state');

    await getReplayRegistryManifest();
    expect(mockReq).toHaveBeenCalledWith('/replay-registry/manifest');
  });

  it('tests Packages & Health endpoints', async () => {
    const mockReq = vi.spyOn(apiClient, 'request').mockResolvedValue({ status: 'ok' });

    await getPackage('pkg-1');
    expect(mockReq).toHaveBeenCalledWith('/packages/pkg-1');

    await getPackageHistory('pkg-1');
    expect(mockReq).toHaveBeenCalledWith('/packages/pkg-1/history');

    await getHealth();
    expect(mockReq).toHaveBeenCalledWith('/health');

    await getReadiness();
    expect(mockReq).toHaveBeenCalledWith('/ready');
  });
});
