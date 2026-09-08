import { Link, useNavigate, useParams } from 'react-router-dom';
import * as React from 'react';
import { DataTable, EmptyState, PageHeader, SearchInput, SectionHeader, StatusBadge, LoadingState, ErrorState } from '../components/ui';
import type {
  HealthResponse,
  ReadinessResponse,
  PackageDetail,
  PackageHistory,
  PackageTransition,
  DiscoveredPackage,
  ValidationStatusResponse,
  ValidationReportResponse,
  PackageLineageResponse,
  MDUProvenanceEvent,
  RetrievalEvidence,
  PackageAuditReport,
  PackageReplayResult,
  MDUSchemaResponse,
  MDUSchemaCompatibilityResponse,
  TantraCertificationStatus,
  TantraRuntimeLookup,
  RuntimeIdentityResponse,
  SharedRegistryResponse,
  SharedContractsResponse,
  OperationalSyncResponse,
  ReplayRegistryManifestResponse,
  AdminConfigurationReport,
  AdminBackupSnapshot,
  AdminRestoreResponse,
  APIError,
} from '../types/masterdb';
import { getHealth, getReadiness } from '../api/health';
import { getDiscoveredPackages } from '../api/discovery';
import { getPackage, getPackageHistory } from '../api/packages';
import { validateDataset, getValidationStatus, getValidationReport } from '../api/validation';
import { certifyDataset } from '../api/certification';
import { getPackageLineage } from '../api/lineage';
import { getMDUProvenance, getMDUSchema, getMDUSchemaCompatibility } from '../api/mdu';
import { getPackageRetrieval } from '../api/retrieval';
import { getRetrievalReadiness, getTantraCertification, getPackageRuntime } from '../api/tantra';
import { getPackageAudit, getPackageReplay } from '../api/audit';
import { registerKnowledgeObject } from '../api/knowledgeObject';
import {
  getRuntimeIdentity,
  getSharedRegistry,
  getSharedContracts,
  getParikshakReviewReferences,
  getNiyantranTaskState,
  getReplayRegistryManifest,
} from '../api/operations';
import {
  getAdminConfiguration,
  createAdminBackup,
  restoreAdminBackup,
} from '../api/admin';

