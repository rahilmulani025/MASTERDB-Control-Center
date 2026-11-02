import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  PageHeader,
  SectionHeader,
  StatusBadge,
  DataTable,
  SearchInput,
} from '../components/ui';
import type {
  DiscoveredPackage,
  ValidationStatusResponse,
  ValidationReportResponse,
  TantraCertificationStatus,
  RetrievalEvidence,
  PackageLineageResponse,
  MDUProvenanceEvent,
  PackageAuditReport,
  PackageReplayResult,
  SharedRegistryResponse,
  SharedContractsResponse,
  APIError,
} from '../types/masterdb';
import { getDiscoveredPackages } from '../api/discovery';
import { getValidationStatus, getValidationReport, validateDataset } from '../api/validation';
import { certifyDataset } from '../api/certification';
import { getTantraCertification, getRetrievalReadiness } from '../api/tantra';
import { getPackageRetrieval } from '../api/retrieval';
import { getPackageLineage } from '../api/lineage';
import { getMDUProvenance } from '../api/mdu';
import { getPackageAudit, getPackageReplay } from '../api/audit';
import { getSharedRegistry, getSharedContracts } from '../api/operations';

function parseErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error occurred.';
  const apiErr = err as APIError;
  if (typeof apiErr.message === 'string' && apiErr.message) return apiErr.message;
  if (typeof apiErr.detail === 'string') return apiErr.detail;
  return String(err);
}

// ─────────────────────────────────────────────────────────────
// 1. GOVERNANCE OVERVIEW (/governance)
// ─────────────────────────────────────────────────────────────

