import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  GovernanceOverview,
  ValidationView,
  CertificationView,
  RetrievalReadinessView,
  LineageView,
  AuditView,
  SharedDataAdminView,
} from '../../pages/GovernancePages';
import * as discoveryApi from '../../api/discovery';
import * as validationApi from '../../api/validation';
import * as tantraApi from '../../api/tantra';
import * as lineageApi from '../../api/lineage';
import * as auditApi from '../../api/audit';
import * as operationsApi from '../../api/operations';

describe('Governance Views Component Tests', () => {
  const samplePackages = [
    {
      package_id: 'pkg-alpha-001',
      dataset_id: 'dataset-alpha',
      dataset_version: '1.0.0',
      schema_version: '1.0.0',
      board: 'State',
      medium: 'English',
      language: 'en',
      owner: 'governance-team',
      status: 'VALIDATED',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(discoveryApi, 'getDiscoveredPackages').mockResolvedValue(samplePackages);
  });

  it('renders GovernanceOverview with real package list and lifecycle progression', async () => {
    render(
      <MemoryRouter>
        <GovernanceOverview />
      </MemoryRouter>
    );

    expect(screen.getByText('Dataset Governance Control Plane')).toBeInTheDocument();
    expect(screen.getByText('REGISTERED')).toBeInTheDocument();
    expect(screen.getByText('RETRIEVAL READY')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('pkg-alpha-001')).toBeInTheDocument();
      expect(screen.getByText('dataset-alpha')).toBeInTheDocument();
    });
  });

  it('renders ValidationView with status and report details', async () => {
    vi.spyOn(validationApi, 'getValidationStatus').mockResolvedValue({
      dataset_id: 'dataset-alpha',
      state: 'VALIDATED',
      integrity_score: 98.5,
      classification: 'Trusted',
      eligible_for_masterdb: true,
    });

    vi.spyOn(validationApi, 'getValidationReport').mockResolvedValue({
      dataset_id: 'dataset-alpha',
      state: 'VALIDATED',
      integrity_score: 98.5,
      classification: 'Trusted',
      risk_flags: [],
      rules_passed: 12,
      rules_failed: 0,
    });

    render(
      <MemoryRouter>
        <ValidationView />
      </MemoryRouter>
    );

    expect(screen.getByText('Deterministic Dataset Validation')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Validation Standing: VALIDATED')).toBeInTheDocument();
      expect(screen.getByText('98.5%')).toBeInTheDocument();
      expect(screen.getByText('Trusted')).toBeInTheDocument();
    });
  });

  it('renders CertificationView with state badges', async () => {
    vi.spyOn(validationApi, 'getValidationStatus').mockResolvedValue({
      dataset_id: 'dataset-alpha',
      state: 'CERTIFIED',
      integrity_score: 100,
      classification: 'Certified',
      eligible_for_masterdb: true,
    });

    vi.spyOn(tantraApi, 'getTantraCertification').mockResolvedValue({
      dataset_id: 'dataset-alpha',
      state: 'CERTIFIED',
      classification: 'Certified',
      integrity_score: 100,
      eligible_for_masterdb: true,
    });

    render(
      <MemoryRouter>
        <CertificationView />
      </MemoryRouter>
    );

    expect(screen.getByText('MASTERDB Certification Authority')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('MASTERDB CERTIFICATION')).toBeInTheDocument();
      expect(screen.getByText('TANTRA Certified')).toBeInTheDocument();
    });
  });

  it('renders LineageView with dependency graph and provenance events', async () => {
    vi.spyOn(lineageApi, 'getPackageLineage').mockResolvedValue({
      package_id: 'pkg-alpha-001',
      knowledge_object_registered: true,
      ancestors: ['pkg-root-source'],
      descendants: [],
      known_gaps: [],
    });

    render(
      <MemoryRouter>
        <LineageView />
      </MemoryRouter>
    );

    expect(screen.getByText('Dataset Lineage & Canonical Provenance')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('pkg-root-source')).toBeInTheDocument();
      expect(screen.getByText('No downstream child derivatives registered')).toBeInTheDocument();
    });
  });

  it('renders RetrievalReadinessView with rules table', async () => {
    vi.spyOn(tantraApi, 'getRetrievalReadiness').mockResolvedValue({
      package_id: 'pkg-alpha-001',
      status: 'RETRIEVABLE',
      rules: [
        { rule: 'SCHEMA_COMPLIANCE', passed: true, detail: 'Complies with MDU schema v1' },
      ],
      corrective_actions: [],
      generated_at: '2026-11-02T12:00:00Z',
    });

    render(
      <MemoryRouter>
        <RetrievalReadinessView />
      </MemoryRouter>
    );

    expect(screen.getByText('Retrieval Readiness & Indexing Evaluation')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Standing: RETRIEVABLE')).toBeInTheDocument();
      expect(screen.getByText('SCHEMA_COMPLIANCE')).toBeInTheDocument();
    });
  });

  it('renders AuditView with audit completeness and replay consistency', async () => {
    vi.spyOn(auditApi, 'getPackageAudit').mockResolvedValue({
      package_id: 'pkg-alpha-001',
      complete: true,
      issues: [],
      replay_consistent: true,
      transition_count: 5,
    });

    vi.spyOn(auditApi, 'getPackageReplay').mockResolvedValue({
      package_id: 'pkg-alpha-001',
      replay_consistent: true,
      replayed_status: 'CERTIFIED',
    });

    render(
      <MemoryRouter>
        <AuditView />
      </MemoryRouter>
    );

    expect(screen.getByText('Audit Completeness & Replay Verification')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Audit Trail Complete')).toBeInTheDocument();
      expect(screen.getByText('Replay Consistent')).toBeInTheDocument();
    });
  });

  it('renders SharedDataAdminView with registry items and contracts', async () => {
    vi.spyOn(operationsApi, 'getSharedRegistry').mockResolvedValue({
      authentication: { name: 'Authentication Registry', version: '1.0' },
      identity: { name: 'Identity Service', version: '1.0' },
    });

    vi.spyOn(operationsApi, 'getSharedContracts').mockResolvedValue({
      authentication: { version: '1.0', endpoint: '/shared/authentication' },
    });

    render(
      <MemoryRouter>
        <SharedDataAdminView />
      </MemoryRouter>
    );

    expect(screen.getByText('Shared Data Registry & Service Contracts')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Authentication Registry')).toBeInTheDocument();
      expect(screen.getByText('Identity Service')).toBeInTheDocument();
    });
  });
});