export function Dashboard() {
  const [health, setHealth] = React.useState<HealthResponse | null>(null);
  const [readiness, setReadiness] = React.useState<ReadinessResponse | null>(null);
  const [identity, setIdentity] = React.useState<RuntimeIdentityResponse | null>(null);
  const [packages, setPackages] = React.useState<DiscoveredPackage[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadOverview = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthRes, readyRes, identRes, discRes] = await Promise.allSettled([
        getHealth(),
        getReadiness(),
        getRuntimeIdentity(),
        getDiscoveredPackages(),
      ]);

      if (healthRes.status === 'fulfilled') setHealth(healthRes.value);
      if (readyRes.status === 'fulfilled') setReadiness(readyRes.value);
      if (identRes.status === 'fulfilled') setIdentity(identRes.value);
      if (discRes.status === 'fulfilled') setPackages(discRes.value.packages ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        loadOverview();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadOverview]);

  return (
    <>
      <PageHeader
        title="MASTERDB Control Center"
        eyebrow="KNOWLEDGE LAYER CONTROL PLANE"
        description="Operational overview of the governed knowledge layer and runtime services."
        action={
          <button className="btn-secondary" onClick={loadOverview} disabled={loading}>
            {loading ? 'Refreshing Overview…' : 'Refresh Overview'}
          </button>
        }
      />

      {/* Hero Runtime Status Strip */}
      <div className="runtime-status-strip">
        <div className="strip-item">
          <span className="strip-label">Runtime:</span>
          <StatusBadge kind={health?.status === 'ok' ? 'success' : 'danger'}>
            {health?.status === 'ok' ? 'HEALTHY' : 'UNHEALTHY'}
          </StatusBadge>
        </div>
        <div className="strip-divider" />
        <div className="strip-item">
          <span className="strip-label">Readiness:</span>
          <StatusBadge kind={readiness?.status === 'ok' ? 'success' : 'warning'}>
            {readiness?.status === 'ok' ? 'READY' : 'DEGRADED'}
          </StatusBadge>
        </div>
        <div className="strip-divider" />
        <div className="strip-item">
          <span className="strip-label">Node:</span>
          <span className="strip-value" style={{ fontFamily: 'monospace' }}>MASTERDB v{identity?.version ?? '1.3.0'}</span>
        </div>
        <div className="strip-divider" />
        <div className="strip-item">
          <span className="strip-label">Role:</span>
          <span className="strip-value">{identity?.constitutional_role ?? 'Knowledge Layer participant'}</span>
        </div>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="metrics-grid-4">
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-title">Runtime Health</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: health?.status === 'ok' ? '#16845B' : '#C0392B' }} />
          </div>
          <div className="metric-card-value" style={{ color: health?.status === 'ok' ? '#16845B' : '#C0392B' }}>
            {health?.status === 'ok' ? 'Healthy' : 'Unhealthy'}
          </div>
          <span className="metric-card-subtext">Liveness probe: ok</span>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-title">Readiness</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: readiness?.status === 'ok' ? '#16845B' : '#B7791F' }} />
          </div>
          <div className="metric-card-value" style={{ color: readiness?.status === 'ok' ? '#16845B' : '#B7791F' }}>
            {readiness?.status === 'ok' ? 'Ready' : 'Degraded'}
          </div>
          <span className="metric-card-subtext">Subsystems: bcaes_registry · canonical_repository</span>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-title">Registered Packages</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563A6' }} />
          </div>
          <div className="metric-card-value">
            {packages.length}
          </div>
          <span className="metric-card-subtext">Discovered in local store</span>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-title">Engine Release</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#64748B' }} />
          </div>
          <div className="metric-card-value" style={{ fontFamily: 'monospace' }}>
            v{identity?.version ?? '1.3.0'}
          </div>
          <span className="metric-card-subtext">{identity?.capabilities?.length ?? 7} declared capabilities</span>
        </div>
      </div>

      <div className="notice" style={{ background: '#f8fafb', border: '1px solid #d9e2ec', color: '#334d6e', marginBottom: '24px' }}>
        <b>Operational Summary:</b> MASTERDB is actively running as a sovereign Knowledge Layer authority. Live health verification, dataset package governance, and shared service contracts are active across the ecosystem.
      </div>

      {loading && <LoadingState message="Polling live platform status…" />}
      {error && <ErrorState message={error} />}

      <div className="overview-grid">
        {/* Panel 1: Sovereign Runtime Identity */}
        <section className="panel">
          <SectionHeader
            title="Runtime Identity"
            eyebrow="SOVEREIGN MANIFEST"
            detail={identity?.version ? `Release v${identity.version}` : 'Active'}
          />
          {identity ? (
            <div style={{ display: 'grid', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Service Name:</span>
                <b style={{ color: '#17212b' }}>{identity.service_name}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Constitutional Role:</span>
                <span style={{ color: '#17212b' }}>{identity.constitutional_role}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Runtime Status:</span>
                <StatusBadge kind={identity.status === 'operational' ? 'success' : 'neutral'}>
                  {identity.status}
                </StatusBadge>
              </div>
              <div>
                <span style={{ display: 'block', color: '#64748b', marginBottom: '6px' }}>Declared Capabilities:</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {identity.capabilities.map((c) => (
                    <span
                      key={c}
                      style={{
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        background: '#eaf2fa',
                        color: '#2563a6',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid #b8d5ed',
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="Identity offline">Unable to connect to /runtime/identity.</EmptyState>
          )}
        </section>

        {/* Panel 2: Service Health & Readiness */}
        <section className="panel">
          <SectionHeader
            title="Service Probes"
            eyebrow="TELEMETRY & LIVENESS"
            detail="Health Checks"
          />
          <div style={{ display: 'grid', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Liveness Probe (/health):</span>
              <StatusBadge kind={health?.status === 'ok' ? 'success' : 'danger'}>
                {health?.status === 'ok' ? 'HEALTHY' : 'DEGRADED'}
              </StatusBadge>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Readiness Probe (/ready):</span>
              <StatusBadge kind={readiness?.status === 'ok' ? 'success' : 'warning'}>
                {readiness?.status === 'ok' ? 'READY' : 'DEGRADED'}
              </StatusBadge>
            </div>
            {readiness?.checks && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Subsystem Checks:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#17212b' }}>
                  {Object.entries(readiness.checks).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Prometheus Telemetry:</span>
              <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#2563a6' }}>/metrics (Active)</span>
            </div>
          </div>
        </section>

        {/* Panel 3: Discovered Package Inventory */}
        <section className="panel">
          <SectionHeader
            title="Dataset Package Inventory"
            eyebrow="LOCAL STORE"
            detail={`${packages.length} package(s) loaded`}
          />
          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748b' }}>
            Registered packages discovered via <code>/discovery/packages</code>:
          </p>
          {packages.length > 0 ? (
            <div style={{ display: 'grid', gap: '8px' }}>
              {packages.map((p) => (
                <div
                  key={p.package_id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    border: '1px solid #d9e2ec',
                    borderRadius: '6px',
                    background: '#ffffff',
                    fontSize: '13px',
                    boxShadow: '0 1px 2px rgba(16, 25, 35, 0.02)',
                  }}
                >
                  <div>
                    <Link
                      to={`/datasets/${encodeURIComponent(p.package_id)}`}
                      style={{ fontWeight: 600, color: '#2563a6', textDecoration: 'none', fontFamily: 'monospace' }}
                    >
                      {p.package_id}
                    </Link>
                    <span style={{ marginLeft: '8px', color: '#64748b', fontSize: '12px' }}>
                      ({p.dataset_id} v{p.dataset_version})
                    </span>
                  </div>
                  <StatusBadge kind={getStatusKind(p.status)}>{p.status}</StatusBadge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No packages discovered">No registered packages discovered on backend.</EmptyState>
          )}
        </section>

        {/* Panel 4: Quick Navigation & Governance Operations */}
        <section className="panel">
          <SectionHeader
            title="Control Plane Navigation"
            eyebrow="OPERATIONAL CONSOLES"
            detail="Direct Access"
          />
          <div style={{ display: 'grid', gap: '10px', marginTop: '6px' }}>
            <Link
              to="/datasets"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#f8fafc',
                border: '1px solid #d9e2ec',
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#17212b',
                transition: 'all 130ms ease',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 650, color: '#17212b' }}>📁 Dataset Explorer</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Inspect packages, schema versions, and status</div>
              </div>
              <span style={{ color: '#2563a6', fontWeight: 600 }}>Explore ›</span>
            </Link>
            <Link
              to="/observability"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#f8fafc',
                border: '1px solid #d9e2ec',
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#17212b',
                transition: 'all 130ms ease',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 650, color: '#17212b' }}>📊 Observability Telemetry</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Contracts, synchronization, and replay manifests</div>
              </div>
              <span style={{ color: '#2563a6', fontWeight: 600 }}>Inspect ›</span>
            </Link>
            <Link
              to="/admin"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#f8fafc',
                border: '1px solid #d9e2ec',
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#17212b',
                transition: 'all 130ms ease',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 650, color: '#17212b' }}>⚙️ System & Administration</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Configuration verification and snapshot backup</div>
              </div>
              <span style={{ color: '#2563a6', fontWeight: 600 }}>Manage ›</span>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

export function Datasets() {
  const navigate = useNavigate();
  const [packages, setPackages] = React.useState<DiscoveredPackage[]>([]);
  const [filterText, setFilterText] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await getDiscoveredPackages();
      setPackages(resp.packages ?? []);
    } catch (e) {
      const err = e as Error;
      setError(err.message ?? 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await getDiscoveredPackages();
        if (active) setPackages(resp.packages ?? []);
      } catch (e) {
        if (active) setError((e as Error).message ?? 'Failed to load packages');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filteredPackages = React.useMemo(() => {
    if (!filterText.trim()) return packages;
    const query = filterText.toLowerCase();
    return packages.filter(
      p =>
        p.package_id.toLowerCase().includes(query) ||
        p.dataset_id.toLowerCase().includes(query) ||
        p.status.toLowerCase().includes(query) ||
        p.owner?.toLowerCase().includes(query) ||
        p.board?.toLowerCase().includes(query) ||
        p.medium?.toLowerCase().includes(query) ||
        p.language?.toLowerCase().includes(query)
    );
  }, [packages, filterText]);

  const columns = ['Package ID', 'Dataset ID', 'Version', 'Schema Version', 'Classification', 'Owner', 'Status', 'Updated'];

  return (
    <>
      <PageHeader
        title="Dataset Explorer"
        eyebrow="DATASET REGISTRY"
        description="Registered packages, lifecycle states, governance eligibility, and classification metadata."
        action={
          <button className="btn-secondary" onClick={loadPackages} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh Explorer'}
          </button>
        }
      />

      <div className="notice" style={{ background: '#f8fafb', border: '1px solid #d9e2ec', color: '#334d6e', marginBottom: '20px' }}>
        <b>Package Asset Model:</b> A package represents a versioned dataset asset registered in MASTERDB with cryptographic artifacts, schema bindings, and governance records. Click any package row to inspect its full governance lifecycle.
      </div>

      <div className="toolbar" style={{ alignItems: 'center' }}>
        <SearchInput
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          placeholder="Filter loaded packages…"
        />
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
            Showing {filteredPackages.length} of {packages.length} package(s)
          </span>
          {filterText && (
            <button className="btn-secondary" style={{ padding: '0 10px', height: '30px', fontSize: '12px' }} onClick={() => setFilterText('')}>
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {loading && <LoadingState message="Loading registered packages…" />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>{columns.map(c => (<th key={c}>{c}</th>))}</tr>
            </thead>
            <tbody>
              {filteredPackages.length > 0 ? (
                filteredPackages.map(p => (
                  <tr
                    key={p.package_id}
                    className="clickable-row"
                    onClick={() => navigate(`/datasets/${encodeURIComponent(p.package_id)}`)}
                  >
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: getStatusDotColor(p.status),
                            flexShrink: 0,
                          }}
                        />
                        <span className="code-val">{p.package_id}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#17212b' }}>{p.dataset_id}</td>
                    <td>v{p.dataset_version}</td>
                    <td>
                      <span className="code-val" style={{ color: '#475569' }}>{p.schema_version}</span>
                    </td>
                    <td style={{ color: '#475569' }}>{`${p.board} / ${p.medium} / ${p.language}`}</td>
                    <td>{p.owner}</td>
                    <td>
                      <StatusBadge kind={getStatusKind(p.status)}>{p.status}</StatusBadge>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '12px' }}>
                      {p.updated_at ? p.updated_at.slice(0, 19).replace('T', ' ') : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="table-empty">
                    {packages.length === 0
                      ? 'No packages registered in MASTERDB.'
                      : `No packages match filter criteria "${filterText}".`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
function getStatusKind(status?: string): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (!status) return 'neutral';
  switch (status.toUpperCase()) {
    case 'VALIDATED':
    case 'CERTIFIED':
    case 'RETRIEVABLE':
    case 'CERTIFIED_RETRIEVABLE':
    case 'HEALTHY':
    case 'READY':
    case 'OPERATIONAL':
      return 'success';
    case 'PARTIALLY_RETRIEVABLE':
    case 'DEGRADED':
      return 'warning';
    case 'REJECTED':
    case 'NOT_RETRIEVABLE':
    case 'DEPRECATED':
    case 'ARCHIVED':
      return 'danger';
    case 'REGISTERED':
    case 'INGESTED':
    case 'RETRIEVAL_READY':
      return 'info';
    default:
      return 'neutral';
  }
}
function getStatusDotColor(status?: string): string {
  if (!status) return '#94A3B8';
  switch (status.toUpperCase()) {
    case 'VALIDATED':
    case 'CERTIFIED':
    case 'RETRIEVABLE':
    case 'CERTIFIED_RETRIEVABLE':
    case 'HEALTHY':
    case 'READY':
    case 'OPERATIONAL':
      return '#16845B';
    case 'PARTIALLY_RETRIEVABLE':
    case 'DEGRADED':
      return '#B7791F';
    case 'REJECTED':
    case 'NOT_RETRIEVABLE':
    case 'DEPRECATED':
    case 'ARCHIVED':
      return '#C0392B';
    case 'REGISTERED':
    case 'INGESTED':
    case 'RETRIEVAL_READY':
      return '#2563A6';
    default:
      return '#64748B';
  }
}

export function DatasetDetails(){
  const {datasetId}=useParams();
  const [packageDetail, setPackageDetail] = React.useState<PackageDetail | null>(null);
  const [history, setHistory] = React.useState<PackageHistory | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Validation state
  const [validationStatus, setValidationStatus] = React.useState<ValidationStatusResponse | null>(null);
  const [validationReport, setValidationReport] = React.useState<ValidationReportResponse | null>(null);
  const [validationLoading, setValidationLoading] = React.useState<boolean>(false);
  const [isValidating, setIsValidating] = React.useState<boolean>(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [validationActionMessage, setValidationActionMessage] = React.useState<string | null>(null);
  const [datasetPathInput, setDatasetPathInput] = React.useState<string>('datasets/certifiable_sample.csv');
  const [metadataPathInput, setMetadataPathInput] = React.useState<string>('datasets/metadata.json');

  // Certification state
  const [isCertifying, setIsCertifying] = React.useState<boolean>(false);
  const [certificationError, setCertificationError] = React.useState<string | null>(null);
  const [certificationActionMessage, setCertificationActionMessage] = React.useState<string | null>(null);

  // Lineage state
  const [lineageData, setLineageData] = React.useState<PackageLineageResponse | null>(null);
  const [lineageLoading, setLineageLoading] = React.useState<boolean>(false);
  const [lineageError, setLineageError] = React.useState<string | null>(null);

  // Provenance state
  const [provenanceData, setProvenanceData] = React.useState<MDUProvenanceEvent[] | null>(null);
  const [provenanceLoading, setProvenanceLoading] = React.useState<boolean>(false);
  const [provenanceError, setProvenanceError] = React.useState<string | null>(null);

  // MDU Schema state
  const [schemaData, setSchemaData] = React.useState<MDUSchemaResponse | null>(null);
  const [schemaLoading, setSchemaLoading] = React.useState<boolean>(false);
  const [schemaError, setSchemaError] = React.useState<string | null>(null);

  // MDU Schema Compatibility state
  const [schemaCompatibilityData, setSchemaCompatibilityData] = React.useState<MDUSchemaCompatibilityResponse | null>(null);
  const [schemaCompatibilityLoading, setSchemaCompatibilityLoading] = React.useState<boolean>(false);
  const [schemaCompatibilityError, setSchemaCompatibilityError] = React.useState<string | null>(null);

  // TANTRA Certification state (Read-Only)
  const [tantraCertData, setTantraCertData] = React.useState<TantraCertificationStatus | null>(null);
  const [tantraCertLoading, setTantraCertLoading] = React.useState<boolean>(false);
  const [tantraCertError, setTantraCertError] = React.useState<string | null>(null);

  // TANTRA Runtime state (Read-Only)
  const [tantraRuntimeData, setTantraRuntimeData] = React.useState<TantraRuntimeLookup | null>(null);
  const [tantraRuntimeLoading, setTantraRuntimeLoading] = React.useState<boolean>(false);
  const [tantraRuntimeError, setTantraRuntimeError] = React.useState<string | null>(null);

  // Retrieval state
  const [retrievalData, setRetrievalData] = React.useState<RetrievalEvidence | null>(null);
  const [retrievalLoading, setRetrievalLoading] = React.useState<boolean>(false);
  const [retrievalError, setRetrievalError] = React.useState<string | null>(null);

  // Retrieval Readiness state (TANTRA interface)
  const [retrievalReadinessData, setRetrievalReadinessData] = React.useState<RetrievalEvidence | null>(null);
  const [retrievalReadinessLoading, setRetrievalReadinessLoading] = React.useState<boolean>(false);
  const [retrievalReadinessError, setRetrievalReadinessError] = React.useState<string | null>(null);

  // Audit state
  const [auditData, setAuditData] = React.useState<PackageAuditReport | null>(null);
  const [auditLoading, setAuditLoading] = React.useState<boolean>(false);
  const [auditError, setAuditError] = React.useState<string | null>(null);

  // Replay state (Read-Only)
  const [replayData, setReplayData] = React.useState<PackageReplayResult | null>(null);
  const [replayLoading, setReplayLoading] = React.useState<boolean>(false);
  const [replayError, setReplayError] = React.useState<string | null>(null);

  // Knowledge Object Registration state
  const [koSourceRefInput, setKoSourceRefInput] = React.useState<string>('s3://masterdb-data/customer_records.csv');
  const [koParentPkgInput, setKoParentPkgInput] = React.useState<string>('');
  const [koLineageRefInput, setKoLineageRefInput] = React.useState<string>('');
  const [koDerivationPathInput, setKoDerivationPathInput] = React.useState<string>('ingestion, cleanse');
  const [isRegisteringKO, setIsRegisteringKO] = React.useState<boolean>(false);
  const [koError, setKoError] = React.useState<string | null>(null);
  const [koActionMessage, setKoActionMessage] = React.useState<string | null>(null);

  const loadValidationData = React.useCallback(async (targetDatasetId: string) => {
    setValidationLoading(true);
    setValidationError(null);
    let statusFailed = false;

    try {
      const statusData = await getValidationStatus(targetDatasetId);
      setValidationStatus(statusData);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      if (apiErr?.status === 404) {
        setValidationStatus(null);
      } else {
        statusFailed = true;
        setValidationError(apiErr?.message || 'Failed to load validation status');
      }
    }

    try {
      const reportData = await getValidationReport(targetDatasetId);
      setValidationReport(reportData);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      if (apiErr?.status === 404) {
        setValidationReport(null);
      } else if (!statusFailed) {
        setValidationError(apiErr?.message || 'Failed to load validation report');
      }
    } finally {
      setValidationLoading(false);
    }
  }, []);

  const loadLineageData = React.useCallback(async (targetPackageId: string) => {
    setLineageLoading(true);
    setLineageError(null);
    try {
      const data = await getPackageLineage(targetPackageId);
      setLineageData(data);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      if (apiErr?.status === 404) {
        setLineageData(null);
      } else {
        setLineageError(apiErr?.message || 'Unable to load lineage.');
      }
    } finally {
      setLineageLoading(false);
    }
  }, []);

  const loadProvenanceData = React.useCallback(async (targetDatasetId: string) => {
    setProvenanceLoading(true);
    setProvenanceError(null);
    try {
      const data = await getMDUProvenance(targetDatasetId);
      setProvenanceData(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      if (apiErr?.status === 404) {
        setProvenanceData(null);
      } else if (apiErr?.status === 502) {
        setProvenanceError(
          'MDU client is unconfigured or unreachable. Live MDU provenance is currently unavailable.'
        );
      } else {
        setProvenanceError(apiErr?.message || 'Unable to load provenance.');
      }
    } finally {
      setProvenanceLoading(false);
    }
  }, []);

  const loadMDUSchema = React.useCallback(async (targetDatasetId: string) => {
    setSchemaLoading(true);
    setSchemaError(null);
    try {
      const data = await getMDUSchema(targetDatasetId);
      setSchemaData(data);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      if (apiErr?.status === 404) {
        setSchemaData(null);
      } else if (apiErr?.status === 502) {
        setSchemaError(
          'MDU schema is currently unavailable due to upstream configuration or reachability.'
        );
      } else {
        setSchemaError(apiErr?.message || 'Unable to load MDU schema.');
      }
    } finally {
      setSchemaLoading(false);
    }
  }, []);

  const loadMDUSchemaCompatibility = React.useCallback(async (targetDatasetId: string, localSchemaVersion?: string) => {
    setSchemaCompatibilityLoading(true);
    setSchemaCompatibilityError(null);
    try {
      const data = await getMDUSchemaCompatibility(targetDatasetId, localSchemaVersion || '1.0');
      setSchemaCompatibilityData(data);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      if (apiErr?.status === 404) {
        setSchemaCompatibilityData(null);
      } else if (apiErr?.status === 502) {
        setSchemaCompatibilityError(
          'MDU schema compatibility is currently unavailable due to upstream configuration or reachability.'
        );
      } else {
        setSchemaCompatibilityError(apiErr?.message || 'Unable to load schema compatibility.');
      }
    } finally {
      setSchemaCompatibilityLoading(false);
    }
  }, []);

  const loadTantraCertification = React.useCallback(async (targetDatasetId: string) => {
    setTantraCertLoading(true);
    setTantraCertError(null);
    try {
      const data = await getTantraCertification(targetDatasetId);
      setTantraCertData(data);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      if (apiErr?.status === 404) {
        setTantraCertData(null);
      } else if (apiErr?.status === 502) {
        setTantraCertError(
          'TANTRA certification endpoint is currently unavailable due to upstream reachability.'
        );
      } else {
        setTantraCertError(apiErr?.message || 'Unable to load TANTRA certification status.');
      }
    } finally {
      setTantraCertLoading(false);
    }
  }, []);

  const loadTantraRuntime = React.useCallback(async (targetPackageId: string) => {
    setTantraRuntimeLoading(true);
    setTantraRuntimeError(null);
    try {
      const data = await getPackageRuntime(targetPackageId);
      setTantraRuntimeData(data);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      if (apiErr?.status === 404) {
        setTantraRuntimeData(null);
      } else if (apiErr?.status === 502) {
        setTantraRuntimeError(
          'TANTRA runtime endpoint is currently unavailable due to upstream reachability.'
        );
      } else {
        setTantraRuntimeError(apiErr?.message || 'Unable to load TANTRA runtime status.');
      }
    } finally {
      setTantraRuntimeLoading(false);
    }
  }, []);

  const loadRetrievalData = React.useCallback(async (targetPackageId: string) => {
    setRetrievalLoading(true);
    setRetrievalError(null);
    try {
      const data = await getPackageRetrieval(targetPackageId);
      setRetrievalData(data);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      if (apiErr?.status === 404) {
        setRetrievalData(null);
      } else {
        setRetrievalError(apiErr?.message || 'Unable to load retrieval evidence.');
      }
    } finally {
      setRetrievalLoading(false);
    }
  }, []);

  const loadRetrievalReadinessData = React.useCallback(async (targetPackageId: string) => {
    setRetrievalReadinessLoading(true);
    setRetrievalReadinessError(null);
    try {
      const data = await getRetrievalReadiness(targetPackageId);
      setRetrievalReadinessData(data);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      if (apiErr?.status === 404) {
        setRetrievalReadinessData(null);
      } else {
        setRetrievalReadinessError(apiErr?.message || 'Unable to load retrieval readiness.');
      }
    } finally {
      setRetrievalReadinessLoading(false);
    }
  }, []);

  const loadAuditData = React.useCallback(async (targetPackageId: string) => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const data = await getPackageAudit(targetPackageId);
      setAuditData(data);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      if (apiErr?.status === 404) {
        setAuditData(null);
      } else {
        setAuditError(apiErr?.message || 'Unable to load audit report.');
      }
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const loadReplayData = React.useCallback(async (targetPackageId: string) => {
    setReplayLoading(true);
    setReplayError(null);
    try {
      const data = await getPackageReplay(targetPackageId);
      setReplayData(data);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      if (apiErr?.status === 404) {
        setReplayData(null);
      } else {
        setReplayError(apiErr?.message || 'Unable to load replay verification.');
      }
    } finally {
      setReplayLoading(false);
    }
  }, []);

  const refreshPackageData = React.useCallback(async () => {
    if (!datasetId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPackage(datasetId);
      setPackageDetail(data);
      if (data.dataset_id === 'sample-rejected') {
        setDatasetPathInput('datasets/sample.csv');
        setMetadataPathInput('datasets/incomplete_metadata.json');
      }
      loadValidationData(data.dataset_id);
      loadLineageData(datasetId);
      loadProvenanceData(data.dataset_id);
      loadMDUSchema(data.dataset_id);
      loadMDUSchemaCompatibility(data.dataset_id, data.schema_version);
      loadTantraCertification(data.dataset_id);
      loadTantraRuntime(datasetId);
      loadRetrievalData(datasetId);
      loadRetrievalReadinessData(datasetId);
      loadAuditData(datasetId);
      loadReplayData(datasetId);
    } catch (e) {
      setError((e as Error).message);
    }
    try {
      const hist = await getPackageHistory(datasetId);
      setHistory(hist);
    } catch {
      setHistory(null);
    }
    setLoading(false);
  }, [datasetId, loadValidationData, loadLineageData, loadProvenanceData, loadMDUSchema, loadMDUSchemaCompatibility, loadTantraCertification, loadTantraRuntime, loadRetrievalData, loadRetrievalReadinessData, loadAuditData, loadReplayData]);

  React.useEffect(() => {
    let active = true;
    if (!datasetId) return;

    (async () => {
      try {
        const data = await getPackage(datasetId);
        if (!active) return;
        setPackageDetail(data);
        if (data.dataset_id === 'sample-rejected') {
          setDatasetPathInput('datasets/sample.csv');
          setMetadataPathInput('datasets/incomplete_metadata.json');
        }
        loadValidationData(data.dataset_id);
        loadLineageData(datasetId);
        loadProvenanceData(data.dataset_id);
        loadMDUSchema(data.dataset_id);
        loadMDUSchemaCompatibility(data.dataset_id, data.schema_version);
        loadTantraCertification(data.dataset_id);
        loadTantraRuntime(datasetId);
        loadRetrievalData(datasetId);
        loadRetrievalReadinessData(datasetId);
        loadAuditData(datasetId);
        loadReplayData(datasetId);
      } catch (e) {
        if (!active) return;
        setError((e as Error).message);
      }
      try {
        const hist = await getPackageHistory(datasetId);
        if (!active) return;
        setHistory(hist);
      } catch {
        if (!active) return;
        setHistory(null);
      }
      if (active) {
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [datasetId, loadValidationData, loadLineageData, loadProvenanceData, loadMDUSchema, loadMDUSchemaCompatibility, loadTantraCertification, loadTantraRuntime, loadRetrievalData, loadRetrievalReadinessData, loadAuditData, loadReplayData]);

  const handleValidate = async () => {
    if (!packageDetail?.dataset_id) return;
    setIsValidating(true);
    setValidationError(null);
    setValidationActionMessage(null);

    const pathToSend = datasetPathInput.trim() || 'datasets/certifiable_sample.csv';
    const metaToSend = metadataPathInput.trim() || 'datasets/metadata.json';

    try {
      // Backend POST /validate is synchronous
      const resp = await validateDataset({
        dataset_id: packageDetail.dataset_id,
        dataset_path: pathToSend,
        metadata_path: metaToSend,
      });

      setValidationReport(resp.report);
      setValidationStatus({
        dataset_id: resp.dataset_id,
        state: resp.state,
        classification: resp.report.classification,
        integrity_score: resp.report.integrity_score,
        eligible_for_masterdb: resp.report.ingestion_decision?.eligible_for_masterdb ?? false,
      });
      setValidationActionMessage(`Validation successfully completed with state: ${resp.state}`);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      let detailMsg = apiErr?.message || 'Validation request failed';
      if (apiErr?.detail && typeof apiErr.detail === 'string') {
        try {
          const parsed = JSON.parse(apiErr.detail);
          if (parsed.error?.message) {
            detailMsg = parsed.error.message;
          } else if (parsed.detail) {
            detailMsg = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
          }
        } catch {
          detailMsg = apiErr.detail;
        }
      }
      setValidationError(detailMsg);
    } finally {
      setIsValidating(false);
    }
  };

  const handleCertify = async () => {
    if (!packageDetail?.dataset_id) return;
    setIsCertifying(true);
    setCertificationError(null);
    setCertificationActionMessage(null);

    try {
      // Backend POST /certify is synchronous
      const resp = await certifyDataset({
        dataset_id: packageDetail.dataset_id,
        dataset_path: datasetPathInput.trim() || undefined,
        metadata_path: metadataPathInput.trim() || undefined,
      });

      setValidationReport(resp.report);
      setValidationStatus({
        dataset_id: resp.dataset_id,
        state: resp.state,
        classification: resp.report.classification,
        integrity_score: resp.report.integrity_score,
        eligible_for_masterdb: resp.decision.eligible_for_masterdb,
      });
      setCertificationActionMessage(
        `Certification successfully completed: State is ${resp.state}. Decision: ${resp.decision.eligible_for_masterdb ? 'Eligible for MASTERDB Ingestion' : 'Rejected'}.`
      );
    } catch (e: unknown) {
      const apiErr = e as APIError;
      let detailMsg = apiErr?.message || 'Unable to certify dataset.';
      if (apiErr?.detail && typeof apiErr.detail === 'string') {
        try {
          const parsed = JSON.parse(apiErr.detail);
          if (parsed.error?.message) {
            detailMsg = parsed.error.message;
          } else if (parsed.detail) {
            detailMsg = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
          }
        } catch {
          detailMsg = apiErr.detail;
        }
      }
      setCertificationError(`Unable to certify dataset: ${detailMsg}`);
    } finally {
      setIsCertifying(false);
    }
  };


  if (!datasetId) {
    return (
      <>
        <PageHeader title="Dataset Details" description="Select a package from Dataset Explorer."/>
        <EmptyState title="No dataset selected">Dataset detail will be available once package data is connected.</EmptyState>
      </>
    );
  }

  if (loading) return <LoadingState/>;
  if (error) return <ErrorState/>;
  if (!packageDetail) return <EmptyState title="Package not found">Unable to load package details.</EmptyState>;

  const identityRows = [{
    'Package ID': packageDetail.package_id,
    'Dataset ID': packageDetail.dataset_id,
    'Version': packageDetail.dataset_version,
    'Schema Version': packageDetail.schema_version,
    'Status': packageDetail.status,
    'Created': packageDetail.created_at,
    'Updated': packageDetail.updated_at,
  }];
  const classificationRows = [{
    'Board': packageDetail.board,
    'Medium': packageDetail.medium,
    'Language': packageDetail.language,
  }];
  const ownershipRows = [{
    'Owner': packageDetail.owner,
  }];

  const historyColumns = ['Transition ID','From','To','Reason','Actor','Timestamp'];
  const historyRows = history?.history?.map((h: PackageTransition) => ({
    'Transition ID': h.transition_id,
    'From': h.from_status ?? '-',
    'To': h.to_status,
    'Reason': h.reason,
    'Actor': h.actor,
    'Timestamp': h.timestamp,
  })) ?? [];

  // Validation Summary row
  const activeValidationState = validationStatus?.state ?? validationReport?.state;
  const validationSummaryRows = [{
    'Target Dataset ID': packageDetail.dataset_id,
    'Validation State': activeValidationState ?? 'NOT_VALIDATED',
    'Classification': validationStatus?.classification ?? validationReport?.classification ?? 'Unclassified',
    'Integrity Score': (validationStatus?.integrity_score !== undefined || validationReport?.integrity_score !== undefined)
      ? String(validationStatus?.integrity_score ?? validationReport?.integrity_score)
      : 'N/A',
    'MasterDB Eligible': validationStatus?.eligible_for_masterdb !== undefined
      ? (validationStatus.eligible_for_masterdb ? 'Eligible' : 'Not Certified')
      : (validationReport?.ingestion_decision ? (validationReport.ingestion_decision.eligible_for_masterdb ? 'Eligible' : 'Not Certified') : 'Pending Ingestion Gate'),
  }];

  // Eligibility logic based on real backend gates in CertificationService
  const passesVerification = (() => {
    if (!validationReport?.validation_results) return false;
    const vr = validationReport.validation_results;
    return (
      validationReport.integrity_score >= 75 &&
      validationReport.risk_flags.length === 0 &&
      vr.metadata.score >= 80 &&
      vr.provenance.score >= 80 &&
      vr.integrity.score >= 80
    );
  })();

  const isEligibleForCertification = (() => {
    if (!validationReport) return false;
    return (
      passesVerification &&
      validationReport.classification === 'Trusted' &&
      validationReport.integrity_score >= 90 &&
      validationReport.risk_flags.length === 0 &&
      validationReport.recommendations.length === 0
    );
  })();

  const certificationEligibilityStatus = (() => {
    if (!activeValidationState || activeValidationState === 'NOT_VALIDATED' || !validationReport) {
      return {
        status: 'NOT_VALIDATED',
        label: 'Awaiting Validation',
        kind: 'neutral' as const,
        reason: 'Dataset must be validated before certification can be evaluated.',
        canCertify: false,
      };
    }
    if (activeValidationState === 'CERTIFIED') {
      return {
        status: 'CERTIFIED',
        label: 'Certified',
        kind: 'success' as const,
        reason: 'Dataset has passed all verification and certification gates and is certified for MASTERDB ingestion.',
        canCertify: false,
      };
    }
    if (activeValidationState === 'REJECTED') {
      const reasons = validationReport.ingestion_decision?.rejection_reasons?.join(', ') || 'Certification gate failed.';
      return {
        status: 'REJECTED',
        label: 'Rejected',
        kind: 'danger' as const,
        reason: `Dataset rejected during certification: ${reasons}`,
        canCertify: false,
      };
    }
    if (activeValidationState === 'VALIDATED') {
      if (isEligibleForCertification) {
        return {
          status: 'ELIGIBLE',
          label: 'Eligible for Certification',
          kind: 'success' as const,
          reason: 'Dataset meets all verification and certification gates (Trusted classification, score >= 90, 0 risk flags, 0 recommendations).',
          canCertify: true,
        };
      } else {
        const blockers: string[] = [];
        if (validationReport.classification !== 'Trusted') blockers.push(`Classification is "${validationReport.classification}" (requires "Trusted")`);
        if (validationReport.integrity_score < 90) blockers.push(`Integrity score is ${validationReport.integrity_score} (requires >= 90)`);
        if (validationReport.risk_flags.length > 0) blockers.push(`Active risk flags: ${validationReport.risk_flags.join(', ')}`);
        if (validationReport.recommendations.length > 0) blockers.push(`Unresolved recommendations (${validationReport.recommendations.length})`);
        return {
          status: 'NOT_ELIGIBLE',
          label: 'Not Eligible',
          kind: 'warning' as const,
          reason: `Certification criteria not met: ${blockers.join('; ')}.`,
          canCertify: false,
        };
      }
    }
    return {
      status: activeValidationState,
      label: activeValidationState,
      kind: 'neutral' as const,
      reason: `Current dataset state: ${activeValidationState}`,
      canCertify: false,
    };
  })();


  // Certification Summary row
  const certificationSummaryRows = [{
    'Target Dataset ID': packageDetail.dataset_id,
    'Certification State': activeValidationState ?? 'NOT_VALIDATED',
    'MasterDB Ingestion Eligible': validationStatus?.eligible_for_masterdb !== undefined
      ? (validationStatus.eligible_for_masterdb ? 'Eligible' : 'Not Certified')
      : (validationReport?.ingestion_decision ? (validationReport.ingestion_decision.eligible_for_masterdb ? 'Eligible' : 'Not Certified') : 'Pending Decision'),
    'Classification': validationStatus?.classification ?? validationReport?.classification ?? 'Unclassified',
    'Integrity Score': (validationStatus?.integrity_score !== undefined || validationReport?.integrity_score !== undefined)
      ? String(validationStatus?.integrity_score ?? validationReport?.integrity_score)
      : 'N/A',
    'Eligibility Status': certificationEligibilityStatus.label,
  }];

  // Certification audit trail rows
  const certificationAuditRows = validationReport?.audit_trail?.filter(a =>
    a.rule === 'VALIDATION_SCORE_AND_RISK_GATE' || a.rule === 'MASTERDB_CERTIFICATION_GATE'
  ).map(a => ({
    'Gate Rule': a.rule,
    'From State': a.from_state,
    'To State': a.to_state,
    'Passed': a.passed ? 'Yes' : 'No',
    'Reason': a.reason,
  })) ?? [];


  // Profile rows
  const profileRows = validationReport?.profile ? [{
    'Rows': validationReport.profile.rows,
    'Columns': validationReport.profile.columns,
    'Missing Values': validationReport.profile.missing_values,
    'Duplicate Rows': validationReport.profile.duplicate_rows,
  }] : [];

  // Validation checks rows
  const checkRows = validationReport?.validation_results ? [
    {
      'Validation Check': 'Schema',
      'Score': String(validationReport.validation_results.schema.score),
      'Findings': `${validationReport.validation_results.schema.details.length} column(s) evaluated`,
    },
    {
      'Validation Check': 'Completeness',
      'Score': String(validationReport.validation_results.completeness.score),
      'Findings': `${validationReport.validation_results.completeness.missing_cells} missing cell(s)`,
    },
    {
      'Validation Check': 'Duplicates',
      'Score': String(validationReport.validation_results.duplicates.score),
      'Findings': `${validationReport.validation_results.duplicates.duplicate_rows} duplicate row(s) (${validationReport.validation_results.duplicates.duplicate_percentage}%)`,
    },
    {
      'Validation Check': 'Consistency',
      'Score': String(validationReport.validation_results.consistency.score),
      'Findings': validationReport.validation_results.consistency.issues.length > 0
        ? `Column issues: ${validationReport.validation_results.consistency.issues.join(', ')}`
        : 'Zero column issues',
    },
    {
      'Validation Check': 'Metadata',
      'Score': String(validationReport.validation_results.metadata.score),
      'Findings': validationReport.validation_results.metadata.missing_fields.length > 0
        ? `Missing fields: ${validationReport.validation_results.metadata.missing_fields.join(', ')}`
        : 'All required metadata fields present',
    },
    {
      'Validation Check': 'Provenance',
      'Score': String(validationReport.validation_results.provenance.score),
      'Findings': validationReport.validation_results.provenance.missing_fields.length > 0
        ? `Missing fields: ${validationReport.validation_results.provenance.missing_fields.join(', ')}`
        : 'All provenance fields present',
    },
    {
      'Validation Check': 'Integrity Boundaries',
      'Score': String(validationReport.validation_results.integrity.score),
      'Findings': validationReport.validation_results.integrity.violations.length > 0
        ? validationReport.validation_results.integrity.violations.map(v => `${v.column}: ${v.violations} violation(s)`).join(', ')
        : 'Zero boundary violations',
    },
  ] : [];

  // Schema details rows
  const schemaDetailsRows = validationReport?.validation_results?.schema?.details?.map(d => ({
    'Column': d.column,
    'Expected Type': d.expected ?? '-',
    'Actual Type': d.actual ?? '-',
    'Status': d.status,
  })) ?? [];

  // Audit trail rows
  const auditRows = validationReport?.audit_trail?.map(a => ({
    'Rule': a.rule,
    'From State': a.from_state,
    'To State': a.to_state,
    'Passed': a.passed ? 'Yes' : 'No',
    'Reason': a.reason,
  })) ?? [];

  // Lineage summary rows
  const lineageSummaryRows = lineageData ? [{
    'Package ID': lineageData.package_id,
    'Knowledge Object': lineageData.knowledge_object_registered ? 'Registered' : 'Not Registered',
    'Knowledge Object ID': lineageData.knowledge_object_id ?? 'None',
    'Knowledge Hash': lineageData.knowledge_hash ? lineageData.knowledge_hash.slice(0, 16) + '…' : 'None',
    'Source Reference': lineageData.source_reference ?? 'None',
    'Lineage Reference': lineageData.lineage_reference ?? 'None',
    'Ancestors': String(lineageData.ancestors.length),
    'Descendants': String(lineageData.descendants.length),
  }] : [];

  // Lineage hierarchy / derivation rows
  const lineageHierarchyRows = lineageData ? [
    {
      'Relation / Flow': 'Ancestors (Parent Packages)',
      'Count': String(lineageData.ancestors.length),
      'Details': lineageData.ancestors.length > 0 ? lineageData.ancestors.join(' → ') : 'None (Root package)',
    },
    {
      'Relation / Flow': 'Descendants (Child Packages)',
      'Count': String(lineageData.descendants.length),
      'Details': lineageData.descendants.length > 0 ? lineageData.descendants.join(', ') : 'None (Leaf package)',
    },
    {
      'Relation / Flow': 'Derivation Path (Transformations)',
      'Count': String(lineageData.derivation_path?.length ?? 0),
      'Details': (lineageData.derivation_path && lineageData.derivation_path.length > 0)
        ? lineageData.derivation_path.join(' → ')
        : 'None',
    },
  ] : [];

  // MDU Provenance event rows
  const provenanceRows = provenanceData?.map(p => ({
    'Event ID': String(p.id ?? '-'),
    'Event Type': String(p.event_type ?? '-'),
    'Dataset ID': String(p.dataset_id ?? packageDetail.dataset_id),
    'Source Reference': String(p.source_reference ?? '-'),
    'Transformation': String(p.transformation_reference ?? '-'),
    'Timestamp': String(p.timestamp ?? '-'),
    'Actor': String(p.actor ?? '-'),
  })) ?? [];

  const handleRefreshLineageAndProvenance = () => {
    if (datasetId) {
      loadLineageData(datasetId);
    }
    if (packageDetail?.dataset_id) {
      loadProvenanceData(packageDetail.dataset_id);
    }
  };

  // MDU Schema field rows
  const schemaFields = schemaData?.fields || schemaData?.columns;
  const schemaFieldRows = Array.isArray(schemaFields)
    ? schemaFields.map((f, i) => ({
        'Field Name': String(f.name ?? f.field ?? `field_${i + 1}`),
        'Data Type': String(f.type ?? f.data_type ?? '-'),
        'Nullable': f.nullable !== undefined ? (f.nullable ? 'Yes' : 'No') : '-',
        'Description': String(f.description ?? '-'),
        'Constraints': Array.isArray(f.constraints) ? f.constraints.join(', ') : (f.constraints ? String(f.constraints) : '-'),
      }))
    : (typeof schemaFields === 'object' && schemaFields !== null)
    ? Object.entries(schemaFields).map(([name, val]) => ({
        'Field Name': name,
        'Data Type': typeof val === 'object' && val !== null ? String((val as Record<string, unknown>).type ?? JSON.stringify(val)) : String(val),
        'Nullable': typeof val === 'object' && val !== null && (val as Record<string, unknown>).nullable !== undefined ? ((val as Record<string, unknown>).nullable ? 'Yes' : 'No') : '-',
        'Description': typeof val === 'object' && val !== null ? String((val as Record<string, unknown>).description ?? '-') : '-',
        'Constraints': '-',
      }))
    : [];

  const handleRefreshMDUSchema = () => {
    if (packageDetail?.dataset_id) {
      loadMDUSchema(packageDetail.dataset_id);
      loadMDUSchemaCompatibility(packageDetail.dataset_id, packageDetail.schema_version);
    }
  };

  const handleRefreshTantraCertification = () => {
    if (packageDetail?.dataset_id) {
      loadTantraCertification(packageDetail.dataset_id);
    }
  };

  // TANTRA Certification rows
  const tantraCertSummaryRows = tantraCertData ? [{
    'Target Dataset ID': tantraCertData.dataset_id,
    'Certification State': tantraCertData.state,
    'Classification': tantraCertData.classification,
    'Integrity Score': `${tantraCertData.integrity_score}%`,
    'MasterDB Ingestion Eligible': tantraCertData.eligible_for_masterdb ? 'Eligible' : 'Ineligible',
  }] : [];

  const handleRefreshTantraRuntime = () => {
    if (datasetId) {
      loadTantraRuntime(datasetId);
    }
  };

  // TANTRA Runtime rows
  const tantraRuntimeSummaryRows = tantraRuntimeData ? [{
    'Package ID': tantraRuntimeData.package.package_id,
    'Dataset ID': tantraRuntimeData.package.dataset_id,
    'Runtime Status': tantraRuntimeData.package.status,
    'Schema Version': tantraRuntimeData.package.schema_version ?? 'N/A',
    'Lineage Registered': tantraRuntimeData.lineage.knowledge_object_registered ? 'Registered' : 'Unregistered',
    'Retrieval Readiness': tantraRuntimeData.retrieval_readiness.status,
    'TANTRA Certification': tantraRuntimeData.certification_status?.state ?? 'Uncertified',
  }] : [];

  // Retrieval Readiness rows (TANTRA interface)
  const readinessSummaryRows = retrievalReadinessData ? [{
    'Package ID': retrievalReadinessData.package_id,
    'Readiness Status': retrievalReadinessData.status,
    'Rules Passed': `${retrievalReadinessData.rules.filter(r => r.passed).length} / ${retrievalReadinessData.rules.length}`,
    'Corrective Actions': String(retrievalReadinessData.corrective_actions.length),
    'Generated At': retrievalReadinessData.generated_at,
  }] : [];

  const readinessRuleRows = retrievalReadinessData?.rules?.map(r => ({
    'Readiness Rule': r.rule,
    'Status': r.passed ? 'Passed' : 'Failed',
    'Rule Detail': r.detail,
  })) ?? [];

  const readinessCorrectiveRows = retrievalReadinessData?.corrective_actions?.map(c => ({
    'Required Corrective Action': c,
  })) ?? [];

  // Retrieval Evidence rows (Package Retrieval Engine)
  const retrievalSummaryRows = retrievalData ? [{
    'Package ID': retrievalData.package_id,
    'Retrieval Status': retrievalData.status,
    'Passed Rules': `${retrievalData.rules.filter(r => r.passed).length} of ${retrievalData.rules.length} passed`,
    'Evaluation Timestamp': retrievalData.generated_at,
  }] : [];

  const retrievalRuleRows = retrievalData?.rules?.map(r => ({
    'Rule': r.rule,
    'Status': r.passed ? 'Passed' : 'Failed',
    'Evidence Finding': r.detail,
  })) ?? [];

  const retrievalCorrectiveRows = retrievalData?.corrective_actions?.map(c => ({
    'Recommended Action': c,
  })) ?? [];

  const handleRefreshRetrieval = () => {
    if (datasetId) {
      loadRetrievalData(datasetId);
      loadRetrievalReadinessData(datasetId);
    }
  };

  // Audit rows
  const auditSummaryRows = auditData ? [{
    'Package ID': auditData.package_id,
    'Audit Trail Complete': auditData.complete ? 'Yes (Verified)' : 'No (Issues Found)',
    'Transitions Recorded': String(auditData.transition_count),
    'Replay Consistent': auditData.replay_consistent ? 'Yes' : 'No',
    'Issues Found': auditData.issues.length === 0 ? 'Zero issues' : `${auditData.issues.length} issue(s)`,
  }] : [];

  const auditIssuesRows = auditData?.issues?.map(issue => ({
    'Audit Issue': issue,
  })) ?? [];

  // Replay rows (Read-Only)
  const replaySummaryRows = replayData ? [{
    'Package ID': replayData.package_id,
    'Replay Consistent': replayData.replay_consistent ? 'Yes (Consistent)' : 'No (Drift Detected)',
    'Replayed Status': replayData.replayed_status ?? 'N/A',
    'Replay Error': replayData.replay_error ?? 'None',
  }] : [];

  const handleRefreshAuditAndReplay = () => {
    if (datasetId) {
      loadAuditData(datasetId);
      loadReplayData(datasetId);
    }
  };

  const handleRegisterKnowledgeObject = async () => {
    if (!datasetId) return;
    setIsRegisteringKO(true);
    setKoError(null);
    setKoActionMessage(null);

    const derivationList = koDerivationPathInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      const created = await registerKnowledgeObject(datasetId, {
        package_id: datasetId,
        parent_package: koParentPkgInput.trim() || null,
        source_reference: koSourceRefInput.trim() || null,
        lineage_reference: koLineageRefInput.trim() || null,
        derivation_path: derivationList,
      });

      setKoActionMessage(`Successfully registered Knowledge Object "${created.knowledge_object_id}".`);
      // Refresh downstream affected states:
      loadLineageData(datasetId);
      loadRetrievalData(datasetId);
      loadRetrievalReadinessData(datasetId);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      let detailMsg = apiErr?.message || 'Failed to register Knowledge Object.';
      if (apiErr?.detail && typeof apiErr.detail === 'string') {
        try {
          const parsed = JSON.parse(apiErr.detail);
          if (parsed.error?.message) {
            detailMsg = parsed.error.message;
          } else if (parsed.detail) {
            detailMsg = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
          }
        } catch {
          detailMsg = apiErr.detail;
        }
      }
      setKoError(`Unable to register Knowledge Object: ${detailMsg}`);
    } finally {
      setIsRegisteringKO(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="PACKAGE GOVERNANCE"
        title={`Package: ${datasetId}`}
        description="Comprehensive lifecycle inspection, validation gates, certification, and lineage for registered dataset packages."
        action={
          <button className="btn-secondary" onClick={refreshPackageData} disabled={loading || isValidating}>
            Refresh Package
          </button>
        }
      />

      {/* Hero Card for Package Identity */}
      <div className="package-hero-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="package-hero-eyebrow">PACKAGE IDENTIFIER</div>
            <div className="package-hero-id">{packageDetail.package_id}</div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Dataset:</span> <strong style={{ color: 'var(--text-primary)' }}>{packageDetail.dataset_id}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Version:</span> <code className="code-val">v{packageDetail.dataset_version}</code></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Schema:</span> <code className="code-val">v{packageDetail.schema_version}</code></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Owner:</span> <strong style={{ color: 'var(--text-primary)' }}>{packageDetail.owner || 'Unassigned'}</strong></div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <StatusBadge kind={getStatusKind(activeValidationState || packageDetail.status)}>
              {activeValidationState || packageDetail.status}
            </StatusBadge>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Created: {packageDetail.created_at ? new Date(packageDetail.created_at).toISOString().slice(0, 10) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* 01 Identity & Lifecycle */}
      <div className="section-container">
        <SectionHeader
          number="01"
          eyebrow="PACKAGE METADATA"
          title="Identity & Lifecycle"
          detail="Core registry parameters, classification criteria, and ownership records."
        />
        <DataTable columns={['Package ID','Dataset ID','Version','Schema Version','Status','Created','Updated']} rows={identityRows} empty="No data"/>

        <div style={{ marginTop: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Classification</h4>
          <DataTable columns={['Board','Medium','Language']} rows={classificationRows} empty="No data"/>
        </div>

        <div style={{ marginTop: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ownership & Lifecycle</h4>
          <DataTable columns={['Owner']} rows={ownershipRows} empty="No data"/>
        </div>
      </div>

      {/* 02 Validation Section */}
      <div className="section-container">
        <SectionHeader
          number="02"
          eyebrow="QUALITY ASSESSMENT"
          title="Validation"
          detail={`Deterministic validation results and quality gates for ${packageDetail.dataset_id}.`}
          action={
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="btn-primary"
                onClick={handleValidate}
                disabled={isValidating || validationLoading}
              >
                {isValidating ? 'Validating…' : 'Validate Dataset'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => loadValidationData(packageDetail.dataset_id)}
                disabled={isValidating || validationLoading}
              >
                {validationLoading ? 'Loading…' : 'Refresh'}
              </button>
            </div>
          }
        />

        {/* Validation Status & Configuration */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {activeValidationState && (
              <StatusBadge kind={getStatusKind(activeValidationState)}>
                {activeValidationState}
              </StatusBadge>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Dataset Path:
              <input
                style={{ display: 'block', marginTop: '4px', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', width: '220px' }}
                value={datasetPathInput}
                onChange={(e) => setDatasetPathInput(e.target.value)}
                disabled={isValidating}
              />
            </label>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Metadata Path:
              <input
                style={{ display: 'block', marginTop: '4px', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', width: '220px' }}
                value={metadataPathInput}
                onChange={(e) => setMetadataPathInput(e.target.value)}
                disabled={isValidating}
              />
            </label>
          </div>
        </div>

        {/* Validation Notifications & Error State */}
        {isValidating && <div className="notice info">Starting and executing validation against MASTERDB backend…</div>}
        {validationLoading && !isValidating && <div className="notice info">Loading validation status and report from MASTERDB…</div>}
        {validationActionMessage && <div className="notice success">{validationActionMessage}</div>}
        {validationError && <div className="notice error">{validationError}</div>}

        {/* Validation Summary Table */}
        <DataTable
          columns={['Target Dataset ID', 'Validation State', 'Classification', 'Integrity Score', 'MasterDB Eligible']}
          rows={validationSummaryRows}
          empty="No validation summary available"
        />

        {/* Report details if available */}
        {validationReport ? (
          <>
            {profileRows.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dataset Profile (DatasetProfiler)</h4>
                <DataTable columns={['Rows', 'Columns', 'Missing Values', 'Duplicate Rows']} rows={profileRows} empty="No profile available" />
              </div>
            )}
            {checkRows.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Validation Checks</h4>
                <DataTable columns={['Validation Check', 'Score', 'Findings']} rows={checkRows} empty="No checks available" />
              </div>
            )}
            {schemaDetailsRows.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Schema Column Details</h4>
                <DataTable columns={['Column', 'Expected Type', 'Actual Type', 'Status']} rows={schemaDetailsRows} empty="No schema details" />
              </div>
            )}
            {validationReport.risk_flags && validationReport.risk_flags.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Risk Flags</h4>
                <DataTable columns={['Risk Flag']} rows={validationReport.risk_flags.map(f => ({ 'Risk Flag': f }))} empty="No risk flags" />
              </div>
            )}
            {validationReport.recommendations && validationReport.recommendations.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recommendations</h4>
                <DataTable columns={['Recommendation']} rows={validationReport.recommendations.map(r => ({ 'Recommendation': r }))} empty="No recommendations" />
              </div>
            )}
            {auditRows.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Validation Audit Trail</h4>
                <DataTable columns={['Rule', 'From State', 'To State', 'Passed', 'Reason']} rows={auditRows} empty="No audit entries" />
              </div>
            )}
          </>
        ) : (
          !validationLoading && (
            <EmptyState title="No validation report available">
              No validation record was found for dataset &quot;{packageDetail.dataset_id}&quot;. Click &quot;Validate Dataset&quot; to run validation checks.
            </EmptyState>
          )
        )}
      </div>

      {/* 03 Certification Section */}
      <div className="section-container">
        <SectionHeader
          number="03"
          eyebrow="GOVERNANCE GATE"
          title="Certification"
          detail={`MASTERDB enterprise ingestion certification decisions for ${packageDetail.dataset_id}.`}
          action={
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="btn-primary"
                onClick={handleCertify}
                disabled={!certificationEligibilityStatus.canCertify || isCertifying || isValidating || validationLoading}
              >
                {isCertifying ? 'Certifying…' : (activeValidationState === 'CERTIFIED' ? 'Already Certified' : 'Certify Dataset')}
              </button>
            </div>
          }
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <StatusBadge kind={certificationEligibilityStatus.kind}>
              {certificationEligibilityStatus.label}
            </StatusBadge>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            <strong>Eligibility:</strong> {certificationEligibilityStatus.reason}
          </div>
        </div>

        {/* Certification Notifications & Error States */}
        {isCertifying && <div className="notice info">Evaluating verification and certification gates against MASTERDB backend…</div>}
        {certificationActionMessage && <div className="notice success">{certificationActionMessage}</div>}
        {certificationError && <div className="notice error">{certificationError}</div>}

        {/* Certification Summary Table */}
        <DataTable
          columns={['Target Dataset ID', 'Certification State', 'MasterDB Ingestion Eligible', 'Classification', 'Integrity Score', 'Eligibility Status']}
          rows={certificationSummaryRows}
          empty="No certification data available"
        />

        {/* Ingestion Decision Details Table (if present) */}
        {validationReport?.ingestion_decision && (
          <div style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Ingestion Decision (State: {validationReport.ingestion_decision.state})
            </h4>
            <DataTable
              columns={['Dataset ID', 'State', 'Eligible for MasterDB', 'Classification', 'Integrity Score', 'Rejection Reasons']}
              rows={[{
                'Dataset ID': validationReport.ingestion_decision.dataset_id,
                'State': validationReport.ingestion_decision.state,
                'Eligible for MasterDB': validationReport.ingestion_decision.eligible_for_masterdb ? 'Yes' : 'No',
                'Classification': validationReport.ingestion_decision.classification,
                'Integrity Score': String(validationReport.ingestion_decision.integrity_score),
                'Rejection Reasons': validationReport.ingestion_decision.rejection_reasons.length > 0
                  ? validationReport.ingestion_decision.rejection_reasons.join('; ')
                  : 'None',
              }]}
              empty="No ingestion decision available"
            />
          </div>
        )}

        {/* Certification Gate Audit Trail */}
        {certificationAuditRows.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Certification Gate Audit Trail
            </h4>
            <DataTable
              columns={['Gate Rule', 'From State', 'To State', 'Passed', 'Reason']}
              rows={certificationAuditRows}
              empty="No certification audit entries"
            />
          </div>
        )}
      </div>

      {/* 04 Lineage & Provenance Section */}
      <div className="section-container">
        <SectionHeader
          number="04"
          eyebrow="GRAPH & PROVENANCE"
          title="Lineage & Provenance"
          detail={`Package derivation hierarchy, ancestor tracking, and MDU provenance records for ${datasetId}.`}
          action={
            <button
              className="btn-secondary"
              onClick={handleRefreshLineageAndProvenance}
              disabled={lineageLoading || provenanceLoading}
            >
              {lineageLoading || provenanceLoading ? 'Loading…' : 'Refresh Lineage'}
            </button>
          }
        />

        {/* Lineage Status Badges */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
          {lineageData && (
            <StatusBadge kind={lineageData.knowledge_object_registered ? 'success' : 'neutral'}>
              {lineageData.knowledge_object_registered ? 'Knowledge Object Registered' : 'No Knowledge Object Registered'}
            </StatusBadge>
          )}
          {lineageData?.mdu_provenance && (
            <StatusBadge kind={lineageData.mdu_provenance.source === 'mdu-live' ? 'success' : 'info'}>
              MDU: {lineageData.mdu_provenance.source}
            </StatusBadge>
          )}
        </div>

        {/* Loading & Error Notices */}
        {lineageLoading && <div className="notice info">Loading package lineage from MASTERDB knowledge object service…</div>}
        {provenanceLoading && <div className="notice info">Fetching dataset provenance from MDU integration endpoint…</div>}
        {lineageError && <div className="notice error">{lineageError}</div>}
        {provenanceError && <div className="notice error">{provenanceError}</div>}

        {/* Lineage Summary Table */}
        {lineageData ? (
          <>
            <DataTable
              columns={['Package ID', 'Knowledge Object', 'Knowledge Object ID', 'Knowledge Hash', 'Source Reference', 'Lineage Reference', 'Ancestors', 'Descendants']}
              rows={lineageSummaryRows}
              empty="No lineage summary available"
            />

            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Lineage Hierarchy & Derivation
              </h4>
              <DataTable
                columns={['Relation / Flow', 'Count', 'Details']}
                rows={lineageHierarchyRows}
                empty="No relationship details available"
              />
            </div>

            {lineageData.known_gaps && lineageData.known_gaps.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  MDU Contract Status & Known Gaps ({lineageData.known_gaps.length})
                </h4>
                <DataTable
                  columns={['Gap Assessment']}
                  rows={lineageData.known_gaps.map(g => ({ 'Gap Assessment': g }))}
                  empty="No contract gaps recorded"
                />
              </div>
            )}
          </>
        ) : (
          !lineageLoading && !lineageError && (
            <EmptyState title="No lineage information available">
              No knowledge object or lineage record was found for package &quot;{datasetId}&quot;.
            </EmptyState>
          )
        )}

        {/* MDU Provenance Records Section */}
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            MDU Provenance Records (Target: {packageDetail.dataset_id})
          </h4>
          {provenanceRows.length > 0 ? (
            <DataTable
              columns={['Event ID', 'Event Type', 'Dataset ID', 'Source Reference', 'Transformation', 'Timestamp', 'Actor']}
              rows={provenanceRows}
              empty="No provenance events found"
            />
          ) : (
            !provenanceLoading && (
              <EmptyState title="No provenance records available">
                {provenanceError
                  ? 'MDU provenance is currently unavailable due to upstream configuration or reachability.'
                  : `No provenance events recorded in MDU for dataset "${packageDetail.dataset_id}".`}
              </EmptyState>
            )
          )}
        </div>
      </div>

      {/* 05 MDU Schema Section */}
      <div className="section-container">
        <SectionHeader
          number="05"
          eyebrow="SCHEMA NEGOTIATION"
          title="MDU Schema & Compatibility"
          detail={`Canonical schema validation and schema compatibility negotiation for ${packageDetail.dataset_id}.`}
          action={
            <button
              className="btn-secondary"
              onClick={handleRefreshMDUSchema}
              disabled={schemaLoading || schemaCompatibilityLoading}
            >
              {schemaLoading || schemaCompatibilityLoading ? 'Loading…' : 'Refresh Schema'}
            </button>
          }
        />

        {/* MDU Schema Toolbar & Status Badges */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
          {schemaData && (
            <StatusBadge kind="success">
              MDU Schema: Available
            </StatusBadge>
          )}
          {schemaError && (
            <StatusBadge kind="neutral">
              MDU Schema: Unavailable
            </StatusBadge>
          )}
          {schemaCompatibilityData && (
            <StatusBadge kind={schemaCompatibilityData.compatible ? 'success' : 'danger'}>
              Compatibility: {schemaCompatibilityData.compatible ? 'Compatible' : 'Incompatible'}
            </StatusBadge>
          )}
          {schemaCompatibilityError && (
            <StatusBadge kind="danger">
              Compatibility: Error
            </StatusBadge>
          )}
        </div>

        {/* Subsection A: Canonical Schema */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Canonical Schema {schemaData?.schema_version ? `(Version: ${schemaData.schema_version})` : ''}
          </h4>
          {schemaLoading && <div className="notice info">Loading canonical schema from MDU…</div>}
          {schemaError && <div className="notice error">{schemaError}</div>}
          {schemaData ? (
            <>
              <div className="notice info" style={{ marginBottom: '12px' }}>
                <b>Canonical Schema Contract:</b> Active canonical schema for dataset &quot;{packageDetail.dataset_id}&quot; retrieved from MDU service.
              </div>
              <DataTable
                columns={['Dataset ID', 'Schema Version', 'Fields Count', 'Created At', 'Updated At']}
                rows={[{
                  'Dataset ID': String(schemaData.dataset_id ?? packageDetail.dataset_id),
                  'Schema Version': String(schemaData.schema_version ?? schemaData.version ?? packageDetail.schema_version),
                  'Fields Count': String(schemaFieldRows.length),
                  'Created At': String(schemaData.created_at ?? '-'),
                  'Updated At': String(schemaData.updated_at ?? '-'),
                }]}
                empty="No schema header data"
              />
              {schemaFieldRows.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <h5 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Fields & Column Specifications</h5>
                  <DataTable
                    columns={['Field Name', 'Data Type', 'Nullable', 'Description', 'Constraints']}
                    rows={schemaFieldRows}
                    empty="No fields defined"
                  />
                </div>
              )}
            </>
          ) : (
            !schemaLoading && !schemaError && (
              <EmptyState title="No schema records available">
                No canonical schema definition recorded in MDU for dataset &quot;{packageDetail.dataset_id}&quot;.
              </EmptyState>
            )
          )}
        </div>

        {/* Subsection B: Schema Compatibility */}
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Schema Compatibility (MASTERDB ↔ MDU Negotiation)
          </h4>
          {schemaCompatibilityLoading && <div className="notice info">Checking schema compatibility with MDU…</div>}
          {schemaCompatibilityError && <div className="notice error">{schemaCompatibilityError}</div>}
          {schemaCompatibilityData ? (
            <>
              <DataTable
                columns={['Target Dataset ID', 'Local Schema Version', 'MDU Schema Version', 'Compatibility Status', 'Negotiation Rule', 'Integration Source', 'Evaluation Detail']}
                rows={[{
                  'Target Dataset ID': String(schemaCompatibilityData.dataset_id ?? packageDetail.dataset_id),
                  'Local Schema Version': String(schemaCompatibilityData.local_schema_version ?? packageDetail.schema_version),
                  'MDU Schema Version': String(schemaCompatibilityData.mdu_schema_version ?? 'None reported'),
                  'Compatibility Status': schemaCompatibilityData.compatible ? 'Compatible' : 'Incompatible',
                  'Negotiation Rule': String(schemaCompatibilityData.negotiation ?? (schemaCompatibilityData.source === 'placeholder' ? 'Permissive Placeholder' : 'N/A')),
                  'Integration Source': schemaCompatibilityData.source === 'mdu-live' ? 'MDU Live Service' : 'Permissive Placeholder',
                  'Evaluation Detail': schemaCompatibilityData.reason || 'Schema versions are compatible.',
                }]}
                empty="No compatibility evaluation available"
              />

              {schemaCompatibilityData.known_gaps && schemaCompatibilityData.known_gaps.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <h5 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>MDU Integration Gaps</h5>
                  <DataTable
                    columns={['Known Gap']}
                    rows={schemaCompatibilityData.known_gaps.map(g => ({ 'Known Gap': g }))}
                    empty="No gaps reported"
                  />
                </div>
              )}
            </>
          ) : (
            !schemaCompatibilityLoading && !schemaCompatibilityError && (
              <EmptyState title="No compatibility report available">
                No schema compatibility evaluation available for dataset &quot;{packageDetail.dataset_id}&quot;.
              </EmptyState>
            )
          )}
        </div>
      </div>

      {/* 06 TANTRA Certification Section */}
      <div className="section-container">
        <SectionHeader
          number="06"
          eyebrow="RUNTIME BOUNDARY"
          title="TANTRA Certification"
          detail={`Read-only certification boundary consumed by TANTRA runtime services for ${packageDetail.dataset_id}.`}
          action={
            <button
              className="btn-secondary"
              onClick={handleRefreshTantraCertification}
              disabled={tantraCertLoading}
            >
              {tantraCertLoading ? 'Loading…' : 'Refresh TANTRA Cert'}
            </button>
          }
        />

        {/* Architecture Boundary Clarification */}
        <div className="notice info" style={{ marginBottom: '14px' }}>
          <b>TANTRA Interface Contract:</b> Read-only certification boundary consumed by TANTRA runtime services. This evaluates dataset governance status independently from the active MASTERDB certification workflow.
        </div>

        {/* TANTRA Certification Status Badges */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
          {tantraCertData ? (
            <>
              <StatusBadge kind={tantraCertData.state === 'CERTIFIED' ? 'success' : tantraCertData.state === 'REJECTED' ? 'danger' : 'neutral'}>
                TANTRA State: {tantraCertData.state}
              </StatusBadge>
              <StatusBadge kind={tantraCertData.eligible_for_masterdb ? 'success' : 'danger'}>
                {tantraCertData.eligible_for_masterdb ? 'MasterDB Eligible' : 'MasterDB Ineligible'}
              </StatusBadge>
              <StatusBadge kind="info">
                Classification: {tantraCertData.classification}
              </StatusBadge>
            </>
          ) : (
            !tantraCertLoading && !tantraCertError && (
              <StatusBadge kind="neutral">
                TANTRA: Awaiting Certification
              </StatusBadge>
            )
          )}
          {tantraCertError && (
            <StatusBadge kind="danger">
              TANTRA: Error
            </StatusBadge>
          )}
        </div>

        {/* Loading & Error Notices */}
        {tantraCertLoading && <div className="notice info">Loading TANTRA certification status from backend…</div>}
        {tantraCertError && <div className="notice error">{tantraCertError}</div>}

        {/* TANTRA Certification Content */}
        {tantraCertData ? (
          <DataTable
            columns={['Target Dataset ID', 'Certification State', 'Classification', 'Integrity Score', 'MasterDB Ingestion Eligible']}
            rows={tantraCertSummaryRows}
            empty="No certification details available"
          />
        ) : (
          !tantraCertLoading && !tantraCertError && (
            <EmptyState title="No TANTRA certification record">
              No certification report found in TANTRA interface for dataset &quot;{packageDetail.dataset_id}&quot;. The dataset has not undergone MASTERDB certification report generation.
            </EmptyState>
          )
        )}
      </div>

      {/* 07 Knowledge Object Section */}
      <div className="section-container">
        <SectionHeader
          number="07"
          eyebrow="KNOWLEDGE LAYER"
          title="Knowledge Object"
          detail={`Canonical Knowledge Object registration and lineage pointers for package ${datasetId}.`}
        />

        {/* Knowledge Object Status Badges */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
          <StatusBadge kind={lineageData?.knowledge_object_registered ? 'success' : 'neutral'}>
            {lineageData?.knowledge_object_registered ? 'Knowledge Object Registered' : 'Unregistered'}
          </StatusBadge>
        </div>

        {/* Notifications */}
        {isRegisteringKO && <div className="notice info">Registering Knowledge Object with MASTERDB backend…</div>}
        {koActionMessage && <div className="notice success">{koActionMessage}</div>}
        {koError && <div className="notice error">{koError}</div>}

        {/* Registered State vs Unregistered Registration Form */}
        {lineageData?.knowledge_object_registered ? (
          <>
            <div className="notice info" style={{ marginBottom: '14px' }}>
              <b>Registered Knowledge Object:</b> A canonical Knowledge Object pointer is actively registered for package &quot;{datasetId}&quot;.
            </div>
            <DataTable
              columns={['Knowledge Object ID', 'Package ID', 'Knowledge Hash', 'Source Reference', 'Lineage Reference', 'Derivation Path']}
              rows={[{
                'Knowledge Object ID': lineageData.knowledge_object_id ?? 'None',
                'Package ID': lineageData.package_id,
                'Knowledge Hash': lineageData.knowledge_hash ? lineageData.knowledge_hash.slice(0, 16) + '…' : 'None',
                'Source Reference': lineageData.source_reference ?? 'None',
                'Lineage Reference': lineageData.lineage_reference ?? 'None',
                'Derivation Path': (lineageData.derivation_path && lineageData.derivation_path.length > 0)
                  ? lineageData.derivation_path.join(' → ')
                  : 'None',
              }]}
              empty="No knowledge object details available"
            />
          </>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '18px' }}>
            <div className="notice info" style={{ marginTop: 0, marginBottom: '14px' }}>
              <b>Registration Required:</b> Registering a Knowledge Object links lineage pointers and satisfies the <code>LINEAGE_REGISTERED</code> prerequisite for retrieval readiness.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Package ID (Target):
                </label>
                <input
                  type="text"
                  value={datasetId}
                  disabled
                  style={{ width: '100%', padding: '7px 10px', fontSize: '13px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-secondary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Source Reference (e.g. S3 URI or file path):
                </label>
                <input
                  type="text"
                  value={koSourceRefInput}
                  onChange={e => setKoSourceRefInput(e.target.value)}
                  disabled={isRegisteringKO}
                  placeholder="s3://bucket/source.csv or datasets/sample.csv"
                  style={{ width: '100%', padding: '7px 10px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Parent Package ID (Optional):
                </label>
                <input
                  type="text"
                  value={koParentPkgInput}
                  onChange={e => setKoParentPkgInput(e.target.value)}
                  disabled={isRegisteringKO}
                  placeholder="e.g. pkg-parent-id (leave blank if root)"
                  style={{ width: '100%', padding: '7px 10px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Lineage Reference (Optional):
                </label>
                <input
                  type="text"
                  value={koLineageRefInput}
                  onChange={e => setKoLineageRefInput(e.target.value)}
                  disabled={isRegisteringKO}
                  placeholder="Optional lineage URI or hash"
                  style={{ width: '100%', padding: '7px 10px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '6px' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Derivation Path (Comma-separated steps):
                </label>
                <input
                  type="text"
                  value={koDerivationPathInput}
                  onChange={e => setKoDerivationPathInput(e.target.value)}
                  disabled={isRegisteringKO}
                  placeholder="ingestion, cleanse, transform"
                  style={{ width: '100%', padding: '7px 10px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '6px' }}
                />
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={handleRegisterKnowledgeObject}
              disabled={isRegisteringKO}
            >
              {isRegisteringKO ? 'Registering Knowledge Object…' : 'Register Knowledge Object'}
            </button>
          </div>
        )}
      </div>

      {/* 08 Retrieval Readiness Section */}
      <div className="section-container">
        <SectionHeader
          number="08"
          eyebrow="QUERY SERVING"
          title="Retrieval Readiness & Evidence"
          detail={`TANTRA retrieval readiness rules and MASTERDB package retrieval evidence for ${datasetId}.`}
          action={
            <button
              className="btn-secondary"
              onClick={handleRefreshRetrieval}
              disabled={retrievalLoading || retrievalReadinessLoading}
            >
              {retrievalLoading || retrievalReadinessLoading ? 'Loading…' : 'Refresh Retrieval'}
            </button>
          }
        />

        {/* Status Badges */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
          {retrievalReadinessData && (
            <StatusBadge kind={getStatusKind(retrievalReadinessData.status)}>
              TANTRA: {retrievalReadinessData.status}
            </StatusBadge>
          )}
          {retrievalData && (
            <StatusBadge kind={getStatusKind(retrievalData.status)}>
              Retrieval: {retrievalData.status}
            </StatusBadge>
          )}
        </div>

        {/* Loading & Error Notices */}
        {retrievalReadinessLoading && <div className="notice info">Loading retrieval readiness assessment from TANTRA interface…</div>}
        {retrievalLoading && <div className="notice info">Loading retrieval evidence from MASTERDB retrieval engine…</div>}
        {retrievalReadinessError && <div className="notice error">Retrieval readiness error: {retrievalReadinessError}</div>}
        {retrievalError && <div className="notice error">Retrieval evidence error: {retrievalError}</div>}

        {/* A. Retrieval Readiness (TANTRA) */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Retrieval Readiness (TANTRA Interface Contract)
          </h4>
          {retrievalReadinessData ? (
            <>
              <DataTable
                columns={['Package ID', 'Readiness Status', 'Rules Passed', 'Corrective Actions', 'Generated At']}
                rows={readinessSummaryRows}
                empty="No readiness summary available"
              />

              <div style={{ marginTop: '14px' }}>
                <h5 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Readiness Rule Evaluations ({retrievalReadinessData.rules.filter(r => r.passed).length} of {retrievalReadinessData.rules.length} passed)
                </h5>
                <DataTable
                  columns={['Readiness Rule', 'Status', 'Rule Detail']}
                  rows={readinessRuleRows}
                  empty="No readiness rules evaluated"
                />
              </div>

              {readinessCorrectiveRows.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <h5 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Required Corrective Actions ({readinessCorrectiveRows.length})
                  </h5>
                  <DataTable
                    columns={['Required Corrective Action']}
                    rows={readinessCorrectiveRows}
                    empty="No corrective actions required"
                  />
                </div>
              )}
            </>
          ) : (
            !retrievalReadinessLoading && !retrievalReadinessError && (
              <EmptyState title="No retrieval readiness available">
                No retrieval readiness assessment record was found for package &quot;{datasetId}&quot;.
              </EmptyState>
            )
          )}
        </div>

        {/* B. Retrieval Evidence (Package Retrieval Engine) */}
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Retrieval Evidence & Status (Package Retrieval Engine)
          </h4>
          {retrievalData ? (
            <>
              <DataTable
                columns={['Package ID', 'Retrieval Status', 'Passed Rules', 'Evaluation Timestamp']}
                rows={retrievalSummaryRows}
                empty="No retrieval summary available"
              />

              <div style={{ marginTop: '14px' }}>
                <h5 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Retrieval Rules & Findings ({retrievalData.rules.filter(r => r.passed).length} of {retrievalData.rules.length} passed)
                </h5>
                <DataTable
                  columns={['Rule', 'Status', 'Evidence Finding']}
                  rows={retrievalRuleRows}
                  empty="No retrieval rule findings"
                />
              </div>

              {retrievalCorrectiveRows.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <h5 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Recommended Remediation ({retrievalCorrectiveRows.length})
                  </h5>
                  <DataTable
                    columns={['Recommended Action']}
                    rows={retrievalCorrectiveRows}
                    empty="No remediation needed"
                  />
                </div>
              )}
            </>
          ) : (
            !retrievalLoading && !retrievalError && (
              <EmptyState title="No retrieval evidence available">
                No retrieval evidence record was found for package &quot;{datasetId}&quot;.
              </EmptyState>
            )
          )}
        </div>
      </div>

      {/* 09 TANTRA Runtime Section */}
      <div className="section-container">
        <SectionHeader
          number="09"
          eyebrow="SUBSYSTEM INTEGRATION"
          title="TANTRA Runtime"
          detail={`Operational snapshot and subsystem convergence monitoring for package ${datasetId}.`}
          action={
            <button
              className="btn-secondary"
              onClick={handleRefreshTantraRuntime}
              disabled={tantraRuntimeLoading}
            >
              {tantraRuntimeLoading ? 'Loading…' : 'Refresh Runtime'}
            </button>
          }
        />

        {/* TANTRA Runtime Status Badges */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
          {tantraRuntimeData ? (
            <>
              <StatusBadge kind={getStatusKind(tantraRuntimeData.package.status)}>
                Runtime State: {tantraRuntimeData.package.status}
              </StatusBadge>
              <StatusBadge kind={getStatusKind(tantraRuntimeData.retrieval_readiness.status)}>
                Retrieval: {tantraRuntimeData.retrieval_readiness.status}
              </StatusBadge>
              <StatusBadge kind={tantraRuntimeData.lineage.knowledge_object_registered ? 'success' : 'neutral'}>
                Lineage: {tantraRuntimeData.lineage.knowledge_object_registered ? 'Registered' : 'Unregistered'}
              </StatusBadge>
              {tantraRuntimeData.certification_status && (
                <StatusBadge kind={tantraRuntimeData.certification_status.state === 'CERTIFIED' ? 'success' : 'neutral'}>
                  Cert: {tantraRuntimeData.certification_status.state}
                </StatusBadge>
              )}
            </>
          ) : (
            !tantraRuntimeLoading && !tantraRuntimeError && (
              <StatusBadge kind="neutral">
                TANTRA: Awaiting Runtime
              </StatusBadge>
            )
          )}
          {tantraRuntimeError && (
            <StatusBadge kind="danger">
              TANTRA: Runtime Error
            </StatusBadge>
          )}
        </div>

        {/* Loading & Error Notices */}
        {tantraRuntimeLoading && <div className="notice info">Loading TANTRA runtime snapshot from backend…</div>}
        {tantraRuntimeError && <div className="notice error">{tantraRuntimeError}</div>}

        {/* TANTRA Runtime Content */}
        {tantraRuntimeData ? (
          <>
            <DataTable
              columns={['Package ID', 'Dataset ID', 'Runtime Status', 'Schema Version', 'Lineage Registered', 'Retrieval Readiness', 'TANTRA Certification']}
              rows={tantraRuntimeSummaryRows}
              empty="No runtime snapshot available"
            />

            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Runtime Integration Dependencies (Subsystem Convergence)
              </h4>
              <DataTable
                columns={['Integration Component', 'Observed State', 'Details / Identifier']}
                rows={[
                  {
                    'Integration Component': 'Underlying Package',
                    'Observed State': tantraRuntimeData.package.status,
                    'Details / Identifier': `${tantraRuntimeData.package.package_id} (${tantraRuntimeData.package.dataset_id} v${tantraRuntimeData.package.dataset_version})`,
                  },
                  {
                    'Integration Component': 'Lineage Tracking',
                    'Observed State': tantraRuntimeData.lineage.knowledge_object_registered ? 'Knowledge Object Registered' : 'Unregistered',
                    'Details / Identifier': tantraRuntimeData.lineage.knowledge_object_id ?? 'No KO registered',
                  },
                  {
                    'Integration Component': 'Retrieval Assessment',
                    'Observed State': tantraRuntimeData.retrieval_readiness.status,
                    'Details / Identifier': `${tantraRuntimeData.retrieval_readiness.rules.filter(r => r.passed).length} of ${tantraRuntimeData.retrieval_readiness.rules.length} rules passed`,
                  },
                  {
                    'Integration Component': 'Governance Certification',
                    'Observed State': tantraRuntimeData.certification_status ? tantraRuntimeData.certification_status.state : 'No Certification Record',
                    'Details / Identifier': tantraRuntimeData.certification_status ? `Classification: ${tantraRuntimeData.certification_status.classification} (Score: ${tantraRuntimeData.certification_status.integrity_score}%)` : 'Awaiting TANTRA certification report',
                  },
                ]}
                empty="No integration dependencies found"
              />
            </div>
          </>
        ) : (
          !tantraRuntimeLoading && !tantraRuntimeError && (
            <EmptyState title="No TANTRA runtime record">
              No runtime snapshot found in TANTRA interface for package &quot;{datasetId}&quot;.
            </EmptyState>
          )
        )}
      </div>

      {/* 10 Audit & Replay Section */}
      <div className="section-container">
        <SectionHeader
          number="10"
          eyebrow="TRACEABILITY & INTEGRITY"
          title="Audit & Replay"
          detail={`Deterministic state machine replay and audit completeness verification for ${datasetId}.`}
          action={
            <button
              className="btn-secondary"
              onClick={handleRefreshAuditAndReplay}
              disabled={auditLoading || replayLoading}
            >
              {auditLoading || replayLoading ? 'Loading…' : 'Refresh Audit'}
            </button>
          }
        />

        {/* Audit & Replay Status Badges */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
          {auditData && (
            <StatusBadge kind={auditData.complete ? 'success' : 'danger'}>
              {auditData.complete ? 'Audit Trail: Complete' : 'Audit Trail: Incomplete'}
            </StatusBadge>
          )}
          {replayData && (
            <StatusBadge kind={replayData.replay_consistent ? 'success' : 'danger'}>
              {replayData.replay_consistent ? `Replay: Consistent (${replayData.replayed_status ?? ''})` : 'Replay: Drift Detected'}
            </StatusBadge>
          )}
        </div>

        {/* Loading & Error Notices */}
        {auditLoading && <div className="notice info">Loading audit completeness verification from MASTERDB registry…</div>}
        {replayLoading && <div className="notice info">Recomputing package status from transition history to verify replay consistency…</div>}
        {auditError && <div className="notice error">Audit verification error: {auditError}</div>}
        {replayError && <div className="notice error">Replay evaluation error: {replayError}</div>}

        {/* A. Package Audit Completeness */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Audit Trail Completeness (Phase 4 Transition Integrity Verification)
          </h4>
          {auditData ? (
            <>
              <DataTable
                columns={['Package ID', 'Audit Trail Complete', 'Transitions Recorded', 'Replay Consistent', 'Issues Found']}
                rows={auditSummaryRows}
                empty="No audit summary available"
              />

              {auditIssuesRows.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <h5 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Audit Trail Issues ({auditIssuesRows.length})
                  </h5>
                  <DataTable
                    columns={['Audit Issue']}
                    rows={auditIssuesRows}
                    empty="No audit issues detected"
                  />
                </div>
              )}

              {auditData.replay_error && (
                <div className="notice error" style={{ marginTop: '10px' }}>
                  <b>Audit Replay Error:</b> {auditData.replay_error}
                </div>
              )}
            </>
          ) : (
            !auditLoading && !auditError && (
              <EmptyState title="No audit report available">
                No audit completeness report was found for package &quot;{datasetId}&quot;.
              </EmptyState>
            )
          )}
        </div>

        {/* B. State Machine Replay (Read-Only) */}
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            State Machine Replay (Read-Only Lifecycle Graph Replay)
          </h4>
          <div className="notice info" style={{ marginBottom: '12px' }}>
            <b>Read-Only Verification:</b> Reconstructs package status purely by walking transition hops from scratch through the legal lifecycle graph to detect drift or corruption.
          </div>

          {replayData ? (
            <DataTable
              columns={['Package ID', 'Replay Consistent', 'Replayed Status', 'Replay Error']}
              rows={replaySummaryRows}
              empty="No replay evidence available"
            />
          ) : (
            !replayLoading && !replayError && (
              <EmptyState title="No replay evidence available">
                No replay evidence was found for package &quot;{datasetId}&quot;.
              </EmptyState>
            )
          )}
        </div>
      </div>

      {/* 11 History Section */}
      {history && historyRows.length > 0 && (
        <div className="section-container">
          <SectionHeader
            number="11"
            eyebrow="EVENT LOG"
            title="History"
            detail={`Sequential transition history and recorded timestamp logs for ${datasetId}.`}
          />
          <DataTable columns={historyColumns} rows={historyRows} empty="No history available"/>
        </div>
      )}
    </>
  );
}

export function Ingestion() {
  return (
    <>
      <PageHeader
        eyebrow="INGESTION SUBSYSTEM"
        title="Dataset Ingestion"
        description="Dataset ingestion is performed by the sovereign ingestion pipeline. This control center monitors and governs registered packages after ingestion."
      />

      <div className="section-container" style={{ maxWidth: '840px' }}>
        <SectionHeader
          eyebrow="SOVEREIGN ARCHITECTURE"
          title="Ingestion Pipeline Protocol"
          detail="Decoupled batch and streaming ingestion decoupled from the control plane."
        />

        <div className="notice info" style={{ marginBottom: '20px' }}>
          <b>Sovereign Pipeline Architecture:</b> Raw dataset ingestion, format conversion, and payload transport are executed by upstream workers. Ingestion produces immutable packages that register directly into the MASTERDB canonical store.
        </div>

        <ol className="steps" style={{ marginBottom: '24px' }}>
          {['Source Ingestion', 'Metadata Packaging', 'Payload Staging', 'Validation Gates', 'Certification Hook', 'Retrieval Registered'].map((step, idx) => (
            <li key={step}>
              <b>{idx + 1}</b>
              {step}
            </li>
          ))}
        </ol>

        <div style={{ marginTop: '24px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Governed Control Plane Actions
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <Link to="/datasets" className="btn-primary" style={{ textDecoration: 'none', justifyContent: 'center' }}>
              Dataset Explorer ›
            </Link>
            <Link to="/governance" className="btn-secondary" style={{ textDecoration: 'none', justifyContent: 'center' }}>
              Governance Guide ›
            </Link>
            <Link to="/observability" className="btn-secondary" style={{ textDecoration: 'none', justifyContent: 'center' }}>
              Observability Console ›
            </Link>
            <Link to="/admin" className="btn-secondary" style={{ textDecoration: 'none', justifyContent: 'center' }}>
              System & Admin ›
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export function Jobs() {
  return (
    <>
      <PageHeader
        eyebrow="BACKGROUND JOBS"
        title="Ingestion Jobs"
        description="Monitor sovereign ingestion workers and background job queues when job APIs are configured."
      />
      <div className="section-container">
        <DataTable
          columns={['Job ID', 'Dataset', 'Target', 'Status', 'Started', 'Updated', 'Result']}
          empty="No background ingestion jobs currently executing."
        />
      </div>
    </>
  );
}

export function Observability() {
  // 1. Runtime Identity state
  const [identityData, setIdentityData] = React.useState<RuntimeIdentityResponse | null>(null);
  const [identityLoading, setIdentityLoading] = React.useState<boolean>(false);
  const [identityError, setIdentityError] = React.useState<string | null>(null);

  // 2. Shared Registry state
  const [sharedRegistryData, setSharedRegistryData] = React.useState<SharedRegistryResponse | null>(null);
  const [sharedRegistryLoading, setSharedRegistryLoading] = React.useState<boolean>(false);
  const [sharedRegistryError, setSharedRegistryError] = React.useState<string | null>(null);

  // 3. Shared Contracts state
  const [sharedContractsData, setSharedContractsData] = React.useState<SharedContractsResponse | null>(null);
  const [sharedContractsLoading, setSharedContractsLoading] = React.useState<boolean>(false);
  const [sharedContractsError, setSharedContractsError] = React.useState<string | null>(null);

  // 4. Operational Sync state (Parikshak & Niyantran)
  const [parikshakSyncData, setParikshakSyncData] = React.useState<OperationalSyncResponse | null>(null);
  const [niyantranSyncData, setNiyantranSyncData] = React.useState<OperationalSyncResponse | null>(null);
  const [syncLoading, setSyncLoading] = React.useState<boolean>(false);
  const [syncError, setSyncError] = React.useState<string | null>(null);

  // 5. Replay Capabilities Manifest state
  const [replayManifestData, setReplayManifestData] = React.useState<ReplayRegistryManifestResponse | null>(null);
  const [replayManifestLoading, setReplayManifestLoading] = React.useState<boolean>(false);
  const [replayManifestError, setReplayManifestError] = React.useState<string | null>(null);

  // Loaders
  const loadIdentity = React.useCallback(async () => {
    setIdentityLoading(true);
    setIdentityError(null);
    try {
      const data = await getRuntimeIdentity();
      setIdentityData(data);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      setIdentityError(apiErr?.message || 'Unable to load runtime identity');
    } finally {
      setIdentityLoading(false);
    }
  }, []);

  const loadSharedRegistry = React.useCallback(async () => {
    setSharedRegistryLoading(true);
    setSharedRegistryError(null);
    try {
      const data = await getSharedRegistry();
      setSharedRegistryData(data);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      setSharedRegistryError(apiErr?.message || 'Unable to load shared registry');
    } finally {
      setSharedRegistryLoading(false);
    }
  }, []);

  const loadSharedContracts = React.useCallback(async () => {
    setSharedContractsLoading(true);
    setSharedContractsError(null);
    try {
      const data = await getSharedContracts();
      setSharedContractsData(data);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      setSharedContractsError(apiErr?.message || 'Unable to load shared contracts');
    } finally {
      setSharedContractsLoading(false);
    }
  }, []);

  const loadOperationalSync = React.useCallback(async () => {
    setSyncLoading(true);
    setSyncError(null);
    try {
      const [parikshakRes, niyantranRes] = await Promise.all([
        getParikshakReviewReferences(),
        getNiyantranTaskState(),
      ]);
      setParikshakSyncData(parikshakRes);
      setNiyantranSyncData(niyantranRes);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      setSyncError(apiErr?.message || 'Unable to load operational sync data');
    } finally {
      setSyncLoading(false);
    }
  }, []);

  const loadReplayManifest = React.useCallback(async () => {
    setReplayManifestLoading(true);
    setReplayManifestError(null);
    try {
      const data = await getReplayRegistryManifest();
      setReplayManifestData(data);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      setReplayManifestError(apiErr?.message || 'Unable to load replay manifest');
    } finally {
      setReplayManifestLoading(false);
    }
  }, []);

  // Fetch all on initial mount
  React.useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        loadIdentity();
        loadSharedRegistry();
        loadSharedContracts();
        loadOperationalSync();
        loadReplayManifest();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadIdentity, loadSharedRegistry, loadSharedContracts, loadOperationalSync, loadReplayManifest]);

  const refreshAllObservability = () => {
    loadIdentity();
    loadSharedRegistry();
    loadSharedContracts();
    loadOperationalSync();
    loadReplayManifest();
  };

  const isAnyLoading = identityLoading || sharedRegistryLoading || sharedContractsLoading || syncLoading || replayManifestLoading;

  // Identity Rows
  const identityRows = identityData ? [
    {
      'Attribute': 'Service Name',
      'Value': identityData.service_name,
      'Operational Role': 'Sovereign Core Control Plane',
    },
    {
      'Attribute': 'Engine Version',
      'Value': identityData.version,
      'Operational Role': 'Standardized Knowledge Node Release',
    },
    {
      'Attribute': 'Constitutional Role',
      'Value': identityData.constitutional_role,
      'Operational Role': 'Authoritative Metadata & Governance Node',
    },
    {
      'Attribute': 'Declared Capabilities',
      'Value': `${identityData.capabilities.length} capabilities active`,
      'Operational Role': 'Governance, Validation, Certification, Replay',
    },
  ] : [];

  // Shared Registry Rows
  const sharedRegistryRows = sharedRegistryData ? sharedRegistryData.datasets.map(ds => ({
    'Dataset Name': ds.name,
    'Purpose': ds.purpose,
    'Owner': ds.owner,
    'Consumers': ds.consumers?.length > 0 ? ds.consumers.join(', ') : 'None listed',
    'Update Policy': ds.update_policy,
    'Lifecycle': ds.lifecycle,
  })) : [];

  // Shared Contracts Rows
  const sharedContractsRows = sharedContractsData ? Object.entries(sharedContractsData.contracts).map(([cName, cDetail]) => ({
    'Contract Name': cName,
    'Version': cDetail.version,
    'Outputs': cDetail.outputs || 'None listed',
    'Upstream Authority': cDetail.upstream_authority || 'Sovereign Core',
    'MDU Sync Mechanism': cDetail.mdu_sync_mechanism || 'Direct API',
    'Replay Mechanism': cDetail.replay_mechanism || 'Deterministic',
    'Failure Behaviour': cDetail.failure_behaviour || 'Fail-Safe',
  })) : [];

  // Parikshak sync rows
  const parikshakRows = parikshakSyncData ? parikshakSyncData.records.map((rec, idx) => ({
    'Source System': 'PARIKSHAK',
    'Entity Type': String(rec.type || 'Review Reference'),
    'Identifier': String(rec.id || rec.reference_id || `parikshak-ref-${idx + 1}`),
    'Status': String(rec.status || 'Synchronized'),
    'Last Synchronized': String(rec.timestamp || rec.synced_at || 'Active'),
  })) : [];

  // Niyantran sync rows
  const niyantranRows = niyantranSyncData ? niyantranSyncData.records.map((rec, idx) => ({
    'Source System': 'NIYANTRAN',
    'Entity Type': String(rec.type || 'Task State'),
    'Identifier': String(rec.id || rec.task_id || `niyantran-task-${idx + 1}`),
    'Status': String(rec.status || 'Synchronized'),
    'Last Synchronized': String(rec.timestamp || rec.synced_at || 'Active'),
  })) : [];

  const combinedSyncRows = [...parikshakRows, ...niyantranRows];

  // Replay capabilities rows
  const replayCapabilityRows = replayManifestData ? replayManifestData.replay_capabilities.map(cap => ({
    'Capability Name': cap.name,
    'Endpoint': cap.endpoint,
    'Mechanism': cap.mechanism,
    'Current Replay Hash': cap.current_replay_hash ? cap.current_replay_hash.slice(0, 16) + '…' : 'None',
    'Replay Status': cap.currently_passes !== false ? 'Operational' : 'Failing',
  })) : [];

  return (
    <>
      <PageHeader
        eyebrow="SYSTEM TELEMETRY"
        title="Observability Console"
        description="Monitor sovereign runtime health, shared data contracts, operational sync, and replay capability manifests."
        action={
          <button className="btn-secondary" onClick={refreshAllObservability} disabled={isAnyLoading}>
            {isAnyLoading ? 'Refreshing Observability…' : 'Refresh All Subsystems'}
          </button>
        }
      />

      {/* Top Runtime Status Strip */}
      <div className="runtime-status-strip">
        <div className="runtime-status-item">
          <div className="status-indicator">
            <span className="badge-dot badge-dot-success" />
            <span className="status-label" style={{ color: 'var(--success)' }}>OPERATIONAL</span>
          </div>
          <span className="status-sub">Core Observability</span>
        </div>
        <div className="runtime-status-divider" />
        <div className="runtime-status-item">
          <div className="status-indicator">
            <span className="badge-dot badge-dot-info" />
            <span className="status-label">{sharedContractsData?.count ?? 0} Contracts</span>
          </div>
          <span className="status-sub">Shared Data Surface</span>
        </div>
        <div className="runtime-status-divider" />
        <div className="runtime-status-item">
          <div className="status-indicator">
            <span className="badge-dot badge-dot-success" />
            <span className="status-label">{replayManifestData?.replay_capabilities.length ?? 0} Capabilities</span>
          </div>
          <span className="status-sub">Replay Registry</span>
        </div>
      </div>

      {/* 01 Runtime Identity Section */}
      <div className="section-container">
        <SectionHeader
          number="01"
          eyebrow="SOVEREIGN NODE"
          title="Runtime Identity"
          detail="Core node identity, release version, and architectural capabilities (/identity)."
          action={
            <button className="btn-secondary" onClick={loadIdentity} disabled={identityLoading}>
              {identityLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          }
        />

        {identityLoading && <div className="notice info">Loading runtime identity from /identity…</div>}
        {identityError && <div className="notice error">Runtime identity error: {identityError}</div>}

        {identityData ? (
          <>
            <DataTable
              columns={['Attribute', 'Value', 'Operational Role']}
              rows={identityRows}
              empty="No identity data available"
            />
            <div style={{ marginTop: '14px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '4px' }}>Capabilities:</span>
              {identityData.capabilities.map(cap => (
                <span key={cap} className="code-val" style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>
                  {cap}
                </span>
              ))}
            </div>
          </>
        ) : (
          !identityLoading && !identityError && (
            <EmptyState title="No runtime identity available">
              Unable to retrieve runtime identity from MASTERDB.
            </EmptyState>
          )
        )}
      </div>

      {/* 02 Shared Data Registry Section */}
      <div className="section-container">
        <SectionHeader
          number="02"
          eyebrow="DATA SHARING"
          title="Shared Data Registry"
          detail="Registered canonical datasets and downstream consumer mappings (/shared/registry)."
          action={
            <button className="btn-secondary" onClick={loadSharedRegistry} disabled={sharedRegistryLoading}>
              {sharedRegistryLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          }
        />

        {sharedRegistryLoading && <div className="notice info">Loading shared data registry from /shared/registry…</div>}
        {sharedRegistryError && <div className="notice error">Shared registry error: {sharedRegistryError}</div>}

        {sharedRegistryData ? (
          <DataTable
            columns={['Dataset Name', 'Purpose', 'Owner', 'Consumers', 'Update Policy', 'Lifecycle']}
            rows={sharedRegistryRows}
            empty="No shared datasets registered"
          />
        ) : (
          !sharedRegistryLoading && !sharedRegistryError && (
            <EmptyState title="No shared datasets">
              No shared datasets registered in MASTERDB.
            </EmptyState>
          )
        )}
      </div>

      {/* 03 Shared Service Contracts Section */}
      <div className="section-container">
        <SectionHeader
          number="03"
          eyebrow="CONTRACT GOVERNANCE"
          title="Shared Service Contracts"
          detail="Active service output contracts and MDU sync mechanisms (/shared/contracts)."
          action={
            <button className="btn-secondary" onClick={loadSharedContracts} disabled={sharedContractsLoading}>
              {sharedContractsLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          }
        />

        {sharedContractsLoading && <div className="notice info">Loading shared data contracts from /shared/contracts…</div>}
        {sharedContractsError && <div className="notice error">Shared contracts error: {sharedContractsError}</div>}

        {sharedContractsData ? (
          <DataTable
            columns={['Contract Name', 'Version', 'Outputs', 'Upstream Authority', 'MDU Sync Mechanism', 'Replay Mechanism', 'Failure Behaviour']}
            rows={sharedContractsRows}
            empty="No shared contracts available"
          />
        ) : (
          !sharedContractsLoading && !sharedContractsError && (
            <EmptyState title="No shared contracts">
              No shared contracts found in MASTERDB.
            </EmptyState>
          )
        )}
      </div>

      {/* 04 Operational Synchronization Section */}
      <div className="section-container">
        <SectionHeader
          number="04"
          eyebrow="CROSS-SYSTEM SYNC"
          title="Operational Synchronization"
          detail="Parikshak validation references and Niyantran governance tasks (/operational/sync)."
          action={
            <button className="btn-secondary" onClick={loadOperationalSync} disabled={syncLoading}>
              {syncLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          }
        />

        {syncLoading && <div className="notice info">Loading operational synchronization references…</div>}
        {syncError && <div className="notice error">Operational sync error: {syncError}</div>}

        {combinedSyncRows.length > 0 ? (
          <DataTable
            columns={['Source System', 'Entity Type', 'Identifier', 'Status', 'Last Synchronized']}
            rows={combinedSyncRows}
            empty="No operational sync references available"
          />
        ) : (
          !syncLoading && !syncError && (
            <EmptyState title="No operational sync references">
              No active references synchronized from PARIKSHAK or NIYANTRAN.
            </EmptyState>
          )
        )}
      </div>

      {/* 05 Replay Capabilities Manifest Section */}
      <div className="section-container">
        <SectionHeader
          number="05"
          eyebrow="AUDIT REGISTRY"
          title="Replay Capabilities Manifest"
          detail="Registered endpoints supporting deterministic replay and audit verification (/replay/manifest)."
          action={
            <button className="btn-secondary" onClick={loadReplayManifest} disabled={replayManifestLoading}>
              {replayManifestLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          }
        />

        {replayManifestLoading && <div className="notice info">Loading replay capabilities manifest…</div>}
        {replayManifestError && <div className="notice error">Replay manifest error: {replayManifestError}</div>}

        {replayManifestData ? (
          <DataTable
            columns={['Capability Name', 'Endpoint', 'Mechanism', 'Current Replay Hash', 'Replay Status']}
            rows={replayCapabilityRows}
            empty="No replay capabilities registered"
          />
        ) : (
          !replayManifestLoading && !replayManifestError && (
            <EmptyState title="No replay manifest">
              No replay manifest registered in MASTERDB.
            </EmptyState>
          )
        )}
      </div>
    </>
  );
}

export function Admin() {
  // 1. Configuration State
  const [configData, setConfigData] = React.useState<AdminConfigurationReport | null>(null);
  const [configLoading, setConfigLoading] = React.useState<boolean>(false);
  const [configError, setConfigError] = React.useState<string | null>(null);

  // 2. Backup State (Controlled Mutation - NEVER auto-fetched on page load)
  const [backupData, setBackupData] = React.useState<AdminBackupSnapshot | null>(null);
  const [backupLoading, setBackupLoading] = React.useState<boolean>(false);
  const [backupError, setBackupError] = React.useState<string | null>(null);
  const [backupSuccessMessage, setBackupSuccessMessage] = React.useState<string | null>(null);

  // 3. Restore State (Dangerous / Destructive - explicit confirmation flow)
  const [isRestoreOpen, setIsRestoreOpen] = React.useState<boolean>(false);
  const [restoreJsonInput, setRestoreJsonInput] = React.useState<string>('');
  const [restoreConfirmed, setRestoreConfirmed] = React.useState<boolean>(false);
  const [restoreLoading, setRestoreLoading] = React.useState<boolean>(false);
  const [restoreError, setRestoreError] = React.useState<string | null>(null);
  const [restoreResult, setRestoreResult] = React.useState<AdminRestoreResponse | null>(null);

  const loadConfiguration = React.useCallback(async () => {
    setConfigLoading(true);
    setConfigError(null);
    try {
      const data = await getAdminConfiguration();
      setConfigData(data);
    } catch (e: unknown) {
      const apiErr = e as APIError;
      setConfigError(apiErr?.message || 'Unable to load system configuration.');
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // On mount: ONLY load configuration. Do NOT call createAdminBackup!
  React.useEffect(() => {
    let active = true;
    (async () => {
      if (active) {
        loadConfiguration();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadConfiguration]);

  // Handle Backup Creation
  const handleCreateBackup = async () => {
    setBackupLoading(true);
    setBackupError(null);
    setBackupSuccessMessage(null);
    try {
      const snapshot = await createAdminBackup();
      setBackupData(snapshot);
      setBackupSuccessMessage(`Successfully generated backup snapshot at ${snapshot.exported_at}.`);
      setRestoreJsonInput(JSON.stringify(snapshot, null, 2));
    } catch (e: unknown) {
      const apiErr = e as APIError;
      setBackupError(apiErr?.message || 'Failed to generate store backup.');
    } finally {
      setBackupLoading(false);
    }
  };

  // Handle Restore Execution
  const handleExecuteRestore = async () => {
    if (!restoreConfirmed) return;
    setRestoreLoading(true);
    setRestoreError(null);
    setRestoreResult(null);

    let parsed: AdminBackupSnapshot;
    try {
      parsed = JSON.parse(restoreJsonInput);
      if (!parsed || typeof parsed !== 'object' || !parsed.stores) {
        throw new Error('Invalid snapshot structure: missing "stores" object.');
      }
    } catch (err: unknown) {
      setRestoreError(`Invalid JSON snapshot: ${(err as Error).message}`);
      setRestoreLoading(false);
      return;
    }

    try {
      const res = await restoreAdminBackup(parsed);
      setRestoreResult(res);
      loadConfiguration();
    } catch (e: unknown) {
      const apiErr = e as APIError;
      setRestoreError(apiErr?.message || 'Restore operation failed.');
    } finally {
      setRestoreLoading(false);
    }
  };

  // Copy snapshot JSON to clipboard
  const handleCopySnapshot = () => {
    if (backupData) {
      navigator.clipboard.writeText(JSON.stringify(backupData, null, 2));
      alert('Backup snapshot JSON copied to clipboard.');
    }
  };

  // Download snapshot JSON file
  const handleDownloadSnapshot = () => {
    if (backupData) {
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `masterdb-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Config rows
  const configRows = configData ? [
    {
      'Setting / Variable': 'AUTH_JWT_SECRET',
      'Configured State': configData.AUTH_JWT_SECRET?.set ? 'Set (Secret Active)' : 'Unset (Random Secret Generated)',
      'Value / Redaction': configData.AUTH_JWT_SECRET?.set ? '●●●●●●●● [PROTECTED]' : 'None [Ephemeral Key]',
      'Notes & Operational Constraints': configData.AUTH_JWT_SECRET?.note || 'Tokens validated with configured secret',
    },
    {
      'Setting / Variable': 'MASTERDB_STORAGE_DIR',
      'Configured State': configData.MASTERDB_STORAGE_DIR?.set ? 'Configured' : 'Unset',
      'Value / Redaction': configData.MASTERDB_STORAGE_DIR?.set ? 'Disk Storage Configured' : 'In-Memory Default',
      'Notes & Operational Constraints': 'Root directory for file-based artifact store persistence',
    },
    {
      'Setting / Variable': 'MASTERDB_DATABASE_URL',
      'Configured State': configData.MASTERDB_DATABASE_URL?.set ? 'Configured' : 'Unset',
      'Value / Redaction': configData.MASTERDB_DATABASE_URL?.format ?? 'not_set',
      'Notes & Operational Constraints': (configData.MASTERDB_DATABASE_URL?.note as string | undefined) || 'SQL database connection for central storage engine',
    },
    {
      'Setting / Variable': 'Persistence Mode',
      'Configured State': configData.persistence?.mode ?? (configData.MASTERDB_DATABASE_URL?.set ? 'database' : configData.MASTERDB_STORAGE_DIR?.set ? 'filesystem' : 'in_memory'),
      'Value / Redaction': configData.persistence?.mode ? String(configData.persistence.mode).toUpperCase() : 'IN_MEMORY',
      'Notes & Operational Constraints': configData.persistence?.note || 'Durable records survive process restarts',
    },
    {
      'Setting / Variable': 'MDU_BASE_URL',
      'Configured State': configData.MDU_BASE_URL?.set ? 'Configured' : 'Unset',
      'Value / Redaction': configData.MDU_BASE_URL?.format ?? 'not_set',
      'Notes & Operational Constraints': (configData.MDU_BASE_URL?.note as string | undefined) || 'Base URL for MDU schema verification service',
    },
    {
      'Setting / Variable': 'MDU_API_KEY',
      'Configured State': configData.MDU_API_KEY?.set ? 'Set' : 'Unset',
      'Value / Redaction': configData.MDU_API_KEY?.set ? '●●●●●●●● [PROTECTED]' : 'None',
      'Notes & Operational Constraints': 'API key for authenticating with upstream MDU services',
    },
    {
      'Setting / Variable': 'PRAVAH_BHIV_INSIGHT_FLOW_BRIDGE',
      'Configured State': configData.PRAVAH_BHIV_INSIGHT_FLOW_BRIDGE?.set ? 'Configured' : 'Unset',
      'Value / Redaction': configData.PRAVAH_BHIV_INSIGHT_FLOW_BRIDGE?.format ?? 'not_set',
      'Notes & Operational Constraints': 'Upstream telemetry push target for InsightBridge',
    },
    {
      'Setting / Variable': 'RATE_LIMIT_MAX_REQUESTS',
      'Configured State': 'Configured',
      'Value / Redaction': `${configData.RATE_LIMIT_MAX_REQUESTS?.value ?? '120'} requests`,
      'Notes & Operational Constraints': configData.RATE_LIMIT_MAX_REQUESTS?.valid ? 'Valid integer threshold' : 'Malformed rate value',
    },
    {
      'Setting / Variable': 'RATE_LIMIT_WINDOW_SECONDS',
      'Configured State': 'Configured',
      'Value / Redaction': `${configData.RATE_LIMIT_WINDOW_SECONDS?.value ?? '60'} seconds`,
      'Notes & Operational Constraints': configData.RATE_LIMIT_WINDOW_SECONDS?.valid ? 'Valid window duration' : 'Malformed window value',
    },
  ] : [];

  // Backup store rows
  const backupStoreRows = backupData ? Object.entries(backupData.stores).map(([storeName, store]) => ({
    'Store Name': storeName,
    'Storage Mode': store.persisted ? 'Durable / Persisted' : 'In-Memory Only',
    'Exported Records Count': String(store.records?.length ?? 0),
    'Status': store.persisted ? 'Backed Up' : 'Empty (No Persistence)',
  })) : [];

  return (
    <>
      <PageHeader
        eyebrow="SYSTEM OPERATIONS"
        title="System Administration & Control Plane"
        description="System configuration inspection, persistent store snapshot backups, and controlled recovery operations."
        action={
          <button className="btn-secondary" onClick={loadConfiguration} disabled={configLoading}>
            {configLoading ? 'Refreshing…' : 'Refresh Configuration'}
          </button>
        }
      />

      {/* Zero Secrets Guarantee Notice */}
      <div className="notice info" style={{ marginBottom: '18px' }}>
        <b>Zero Secrets Exposure Guarantee:</b> Sensitive credentials (such as <code>AUTH_JWT_SECRET</code>, <code>MDU_API_KEY</code>, or database tokens) are strictly redacted by the backend and never exposed to the control plane.
      </div>

      {/* 01 System Configuration */}
      <div className="section-container">
        <SectionHeader
          number="01"
          eyebrow="ENVIRONMENT"
          title="System Configuration"
          detail="Live environment parameters and active persistence configuration (/admin/configuration)."
          action={
            <button className="btn-secondary" onClick={loadConfiguration} disabled={configLoading}>
              {configLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          }
        />

        {configLoading && <div className="notice info">Loading configuration report from /admin/configuration…</div>}
        {configError && <div className="notice error">Configuration error: {configError}</div>}

        {configData ? (
          <DataTable
            columns={['Setting / Variable', 'Configured State', 'Value / Redaction', 'Notes & Operational Constraints']}
            rows={configRows}
            empty="No configuration data available"
          />
        ) : (
          !configLoading && !configError && (
            <EmptyState title="No configuration report">
              Unable to retrieve configuration report from MASTERDB.
            </EmptyState>
          )
        )}
      </div>

      {/* 02 Store Snapshot Backup */}
      <div className="section-container">
        <SectionHeader
          number="02"
          eyebrow="DISASTER RECOVERY"
          title="Backup & Store Snapshots"
          detail="Application-level store export across bcaes_registry and canonical_repository (/admin/backup)."
          action={
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button className="btn-primary" onClick={handleCreateBackup} disabled={backupLoading}>
                {backupLoading ? 'Exporting…' : 'Export Store Backup Snapshot'}
              </button>
              {backupData && (
                <>
                  <button className="btn-secondary" onClick={handleCopySnapshot}>
                    Copy JSON
                  </button>
                  <button className="btn-secondary" onClick={handleDownloadSnapshot}>
                    Download JSON
                  </button>
                </>
              )}
            </div>
          }
        />

        <div className="notice info" style={{ marginBottom: '14px' }}>
          <b>Controlled Execution:</b> Backup snapshots are never generated automatically on page load. Generating a snapshot exports application records across configured stores and logs an authoritative audit entry.
        </div>

        {backupLoading && <div className="notice info">Exporting store snapshot from /admin/backup…</div>}
        {backupSuccessMessage && <div className="notice success">{backupSuccessMessage}</div>}
        {backupError && <div className="notice error">Backup error: {backupError}</div>}

        {backupData ? (
          <DataTable
            columns={['Store Name', 'Storage Mode', 'Exported Records Count', 'Status']}
            rows={backupStoreRows}
            empty="No stores in snapshot"
          />
        ) : (
          !backupLoading && (
            <EmptyState title="No backup snapshot generated this session">
              Click &quot;Export Store Backup Snapshot&quot; above to capture and download an application snapshot.
            </EmptyState>
          )
        )}
      </div>

      {/* 03 Snapshot Restore (Destructive Zone) */}
      <div className="section-container danger-zone">
        <SectionHeader
          number="03"
          eyebrow="DANGER ZONE"
          title="Snapshot Restore (Protected Recovery)"
          detail="Destructive overwrite operation directly targeting persistent storage (/admin/restore)."
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <b style={{ color: 'var(--danger)' }}>High-Risk Operation:</b>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Restoring a snapshot writes records directly to persistent storage and reloads cache memory. Active records will be overwritten.
            </p>
          </div>
          <button
            className={isRestoreOpen ? 'btn-secondary' : 'btn-danger'}
            onClick={() => setIsRestoreOpen(!isRestoreOpen)}
          >
            {isRestoreOpen ? 'Close Restore Console' : 'Initiate Snapshot Restore…'}
          </button>
        </div>

        {isRestoreOpen && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--danger-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--danger)' }}>
                Paste Snapshot JSON:
              </label>
              {backupData && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                  onClick={() => {
                    setRestoreJsonInput(JSON.stringify(backupData, null, 2));
                    setRestoreError(null);
                  }}
                >
                  Use Latest Exported Snapshot
                </button>
              )}
            </div>

            <textarea
              rows={8}
              value={restoreJsonInput}
              onChange={e => {
                setRestoreJsonInput(e.target.value);
                setRestoreError(null);
              }}
              placeholder='{ "exported_at": "...", "stores": { ... } }'
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '12px',
                padding: '8px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: '#ffffff',
                marginBottom: '12px',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <input
                type="checkbox"
                id="restoreConfirmCheck"
                checked={restoreConfirmed}
                onChange={e => setRestoreConfirmed(e.target.checked)}
                disabled={restoreLoading}
              />
              <label htmlFor="restoreConfirmCheck" style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}>
                I acknowledge that this action will overwrite existing records in persistent storage.
              </label>
            </div>

            {restoreLoading && <div className="notice info">Restoring snapshot to persistent stores…</div>}
            {restoreError && <div className="notice error">{restoreError}</div>}
            {restoreResult && (
              <div className="notice success">
                <b>Restore Successful:</b> {Object.entries(restoreResult.restored).map(([k, v]) => `${k}: ${v} record(s)`).join(', ')}
              </div>
            )}

            <button
              className="btn-danger"
              onClick={handleExecuteRestore}
              disabled={!restoreConfirmed || !restoreJsonInput.trim() || restoreLoading}
            >
              {restoreLoading ? 'Restoring Snapshot…' : 'Execute Restore'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

const copy: Record<string, [string, string]> = {
  governance: ['Dataset Governance', 'Package-scoped validation, certification, lineage, and retrieval governance controls.'],
  validation: ['Validation', 'Dataset schema and integrity validation gates.'],
  certification: ['Certification', 'MASTERDB enterprise ingestion certification decisions.'],
  retrieval: ['Retrieval Readiness', 'Retrieval readiness assessment and rule evaluations.'],
  lineage: ['Lineage & Provenance', 'Trace package relationships, derivation paths, and MDU provenance.'],
  audit: ['Audit & Replay', 'Traceable lifecycle events and deterministic replay verification.'],
  observability: ['Observability', 'Monitor service health, contracts, operational sync, and replay manifests.'],
  admin: ['Admin', 'Sovereign system configuration, backup snapshot, and controlled restore.'],
  shared: ['Shared Data Registry', 'Shared canonical datasets, consumer access, and service contracts.'],
  system: ['System Identity', 'Review sovereign runtime identity and service status.'],
};

export function Placeholder({ name, table }: { name: string; table?: string[] }) {
  const [title, description] = copy[name] ?? ['Information', ''];
  const isGovernanceScope = ['governance', 'validation', 'certification', 'retrieval', 'lineage'].includes(name);

  return (
    <>
      <PageHeader
        eyebrow="GOVERNANCE SPECIFICATION"
        title={title}
        description={description}
      />

      {name === 'governance' && (
        <div className="section-container" style={{ maxWidth: '840px', marginBottom: '20px' }}>
          <SectionHeader
            eyebrow="LIFECYCLE PIPELINE"
            title="Governance Progression"
            detail="Stepwise promotion through deterministic governance gates."
          />
          <div className="lifecycle-diagram">
            <div className="lifecycle-node">
              <span className="badge-dot badge-dot-info" />
              <span>REGISTERED</span>
            </div>
            <div className="lifecycle-arrow">↓</div>
            <div className="lifecycle-node">
              <span className="badge-dot badge-dot-warning" />
              <span>VALIDATED</span>
            </div>
            <div className="lifecycle-arrow">↓</div>
            <div className="lifecycle-node">
              <span className="badge-dot badge-dot-success" />
              <span>CERTIFIED</span>
            </div>
            <div className="lifecycle-arrow">↓</div>
            <div className="lifecycle-node">
              <span className="badge-dot badge-dot-info" />
              <span>KNOWLEDGE OBJECT</span>
            </div>
            <div className="lifecycle-arrow">↓</div>
            <div className="lifecycle-node" style={{ borderColor: 'var(--success)' }}>
              <span className="badge-dot badge-dot-success" />
              <span>RETRIEVAL READY</span>
            </div>
          </div>
        </div>
      )}

      {isGovernanceScope ? (
        <div className="section-container" style={{ maxWidth: '840px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Package-Scoped Governance Operations
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '18px' }}>
            In the MASTERDB architecture, governance controls (Validation, Certification, Lineage, Knowledge Objects, Retrieval Readiness, TANTRA Runtime, and Audit/Replay) execute strictly within the context of individual registered packages.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link to="/datasets" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Open Dataset Explorer ›
            </Link>
            <Link to="/datasets/pkg-beb07acd2d83" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Inspect Package pkg-beb07acd2d83 ›
            </Link>
            <Link to="/datasets/pkg-1a3be4021bc6" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Inspect Package pkg-1a3be4021bc6 ›
            </Link>
          </div>
        </div>
      ) : table ? (
        <div className="section-container">
          <DataTable columns={table} empty={`No ${title.toLowerCase()} entries available.`} />
        </div>
      ) : (
        <EmptyState title="Operational Surface Available">
          This functional area is governed under MASTERDB operations. Access it via the Control Plane navigation.
        </EmptyState>
      )}
    </>
  );
}

export function NotFound() {
  return (
    <>
      <PageHeader title="Page Not Found" description="The requested route is not part of the MASTERDB Control Plane." />
      <EmptyState title="Route Not Available">
        <Link to="/dashboard" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', marginTop: '12px' }}>
          Return to Dashboard
        </Link>
      </EmptyState>
    </>
  );
}

export function ApiNotice() {
  return <StatusBadge kind="warning">API not connected</StatusBadge>;
}