export function GovernanceOverview() {
  const [packages, setPackages] = React.useState<DiscoveredPackage[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<string>('');

  React.useEffect(() => {
    let active = true;
    getDiscoveredPackages()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.packages || []);
        if (active) setPackages(list);
      })
      .catch((err) => {
        if (active) setError(parseErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = packages.filter(
    (p) =>
      p.package_id.toLowerCase().includes(filter.toLowerCase()) ||
      p.dataset_id.toLowerCase().includes(filter.toLowerCase()) ||
      p.board.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
      <PageHeader
        eyebrow="SOVEREIGN GOVERNANCE"
        title="Dataset Governance Control Plane"
        description="Unified interface for deterministic validation, certification gates, lineage provenance, retrieval readiness, and cryptographic audit replay."
      />

      <div className="section-container" style={{ marginBottom: '20px' }}>
        <SectionHeader
          eyebrow="LIFECYCLE PIPELINE"
          title="Authoritative Governance Progression"
          detail="Stepwise lifecycle progression enforced by backend certification gates."
        />
        <div className="lifecycle-diagram">
          <div className="lifecycle-node">
            <span className="badge-dot badge-dot-info" />
            <span>REGISTERED</span>
          </div>
          <div className="lifecycle-arrow">→</div>
          <div className="lifecycle-node">
            <span className="badge-dot badge-dot-warning" />
            <span>VALIDATED</span>
          </div>
          <div className="lifecycle-arrow">→</div>
          <div className="lifecycle-node">
            <span className="badge-dot badge-dot-success" />
            <span>CERTIFIED</span>
          </div>
          <div className="lifecycle-arrow">→</div>
          <div className="lifecycle-node">
            <span className="badge-dot badge-dot-info" />
            <span>KNOWLEDGE OBJECT</span>
          </div>
          <div className="lifecycle-arrow">→</div>
          <div className="lifecycle-node" style={{ borderColor: 'var(--success)' }}>
            <span className="badge-dot badge-dot-success" />
            <span>RETRIEVAL READY</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Link to="/governance/validation" style={{ textDecoration: 'none' }}>
          <div className="card stat-card" style={{ cursor: 'pointer', height: '100%' }}>
            <div className="card-label">STEP 1</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0' }}>Dataset Validation</div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Schema conformity, integrity boundary check, completeness, and risk engine profiling.
            </p>
          </div>
        </Link>

        <Link to="/governance/certification" style={{ textDecoration: 'none' }}>
          <div className="card stat-card" style={{ cursor: 'pointer', height: '100%' }}>
            <div className="card-label">STEP 2</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0' }}>Certification Gate</div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Authoritative state promotion, MASTERDB eligibility verification, and signed decision records.
            </p>
          </div>
        </Link>

        <Link to="/lineage" style={{ textDecoration: 'none' }}>
          <div className="card stat-card" style={{ cursor: 'pointer', height: '100%' }}>
            <div className="card-label">STEP 3</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0' }}>Lineage & Provenance</div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Knowledge Object graphs, upstream ancestor walk, and chronological MDU provenance logs.
            </p>
          </div>
        </Link>

        <Link to="/governance/retrieval" style={{ textDecoration: 'none' }}>
          <div className="card stat-card" style={{ cursor: 'pointer', height: '100%' }}>
            <div className="card-label">STEP 4</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0' }}>Retrieval Readiness</div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              TANTRA runtime readiness assessment, search indexing checks, and corrective actions.
            </p>
          </div>
        </Link>

        <Link to="/audit" style={{ textDecoration: 'none' }}>
          <div className="card stat-card" style={{ cursor: 'pointer', height: '100%' }}>
            <div className="card-label">STEP 5</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0' }}>Audit & Replay</div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              State transition hash chain audit and deterministic replay consistency evaluation.
            </p>
          </div>
        </Link>
      </div>

      <div className="section-container">
        <SectionHeader
          eyebrow="REGISTERED CATALOGUE"
          title="Governance Inventory"
          detail="Live registered dataset packages eligible for governance evaluation."
        />

        <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <SearchInput value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by package ID, dataset ID, board..." />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Showing {filtered.length} of {packages.length} registered packages
          </span>
        </div>

        {loading && <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading governance inventory from MASTERDB backend...</div>}
        {error && <div className="notice error">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No registered packages match the current filter.
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <DataTable
            headers={['Package ID', 'Dataset ID', 'Version', 'Board / Language', 'Owner', 'Actions']}
            rows={filtered.map((pkg) => [
              <span key="pkg" className="code-val" style={{ fontWeight: 600 }}>{pkg.package_id}</span>,
              <span key="ds">{pkg.dataset_id}</span>,
              <span key="ver">{pkg.dataset_version}</span>,
              <span key="board">{pkg.board} / {pkg.language}</span>,
              <span key="owner">{pkg.owner}</span>,
              <div key="act" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Link to={`/datasets/${encodeURIComponent(pkg.package_id)}`} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', textDecoration: 'none' }}>
                  360° View
                </Link>
                <Link to={`/governance/validation?id=${encodeURIComponent(pkg.dataset_id)}`} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', textDecoration: 'none' }}>
                  Validate
                </Link>
                <Link to={`/governance/certification?id=${encodeURIComponent(pkg.dataset_id)}`} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', textDecoration: 'none' }}>
                  Certify
                </Link>
                <Link to={`/lineage?id=${encodeURIComponent(pkg.package_id)}`} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', textDecoration: 'none' }}>
                  Lineage
                </Link>
              </div>,
            ])}
          />
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. VALIDATION VIEW (/governance/validation)
// ─────────────────────────────────────────────────────────────

export function ValidationView() {
  const [packages, setPackages] = React.useState<DiscoveredPackage[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = React.useState<string>('sample-certified');
  const [status, setStatus] = React.useState<ValidationStatusResponse | null>(null);
  const [report, setReport] = React.useState<ValidationReportResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [executing, setExecuting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const [datasetPath, setDatasetPath] = React.useState<string>('datasets/certifiable_sample.csv');
  const [metadataPath, setMetadataPath] = React.useState<string>('datasets/metadata.json');

  // Load available packages
  React.useEffect(() => {
    getDiscoveredPackages()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.packages || []);
        if (list.length > 0) {
          setPackages(list);
          const params = new URLSearchParams(window.location.search);
          const queryId = params.get('id');
          if (queryId) {
            setSelectedDatasetId(queryId);
          } else if (list[0].dataset_id) {
            setSelectedDatasetId(list[0].dataset_id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const loadData = React.useCallback(async (targetId: string) => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const [statusRes, reportRes] = await Promise.allSettled([
        getValidationStatus(targetId),
        getValidationReport(targetId),
      ]);
      if (statusRes.status === 'fulfilled') {
        setStatus(statusRes.value);
      } else {
        setStatus(null);
      }
      if (reportRes.status === 'fulfilled') {
        setReport(reportRes.value);
      } else {
        setReport(null);
      }
      if (statusRes.status === 'rejected' && reportRes.status === 'rejected') {
        setError(`No existing validation records found for dataset ID "${targetId}". Execute validation below.`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    if (selectedDatasetId) {
      void Promise.resolve().then(() => {
        if (active) loadData(selectedDatasetId);
      });
    }
    return () => {
      active = false;
    };
  }, [selectedDatasetId, loadData]);

  const handleExecuteValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    setExecuting(true);
    setError(null);
    setActionSuccess(null);
    try {
      const resp = await validateDataset({
        dataset_id: selectedDatasetId,
        dataset_path: datasetPath,
        metadata_path: metadataPath || undefined,
      });
      setActionSuccess(`Validation successfully executed. State: ${resp.state}. Integrity Score: ${resp.report?.integrity_score ?? 100}%`);
      await loadData(selectedDatasetId);
    } catch (err) {
      setError(parseErrorMessage(err));
    } finally {
      setExecuting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="GOVERNANCE DISCIPLINE"
        title="Deterministic Dataset Validation"
        description="Inspect rule-by-rule validation reports, schema conformity metrics, and trigger authoritative validation evaluations."
      />

      <div className="section-container" style={{ marginBottom: '20px' }}>
        <SectionHeader
          eyebrow="TARGET SELECTION"
          title="Select Target Dataset"
          detail="Choose a registered package or input a target dataset identifier."
        />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              minWidth: '280px',
            }}
          >
            {packages.map((p) => (
              <option key={p.package_id} value={p.dataset_id}>
                {p.dataset_id} ({p.package_id} - {p.board})
              </option>
            ))}
            <option value="sample-certified">sample-certified (Reference)</option>
            <option value="sample-rejected">sample-rejected (Reference)</option>
          </select>
          <input
            type="text"
            placeholder="Or type custom dataset_id..."
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              width: '240px',
            }}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => loadData(selectedDatasetId)}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Status'}
          </button>
        </div>
      </div>

      {actionSuccess && <div className="notice success" style={{ marginBottom: '16px' }}>{actionSuccess}</div>}
      {error && <div className="notice warning" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Validation Status & Report Display */}
      {status && (
        <div className="section-container" style={{ marginBottom: '20px' }}>
          <SectionHeader
            eyebrow="EVALUATION VERDICT"
            title={`Validation Standing: ${status.state || 'UNKNOWN'}`}
            detail={`Integrity Score: ${status.integrity_score ?? 'N/A'}% | Classification: ${status.classification || 'Unclassified'}`}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div className="card stat-card">
              <div className="card-label">STATE</div>
              <div style={{ marginTop: '4px' }}>
                <StatusBadge kind={status.state === 'VALIDATED' || status.state === 'CERTIFIED' ? 'success' : 'danger'}>
                  {status.state}
                </StatusBadge>
              </div>
            </div>
            <div className="card stat-card">
              <div className="card-label">INTEGRITY SCORE</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {status.integrity_score !== undefined ? `${status.integrity_score}%` : '—'}
              </div>
            </div>
            <div className="card stat-card">
              <div className="card-label">CLASSIFICATION</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                {status.classification || '—'}
              </div>
            </div>
            <div className="card stat-card">
              <div className="card-label">INGESTION ELIGIBLE</div>
              <div style={{ marginTop: '4px' }}>
                <StatusBadge kind={status.eligible_for_masterdb ? 'success' : 'warning'}>
                  {status.eligible_for_masterdb ? 'Eligible' : 'Gated'}
                </StatusBadge>
              </div>
            </div>
          </div>

          {report?.risk_flags && report.risk_flags.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--danger)', marginBottom: '6px' }}>
                Risk Flags Detected:
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {report.risk_flags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Execute Validation Form */}
      <div className="section-container">
        <SectionHeader
          eyebrow="OPERATIONAL MUTATION"
          title="Execute Dataset Validation"
          detail="Dispatches POST /validate with dataset path and metadata definition."
        />
        <form onSubmit={handleExecuteValidation} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '640px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Dataset Path
            </label>
            <input
              type="text"
              value={datasetPath}
              onChange={(e) => setDatasetPath(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Metadata Path (Optional)
            </label>
            <input
              type="text"
              value={metadataPath}
              onChange={(e) => setMetadataPath(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={executing}
            style={{ width: 'fit-content', marginTop: '6px' }}
          >
            {executing ? 'Evaluating...' : 'Run Validation Evaluation'}
          </button>
        </form>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. CERTIFICATION VIEW (/governance/certification)
// ─────────────────────────────────────────────────────────────

export function CertificationView() {
  const [packages, setPackages] = React.useState<DiscoveredPackage[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = React.useState<string>('sample-certified');
  const [status, setStatus] = React.useState<ValidationStatusResponse | null>(null);
  const [tantraStatus, setTantraStatus] = React.useState<TantraCertificationStatus | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [certifying, setCertifying] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    getDiscoveredPackages()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.packages || []);
        if (list.length > 0) {
          setPackages(list);
          const params = new URLSearchParams(window.location.search);
          const queryId = params.get('id');
          if (queryId) setSelectedDatasetId(queryId);
        }
      })
      .catch(() => {});
  }, []);

  const loadData = React.useCallback(async (targetId: string) => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const [statusRes, tantraRes] = await Promise.allSettled([
        getValidationStatus(targetId),
        getTantraCertification(targetId),
      ]);
      if (statusRes.status === 'fulfilled') setStatus(statusRes.value);
      else setStatus(null);
      if (tantraRes.status === 'fulfilled') setTantraStatus(tantraRes.value);
      else setTantraStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    if (selectedDatasetId) {
      void Promise.resolve().then(() => {
        if (active) loadData(selectedDatasetId);
      });
    }
    return () => {
      active = false;
    };
  }, [selectedDatasetId, loadData]);

  const handleCertify = async () => {
    setCertifying(true);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await certifyDataset({ dataset_id: selectedDatasetId });
      setActionSuccess(`Certification completed. State: ${res.state}. Decision: ${res.decision?.eligible_for_masterdb ? 'Eligible for MASTERDB Ingestion' : 'Rejected'}.`);
      await loadData(selectedDatasetId);
    } catch (err) {
      setError(parseErrorMessage(err));
    } finally {
      setCertifying(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="GOVERNANCE GATE"
        title="MASTERDB Certification Authority"
        description="Enforces sovereign certification gates required before dataset promotion and multi-tier database ingestion."
      />

      <div className="section-container" style={{ marginBottom: '20px' }}>
        <SectionHeader
          eyebrow="CERTIFICATION TARGET"
          title="Select Target Dataset"
          detail="Choose a dataset package to review or certify."
        />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              minWidth: '280px',
            }}
          >
            {packages.map((p) => (
              <option key={p.package_id} value={p.dataset_id}>
                {p.dataset_id} ({p.package_id})
              </option>
            ))}
            <option value="sample-certified">sample-certified (Reference)</option>
          </select>
          <button
            type="button"
            className="btn-primary"
            onClick={handleCertify}
            disabled={certifying || loading}
          >
            {certifying ? 'Certifying...' : 'Request Certification (POST /certify)'}
          </button>
        </div>
      </div>

      {actionSuccess && <div className="notice success" style={{ marginBottom: '16px' }}>{actionSuccess}</div>}
      {error && <div className="notice warning" style={{ marginBottom: '16px' }}>{error}</div>}

      <div className="section-container">
        <SectionHeader
          eyebrow="CERTIFICATION STATE"
          title="Current Certification Records"
          detail="Combined view of local MASTERDB state and TANTRA sovereign certification."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div className="card stat-card">
            <div className="card-label">MASTERDB CERTIFICATION</div>
            <div style={{ marginTop: '6px' }}>
              <StatusBadge kind={status?.state === 'CERTIFIED' ? 'success' : 'warning'}>
                {status?.state || 'UNCERTIFIED'}
              </StatusBadge>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Integrity Score: {status?.integrity_score ?? 'N/A'}%
            </div>
          </div>

          <div className="card stat-card">
            <div className="card-label">TANTRA RUNTIME STANDING</div>
            <div style={{ marginTop: '6px' }}>
              <StatusBadge kind={tantraStatus?.state === 'CERTIFIED' ? 'success' : 'info'}>
                {tantraStatus?.state === 'CERTIFIED' ? 'TANTRA Certified' : 'Pending TANTRA Gate'}
              </StatusBadge>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Eligibility: {tantraStatus?.eligible_for_masterdb ? 'Eligible' : 'Not Certified'}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. RETRIEVAL READINESS VIEW (/governance/retrieval)
// ─────────────────────────────────────────────────────────────

export function RetrievalReadinessView() {
  const [packages, setPackages] = React.useState<DiscoveredPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = React.useState<string>('');
  const [retrieval, setRetrieval] = React.useState<RetrievalEvidence | null>(null);
  const [tantraReadiness, setTantraReadiness] = React.useState<RetrievalEvidence | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getDiscoveredPackages()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.packages || []);
        if (list.length > 0) {
          setPackages(list);
          const params = new URLSearchParams(window.location.search);
          const queryId = params.get('id');
          if (queryId) setSelectedPackageId(queryId);
          else setSelectedPackageId(list[0].package_id);
        }
      })
      .catch(() => {});
  }, []);

  const loadData = React.useCallback(async (targetPkgId: string) => {
    if (!targetPkgId) return;
    setLoading(true);
    setError(null);
    try {
      const [rRes, tRes] = await Promise.allSettled([
        getPackageRetrieval(targetPkgId),
        getRetrievalReadiness(targetPkgId),
      ]);
      if (rRes.status === 'fulfilled') setRetrieval(rRes.value);
      else setRetrieval(null);
      if (tRes.status === 'fulfilled') setTantraReadiness(tRes.value);
      else setTantraReadiness(null);
      if (rRes.status === 'rejected' && tRes.status === 'rejected') {
        setError(`Retrieval readiness evidence not found for package "${targetPkgId}".`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    if (selectedPackageId) {
      void Promise.resolve().then(() => {
        if (active) loadData(selectedPackageId);
      });
    }
    return () => {
      active = false;
    };
  }, [selectedPackageId, loadData]);

  const activeData = retrieval || tantraReadiness;

  return (
    <>
      <PageHeader
        eyebrow="RETRIEVAL GOVERNANCE"
        title="Retrieval Readiness & Indexing Evaluation"
        description="Assesses whether registered packages meet deterministic indexing, metadata completeness, and latency standards for sovereign inference retrieval."
      />

      <div className="section-container" style={{ marginBottom: '20px' }}>
        <SectionHeader
          eyebrow="PACKAGE SELECTION"
          title="Select Package for Assessment"
          detail="Choose package to evaluate retrieval readiness."
        />
        <select
          value={selectedPackageId}
          onChange={(e) => setSelectedPackageId(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            minWidth: '320px',
          }}
        >
          {packages.map((p) => (
            <option key={p.package_id} value={p.package_id}>
              {p.package_id} — {p.dataset_id} ({p.board})
            </option>
          ))}
        </select>
      </div>

      {loading && <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Evaluating retrieval readiness...</div>}
      {error && <div className="notice warning">{error}</div>}

      {activeData && (
        <div className="section-container">
          <SectionHeader
            eyebrow="EVALUATION RESULTS"
            title={`Standing: ${activeData.status}`}
            detail={`Generated at: ${activeData.generated_at}`}
          />
          <div style={{ marginBottom: '16px' }}>
            <StatusBadge kind={activeData.status === 'RETRIEVABLE' || activeData.status === 'CERTIFIED_RETRIEVABLE' ? 'success' : 'warning'}>
              {activeData.status}
            </StatusBadge>
          </div>

          {activeData.rules && activeData.rules.length > 0 && (
            <DataTable
              headers={['Rule Identifier', 'Pass / Fail', 'Rule Detail']}
              rows={activeData.rules.map((rule, idx) => [
                <span key={`r-${idx}`} className="code-val">{rule.rule}</span>,
                <StatusBadge key={`p-${idx}`} kind={rule.passed ? 'success' : 'danger'}>
                  {rule.passed ? 'PASS' : 'FAIL'}
                </StatusBadge>,
                <span key={`d-${idx}`}>{rule.detail}</span>,
              ])}
            />
          )}

          {activeData.corrective_actions && activeData.corrective_actions.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--warning)', marginBottom: '6px' }}>
                Required Corrective Actions:
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {activeData.corrective_actions.map((act, idx) => (
                  <li key={idx}>{act}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. LINEAGE & PROVENANCE VIEW (/lineage)
// ─────────────────────────────────────────────────────────────

export function LineageView() {
  const [packages, setPackages] = React.useState<DiscoveredPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = React.useState<string>('');
  const [selectedDatasetId, setSelectedDatasetId] = React.useState<string>('');
  const [lineage, setLineage] = React.useState<PackageLineageResponse | null>(null);
  const [provenance, setProvenance] = React.useState<MDUProvenanceEvent[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getDiscoveredPackages()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.packages || []);
        if (list.length > 0) {
          setPackages(list);
          const params = new URLSearchParams(window.location.search);
          const queryId = params.get('id');
          const target = list.find((p) => p.package_id === queryId) || list[0];
          setSelectedPackageId(target.package_id);
          setSelectedDatasetId(target.dataset_id);
        }
      })
      .catch(() => {});
  }, []);

  const loadData = React.useCallback(async (pkgId: string, dsId: string) => {
    if (!pkgId) return;
    setLoading(true);
    setError(null);
    try {
      const [lineageRes, provRes] = await Promise.allSettled([
        getPackageLineage(pkgId),
        getMDUProvenance(dsId),
      ]);
      if (lineageRes.status === 'fulfilled') setLineage(lineageRes.value);
      else setLineage(null);
      if (provRes.status === 'fulfilled' && Array.isArray(provRes.value)) {
        setProvenance(provRes.value);
      } else {
        setProvenance([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    if (selectedPackageId) {
      void Promise.resolve().then(() => {
        if (active) loadData(selectedPackageId, selectedDatasetId);
      });
    }
    return () => {
      active = false;
    };
  }, [selectedPackageId, selectedDatasetId, loadData]);

  const handlePackageChange = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    const found = packages.find((p) => p.package_id === pkgId);
    if (found) setSelectedDatasetId(found.dataset_id);
  };

  return (
    <>
      <PageHeader
        eyebrow="PROVENANCE AUDITING"
        title="Dataset Lineage & Canonical Provenance"
        description="Inspect Knowledge Object lineage trees, parent/child relationships, and chronological MDU provenance events."
      />

      <div className="section-container" style={{ marginBottom: '20px' }}>
        <SectionHeader
          eyebrow="TARGET SELECTION"
          title="Select Package for Lineage Inspection"
          detail="Choose package to view dependency graph and provenance events."
        />
        <select
          value={selectedPackageId}
          onChange={(e) => handlePackageChange(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            minWidth: '320px',
          }}
        >
          {packages.map((p) => (
            <option key={p.package_id} value={p.package_id}>
              {p.package_id} ({p.dataset_id})
            </option>
          ))}
        </select>
      </div>

      {loading && <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Loading lineage and provenance records...</div>}
      {error && <div className="notice warning">{error}</div>}

      <div className="section-container" style={{ marginBottom: '20px' }}>
        <SectionHeader
          eyebrow="KNOWLEDGE OBJECT LINEAGE"
          title="Lineage Dependency Walk"
          detail={`Package: ${selectedPackageId}`}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div className="card stat-card">
            <div className="card-label">ANCESTOR PACKAGES</div>
            <div style={{ fontSize: '13px', marginTop: '6px', color: 'var(--text-primary)' }}>
              {lineage?.ancestors && lineage.ancestors.length > 0
                ? lineage.ancestors.join(', ')
                : 'No upstream parent packages (Root Ingestion)'}
            </div>
          </div>
          <div className="card stat-card">
            <div className="card-label">DESCENDANT PACKAGES</div>
            <div style={{ fontSize: '13px', marginTop: '6px', color: 'var(--text-primary)' }}>
              {lineage?.descendants && lineage.descendants.length > 0
                ? lineage.descendants.join(', ')
                : 'No downstream child derivatives registered'}
            </div>
          </div>
        </div>
      </div>

      <div className="section-container">
        <SectionHeader
          eyebrow="MDU AUDIT TRAIL"
          title="Canonical MDU Provenance Events"
          detail={`Chronological transformation records for dataset: ${selectedDatasetId}`}
        />
        {provenance.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No MDU provenance records found for this dataset.
          </div>
        ) : (
          <DataTable
            headers={['Event ID', 'Event Type', 'Timestamp', 'Actor', 'Details']}
            rows={provenance.map((ev, idx) => [
              <span key={`ev-${idx}`} className="code-val">{String(ev.id || ev.event_id || `ev-${idx}`)}</span>,
              <StatusBadge key={`ty-${idx}`} kind="info">{String(ev.event_type || 'PROVENANCE_RECORD')}</StatusBadge>,
              <span key={`ts-${idx}`}>{String(ev.timestamp || '—')}</span>,
              <span key={`ac-${idx}`}>{String(ev.actor || 'system')}</span>,
              <span key={`dt-${idx}`}>{JSON.stringify(ev.metadata || ev.details || {})}</span>,
            ])}
          />
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. AUDIT & REPLAY VIEW (/audit)
// ─────────────────────────────────────────────────────────────

export function AuditView() {
  const [packages, setPackages] = React.useState<DiscoveredPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = React.useState<string>('');
  const [audit, setAudit] = React.useState<PackageAuditReport | null>(null);
  const [replay, setReplay] = React.useState<PackageReplayResult | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getDiscoveredPackages()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.packages || []);
        if (list.length > 0) {
          setPackages(list);
          const params = new URLSearchParams(window.location.search);
          const queryId = params.get('id');
          if (queryId) setSelectedPackageId(queryId);
          else setSelectedPackageId(list[0].package_id);
        }
      })
      .catch(() => {});
  }, []);

  const loadData = React.useCallback(async (pkgId: string) => {
    if (!pkgId) return;
    setLoading(true);
    setError(null);
    try {
      const [auditRes, replayRes] = await Promise.allSettled([
        getPackageAudit(pkgId),
        getPackageReplay(pkgId),
      ]);
      if (auditRes.status === 'fulfilled') setAudit(auditRes.value);
      else setAudit(null);
      if (replayRes.status === 'fulfilled') setReplay(replayRes.value);
      else setReplay(null);
      if (auditRes.status === 'rejected' && replayRes.status === 'rejected') {
        setError(`Audit/replay records not found for package "${pkgId}".`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    if (selectedPackageId) {
      void Promise.resolve().then(() => {
        if (active) loadData(selectedPackageId);
      });
    }
    return () => {
      active = false;
    };
  }, [selectedPackageId, loadData]);

  return (
    <>
      <PageHeader
        eyebrow="REPLAY INTEGRITY"
        title="Audit Completeness & Replay Verification"
        description="Verify lifecycle transition continuity, audit completeness, and deterministic state reproduction from transition history."
      />

      <div className="section-container" style={{ marginBottom: '20px' }}>
        <SectionHeader
          eyebrow="TARGET SELECTION"
          title="Select Package for Audit Inspection"
          detail="Choose package to evaluate audit completeness and replay consistency."
        />
        <select
          value={selectedPackageId}
          onChange={(e) => setSelectedPackageId(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            minWidth: '320px',
          }}
        >
          {packages.map((p) => (
            <option key={p.package_id} value={p.package_id}>
              {p.package_id} ({p.dataset_id})
            </option>
          ))}
        </select>
      </div>

      {loading && <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Evaluating audit completeness and replay consistency...</div>}
      {error && <div className="notice warning">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="card stat-card">
          <div className="card-label">AUDIT COMPLETENESS</div>
          <div style={{ marginTop: '6px' }}>
            <StatusBadge kind={audit?.complete ? 'success' : 'warning'}>
              {audit?.complete ? 'Audit Trail Complete' : 'Incomplete Trail'}
            </StatusBadge>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Transitions Recorded: {audit?.transition_count ?? '—'}
          </div>
        </div>

        <div className="card stat-card">
          <div className="card-label">REPLAY CONSISTENCY</div>
          <div style={{ marginTop: '6px' }}>
            <StatusBadge kind={replay?.replay_consistent ? 'success' : 'danger'}>
              {replay?.replay_consistent ? 'Replay Consistent' : 'Drift Detected'}
            </StatusBadge>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Replayed Status: {replay?.replayed_status || '—'}
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 7. SHARED DATA ADMIN VIEW (/admin/shared-data)
// ─────────────────────────────────────────────────────────────

export function SharedDataAdminView() {
  const [registry, setRegistry] = React.useState<SharedRegistryResponse | null>(null);
  const [contracts, setContracts] = React.useState<SharedContractsResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    Promise.allSettled([getSharedRegistry(), getSharedContracts()])
      .then(([regRes, conRes]) => {
        if (!active) return;
        if (regRes.status === 'fulfilled') setRegistry(regRes.value);
        if (conRes.status === 'fulfilled') setContracts(conRes.value);
        if (regRes.status === 'rejected' && conRes.status === 'rejected') {
          setError('Failed to load shared data registry and contracts from backend.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="ECOSYSTEM CONVERGENCE"
        title="Shared Data Registry & Service Contracts"
        description="Inspect registered shared ecosystem datasets, active schema versions, and cross-subsystem convergence contracts."
      />

      {loading && <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading shared registry...</div>}
      {error && <div className="notice warning">{error}</div>}

      {registry && (
        <div className="section-container" style={{ marginBottom: '24px' }}>
          <SectionHeader
            eyebrow="DATASET REGISTRY"
            title="Registered Shared Datasets"
            detail="Canonical ecosystem registries managed under sovereign MASTERDB convergence."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {Object.entries(registry).map(([key, val]) => (
              <div key={key} className="card stat-card">
                <div className="card-label">{key.toUpperCase()}</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {typeof val === 'object' && val !== null && 'name' in val ? String((val as { name?: unknown }).name) : key}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Records / Details: {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {contracts && (
        <div className="section-container">
          <SectionHeader
            eyebrow="SERVICE CONTRACTS"
            title="Convergence Contracts"
            detail="Schema compatibility and service contract specifications."
          />
          <DataTable
            headers={['Service Name', 'Version', 'Contract Specification']}
            rows={Object.entries(contracts).map(([srv, contract]) => [
              <span key={`s-${srv}`} className="code-val">{srv}</span>,
              <span key={`v-${srv}`}>
                {typeof contract === 'object' && contract !== null && 'version' in contract
                  ? String((contract as { version?: unknown }).version)
                  : '1.0'}
              </span>,
              <span key={`c-${srv}`}>{JSON.stringify(contract)}</span>,
            ])}
          />
        </div>
      )}
    </>
  );
}
