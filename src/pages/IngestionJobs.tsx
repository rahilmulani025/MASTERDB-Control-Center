import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  PageHeader,
  SectionHeader,
  StatusBadge,
  SearchInput,
} from '../components/ui';
import type {
  IngestionJob,
  APIError,
  UploadJob,
  UploadListItem,
} from '../types/masterdb';
import { getIngestionJobs, getIngestionJob } from '../api/ingestion';
import {
  listUploadJobs,
  getUploadJob,
  cancelUploadJob,
} from '../api/upload';

function parseJobsError(err: unknown): { title: string; detail: string } {
  const apiErr = err as APIError;
  const status = apiErr?.status;
  const rawDetail =
    typeof apiErr?.detail === 'string'
      ? apiErr.detail
      : apiErr?.detail
        ? JSON.stringify(apiErr.detail, null, 2)
        : '';
  const message = apiErr?.message || 'Unknown error occurred.';

  const sanitize = (text: string) =>
    text.replace(/Bearer\s+[A-Za-z0-9-_.]+/gi, 'Bearer [REDACTED]');
  const cleanDetail = sanitize(rawDetail);

  if (status === 401) {
    return {
      title: 'Authentication required to perform this operation.',
      detail: cleanDetail || 'Bearer token missing, invalid, or expired.',
    };
  }

  if (status === 403) {
    return {
      title: 'You are not authorized to access jobs.',
      detail: cleanDetail || 'RBAC permission denied by MASTERDB backend.',
    };
  }

  if (status === 404) {
    return {
      title: 'Job Endpoint Not Found',
      detail: cleanDetail || 'The requested job route was not found on MASTERDB backend.',
    };
  }

  if (status && status >= 500) {
    return {
      title: 'MASTERDB Service Failure',
      detail: cleanDetail || `The MASTERDB backend encountered an internal error (HTTP ${status}).`,
    };
  }

  if (
    message.toLowerCase().includes('abort') ||
    message.toLowerCase().includes('failed to fetch') ||
    message.toLowerCase().includes('network')
  ) {
    return {
      title: 'MASTERDB API Unreachable',
      detail: 'Could not connect to MASTERDB backend. Check network connectivity or backend health.',
    };
  }

  return {
    title: sanitize(message),
    detail: cleanDetail,
  };
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function IngestionJobs() {
  const [activeTab, setActiveTab] = React.useState<'ingest' | 'upload'>('ingest');

  // ─── 1. Ingestion Jobs State ───────────────────────────────────────────────
  const [jobs, setJobs] = React.useState<IngestionJob[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<{ title: string; detail: string } | null>(null);

  // Ingestion Filters
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [targetFilter, setTargetFilter] = React.useState<string>('ALL');
  const [stateFilter, setStateFilter] = React.useState<string>('ALL');

  // Ingestion Inspected Job
  const [inspectedJob, setInspectedJob] = React.useState<IngestionJob | null>(null);

  // ─── 2. Upload Jobs State (GET /upload/jobs) ───────────────────────────────
  const [uploadJobs, setUploadJobs] = React.useState<UploadListItem[]>([]);
  const [uploadLoading, setUploadLoading] = React.useState<boolean>(true);
  const [uploadError, setUploadError] = React.useState<{ title: string; detail: string } | null>(null);

  // Upload Filters
  const [uploadSearchQuery, setUploadSearchQuery] = React.useState<string>('');
  const [uploadStatusFilter, setUploadStatusFilter] = React.useState<string>('ALL');

  // Upload Inspected Job (GET /upload/jobs/{upload_id})
  const [inspectedUploadJob, setInspectedUploadJob] = React.useState<UploadJob | null>(null);

  // Cancellation State
  const [cancellingUploadId, setCancellingUploadId] = React.useState<string | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = React.useState<string>('');
  const [isSubmittingCancel, setIsSubmittingCancel] = React.useState<boolean>(false);

  // Initial Load
  React.useEffect(() => {
    let active = true;

    getIngestionJobs()
      .then((data) => {
        if (active) {
          setJobs(data);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (active) {
          setError(parseJobsError(e));
          setLoading(false);
        }
      });

    listUploadJobs()
      .then((data) => {
        if (active) {
          setUploadJobs(data.uploads || []);
          setUploadLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (active) {
          setUploadError(parseJobsError(e));
          setUploadLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Refresh Ingestion Jobs
  const refreshIngestionJobs = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIngestionJobs();
      setJobs(data);
    } catch (e: unknown) {
      setError(parseJobsError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh Upload Jobs
  const refreshUploadJobs = React.useCallback(async () => {
    setUploadLoading(true);
    setUploadError(null);
    try {
      const data = await listUploadJobs({
        status: uploadStatusFilter !== 'ALL' ? uploadStatusFilter : undefined,
      });
      setUploadJobs(data.uploads || []);
    } catch (e: unknown) {
      setUploadError(parseJobsError(e));
    } finally {
      setUploadLoading(false);
    }
  }, [uploadStatusFilter]);

  const inspectJob = async (jobId: string) => {
    try {
      const detail = await getIngestionJob(jobId);
      setInspectedJob(detail);
    } catch {
      const existing = jobs.find((j) => j.job_id === jobId);
      if (existing) setInspectedJob(existing);
    }
  };

  const inspectUpload = async (uploadId: string) => {
    try {
      const detail = await getUploadJob(uploadId);
      setInspectedUploadJob(detail);
    } catch (e) {
      alert(`Could not fetch upload job details: ${String(e)}`);
    }
  };

  const handleExecuteCancel = async () => {
    if (!cancellingUploadId || !cancelReasonInput.trim()) return;
    setIsSubmittingCancel(true);
    try {
      await cancelUploadJob(cancellingUploadId, cancelReasonInput.trim());
      setCancellingUploadId(null);
      setCancelReasonInput('');
      refreshUploadJobs();
      if (inspectedUploadJob?.upload_id === cancellingUploadId) {
        inspectUpload(cancellingUploadId);
      }
    } catch (e) {
      alert(`Cancellation failed: ${String(e)}`);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Derive unique target databases for filter dropdown
  const targetOptions = React.useMemo(() => {
    const targets = new Set<string>();
    jobs.forEach((j) => {
      if (j.target_database) targets.add(String(j.target_database));
    });
    return Array.from(targets).sort();
  }, [jobs]);

  const filteredJobs = React.useMemo(() => {
    return jobs.filter((j) => {
      if (targetFilter !== 'ALL' && String(j.target_database) !== targetFilter) {
        return false;
      }
      const st = (j.state || j.status || 'PENDING').toUpperCase();
      if (stateFilter !== 'ALL' && st !== stateFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = j.job_id?.toLowerCase().includes(q);
        const matchesDataset = j.dataset_id?.toLowerCase().includes(q);
        const matchesPackage = j.package_id?.toLowerCase().includes(q);
        const matchesActor = j.actor?.toLowerCase().includes(q);
        if (!matchesId && !matchesDataset && !matchesPackage && !matchesActor) {
          return false;
        }
      }
      return true;
    });
  }, [jobs, targetFilter, stateFilter, searchQuery]);

  const filteredUploadJobs = React.useMemo(() => {
    return uploadJobs.filter((u) => {
      if (uploadStatusFilter !== 'ALL' && u.status !== uploadStatusFilter) {
        return false;
      }
      if (uploadSearchQuery.trim()) {
        const q = uploadSearchQuery.toLowerCase();
        const matchesId = u.upload_id.toLowerCase().includes(q);
        const matchesFile = u.filename.toLowerCase().includes(q);
        const matchesActor = u.actor.toLowerCase().includes(q);
        if (!matchesId && !matchesFile && !matchesActor) {
          return false;
        }
      }
      return true;
    });
  }, [uploadJobs, uploadStatusFilter, uploadSearchQuery]);

  return (
    <>
      <PageHeader
        eyebrow="JOB & UPLOAD REGISTRY"
        title="Operations & Ingestion Jobs"
        description="Monitor controlled ingestion job status, routing decisions, and real-time governed file upload sessions from MASTERDB."
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                refreshIngestionJobs();
                refreshUploadJobs();
              }}
              disabled={loading || uploadLoading}
            >
              {loading || uploadLoading ? 'Refreshing…' : '↻ Refresh All'}
            </button>
            <Link to="/ingestion" className="btn-primary" style={{ textDecoration: 'none' }}>
              Initiate Ingestion / Upload ›
            </Link>
          </div>
        }
      />

      {/* ─── Tabs Switcher ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          type="button"
          className={activeTab === 'ingest' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('ingest')}
        >
          Controlled Ingestion Jobs ({jobs.length})
        </button>
        <button
          type="button"
          className={activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('upload')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>Governed Upload Jobs ({uploadJobs.length})</span>
          <span className="badge-dot badge-dot-success" />
        </button>
      </div>

      {activeTab === 'ingest' ? (
        <>
          {/* ─── Ingestion Filter Bar ────────────────────────────────────────── */}
          <div
            className="section-container"
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: '20px',
            }}
          >
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by Job ID, Dataset, Package…"
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Target:</span>
              <select
                value={targetFilter}
                onChange={(e) => setTargetFilter(e.target.value)}
                style={{
                  padding: '6px 10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background: '#ffffff',
                }}
              >
                <option value="ALL">All Targets</option>
                {targetOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>State:</span>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                style={{
                  padding: '6px 10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background: '#ffffff',
                }}
              >
                <option value="ALL">All States</option>
                <option value="PERSISTED">PERSISTED</option>
                <option value="PARTIAL_PERSISTENCE">PARTIAL_PERSISTENCE</option>
                <option value="REJECTED">REJECTED</option>
                <option value="PENDING">PENDING</option>
                <option value="RUNNING">RUNNING</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>

            <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748b' }}>
              Showing {filteredJobs.length} of {jobs.length} jobs
            </span>
          </div>

          {error ? (
            <div className="notice error">
              <b>{error.title}</b>
              {error.detail && <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>{error.detail}</p>}
            </div>
          ) : loading ? (
            <div className="notice info">Loading controlled ingestion jobs…</div>
          ) : (
            <div className="section-container">
              <SectionHeader
                eyebrow="JOB REGISTRY"
                title="Controlled Ingestion Execution Log"
                detail="Authoritative job states and target database routing records (GET /ingest/jobs)."
              />

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Job ID</th>
                      <th>Dataset ID</th>
                      <th>Package ID</th>
                      <th>Target DB</th>
                      <th>Format</th>
                      <th>State</th>
                      <th>Created At</th>
                      <th>Actor</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="table-empty">
                          No controlled ingestion jobs match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredJobs.map((job) => {
                        const st = (job.status || job.state || 'PENDING').toUpperCase();
                        return (
                          <tr key={job.job_id}>
                            <td className="code-val">{job.job_id}</td>
                            <td className="code-val" style={{ fontWeight: 600 }}>
                              {job.dataset_id || '—'}
                            </td>
                            <td className="code-val">{job.package_id || '—'}</td>
                            <td>{String(job.target_database || '—')}</td>
                            <td style={{ textTransform: 'uppercase' }}>{String(job.source_format || '—')}</td>
                            <td>
                              <StatusBadge
                                kind={
                                  st === 'PERSISTED' || st === 'COMPLETED'
                                    ? 'success'
                                    : st === 'PARTIAL_PERSISTENCE'
                                      ? 'warning'
                                      : st === 'FAILED' || st === 'REJECTED'
                                        ? 'danger'
                                        : 'info'
                                }
                              >
                                {st}
                              </StatusBadge>
                            </td>
                            <td>{job.created_at ? new Date(job.created_at).toLocaleString() : '—'}</td>
                            <td>{job.actor || 'system'}</td>
                            <td>
                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => inspectJob(job.job_id)}
                                style={{ fontSize: '11px', padding: '3px 8px' }}
                              >
                                Inspect Evidence
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* ─── Upload Jobs Filter Bar (GET /upload/jobs) ────────────────────── */}
          <div
            className="section-container"
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: '20px',
            }}
          >
            <SearchInput
              value={uploadSearchQuery}
              onChange={(e) => setUploadSearchQuery(e.target.value)}
              placeholder="Filter by Upload ID, Filename, Actor…"
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Status:</span>
              <select
                value={uploadStatusFilter}
                onChange={(e) => setUploadStatusFilter(e.target.value)}
                style={{
                  padding: '6px 10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background: '#ffffff',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="UPLOADED">UPLOADED</option>
                <option value="RECEIVED">RECEIVED</option>
                <option value="VALIDATING">VALIDATING</option>
                <option value="VALIDATED">VALIDATED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="REGISTERED">REGISTERED</option>
                <option value="INGESTED">INGESTED</option>
                <option value="AVAILABLE">AVAILABLE</option>
              </select>
            </div>

            <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748b' }}>
              Showing {filteredUploadJobs.length} of {uploadJobs.length} upload jobs
            </span>
          </div>

          {uploadError ? (
            <div className="notice error">
              <b>{uploadError.title}</b>
              {uploadError.detail && <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>{uploadError.detail}</p>}
            </div>
          ) : uploadLoading ? (
            <div className="notice info">Loading governed upload jobs from GET /upload/jobs…</div>
          ) : (
            <div className="section-container">
              <SectionHeader
                eyebrow="UPLOAD SUBSYSTEM"
                title="Governed File Upload Jobs"
                detail="Real-time staging and validation records from GET /upload/jobs."
              />

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Upload ID</th>
                      <th>Filename</th>
                      <th>File Size</th>
                      <th>Actor</th>
                      <th>Product Source</th>
                      <th>Status</th>
                      <th>Uploaded At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUploadJobs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="table-empty">
                          No governed upload jobs found.
                        </td>
                      </tr>
                    ) : (
                      filteredUploadJobs.map((uj) => (
                        <tr key={uj.upload_id}>
                          <td className="code-val">{uj.upload_id}</td>
                          <td style={{ fontWeight: 600 }}>{uj.filename}</td>
                          <td>{formatBytes(uj.file_size_bytes)}</td>
                          <td>{uj.actor}</td>
                          <td>{uj.product_source || '—'}</td>
                          <td>
                            <StatusBadge
                              kind={uj.status === 'VALIDATED' || uj.status === 'AVAILABLE' ? 'success' : uj.status === 'REJECTED' ? 'danger' : 'info'}
                            >
                              {uj.status}
                            </StatusBadge>

                          </td>
                          <td>{uj.uploaded_at ? new Date(uj.uploaded_at).toLocaleString() : '—'}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => inspectUpload(uj.upload_id)}
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                            >
                              Inspect Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Ingestion Job Inspector Modal ─────────────────────────────────── */}
      {inspectedJob && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                  Controlled Ingestion Job Detail: {inspectedJob.job_id}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Authoritative record from GET /ingest/jobs/&#123;job_id&#125;
                </span>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setInspectedJob(null)}
                style={{ fontSize: '16px', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            {/* PARTIAL_PERSISTENCE banner */}
            {(inspectedJob.status === 'PARTIAL_PERSISTENCE' || inspectedJob.state === 'PARTIAL_PERSISTENCE') && (
              <div className="notice warning" style={{ marginBottom: '14px' }}>
                <b>Partial Persistence:</b> Data was persisted, but the upload lifecycle could not be completed.
              </div>
            )}

            {/* REJECTED banner */}
            {(inspectedJob.status === 'REJECTED' || inspectedJob.state === 'REJECTED') && (
              <div className="notice error" style={{ marginBottom: '14px' }}>
                <b>Ingestion Rejected:</b> {inspectedJob.rejection_reason || 'Rejection reason not specified.'}
              </div>
            )}

            {/* PERSISTED banner */}
            {(inspectedJob.status === 'PERSISTED' || inspectedJob.state === 'PERSISTED') && (
              <div className="notice success" style={{ marginBottom: '14px' }}>
                <b>Data Persisted:</b> Data has been committed into {String(inspectedJob.target_database)}.
                {inspectedJob.metadata?.target_reference && (
                  <div style={{ marginTop: '4px' }}>
                    Target Reference: <code className="code-val">{inspectedJob.metadata.target_reference}</code>
                  </div>
                )}
                {inspectedJob.metadata?.records_persisted !== undefined && (
                  <div>
                    Records Persisted: <b>{inspectedJob.metadata.records_persisted}</b>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Job ID:</span>
                <span className="code-val" style={{ fontWeight: 600 }}>{inspectedJob.job_id}</span>
              </div>
              {inspectedJob.trace_id && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748b' }}>Trace ID:</span>
                  <span className="code-val">{inspectedJob.trace_id}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Dataset ID:</span>
                <span className="code-val" style={{ fontWeight: 600 }}>{inspectedJob.dataset_id}</span>
              </div>
              {inspectedJob.package_id && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748b' }}>Package ID:</span>
                  <span className="code-val">{inspectedJob.package_id}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Target Database:</span>
                <span style={{ fontWeight: 600 }}>{String(inspectedJob.target_database)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Source Format:</span>
                <span className="code-val" style={{ textTransform: 'uppercase' }}>{String(inspectedJob.source_format)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Job State:</span>
                <StatusBadge
                  kind={
                    inspectedJob.status === 'PERSISTED' || inspectedJob.state === 'PERSISTED' || inspectedJob.state === 'COMPLETED'
                      ? 'success'
                      : inspectedJob.status === 'PARTIAL_PERSISTENCE' || inspectedJob.state === 'PARTIAL_PERSISTENCE'
                        ? 'warning'
                        : inspectedJob.status === 'REJECTED' || inspectedJob.state === 'REJECTED' || inspectedJob.state === 'FAILED'
                          ? 'danger'
                          : 'info'
                  }
                >
                  {inspectedJob.status || inspectedJob.state}
                </StatusBadge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Actor:</span>
                <span>{inspectedJob.actor || 'system'}</span>
              </div>
              {inspectedJob.roles && inspectedJob.roles.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748b' }}>Server Assigned Roles:</span>
                  <span>{inspectedJob.roles.join(', ')}</span>
                </div>
              )}
              {inspectedJob.certification_state && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748b' }}>Certification State:</span>
                  <span>{inspectedJob.certification_state} (Score: {inspectedJob.integrity_score ?? '—'})</span>
                </div>
              )}
              {inspectedJob.submitted_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748b' }}>Submitted At:</span>
                  <span>{new Date(inspectedJob.submitted_at).toLocaleString()}</span>
                </div>
              )}
              {inspectedJob.completed_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748b' }}>Completed At:</span>
                  <span>{new Date(inspectedJob.completed_at).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Pipeline Execution Step Audit */}
            {inspectedJob.steps && inspectedJob.steps.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600 }}>
                  Pipeline Step Execution Audit Trail
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {inspectedJob.steps.map((step, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        background: step.passed ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${step.passed ? '#bbf7d0' : '#fecaca'}`,
                        borderRadius: '6px',
                        fontSize: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: step.passed ? '#15803d' : '#b91c1c' }}>
                        {step.passed ? '✓' : '✕'} {step.step}
                      </span>
                      <span style={{ color: '#64748b' }}>
                        {step.detail || (step.passed ? 'PASSED' : 'FAILED')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setInspectedJob(null)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Upload Job Inspector Modal (GET /upload/jobs/{upload_id}) ─────── */}
      {inspectedUploadJob && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                  Governed Upload Job: {inspectedUploadJob.upload_id}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Authoritative Record from GET /upload/jobs/&#123;upload_id&#125;
                </span>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setInspectedUploadJob(null)}
                style={{ fontSize: '16px', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Filename:</span>
                <span style={{ fontWeight: 600 }}>{inspectedUploadJob.filename}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>File Size:</span>
                <span>{formatBytes(inspectedUploadJob.file_size_bytes)} ({inspectedUploadJob.file_size_bytes} bytes)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Content Type:</span>
                <span className="code-val">{inspectedUploadJob.content_type}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Lifecycle Status:</span>
                <StatusBadge
                  kind={inspectedUploadJob.status === 'VALIDATED' || inspectedUploadJob.status === 'AVAILABLE' ? 'success' : inspectedUploadJob.status === 'REJECTED' ? 'danger' : 'info'}
                >
                  {inspectedUploadJob.status}
                </StatusBadge>

              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Actor:</span>
                <span>{inspectedUploadJob.actor}</span>
              </div>
              {inspectedUploadJob.rejection_reason && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>Rejection Reason:</span>
                  <span style={{ color: '#dc2626' }}>{inspectedUploadJob.rejection_reason}</span>
                </div>
              )}
              {inspectedUploadJob.dataset_id && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748b' }}>Linked Dataset ID:</span>
                  <span className="code-val">{inspectedUploadJob.dataset_id}</span>
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div style={{ marginBottom: '16px' }}>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600 }}>Lifecycle Timestamps</h5>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '4px' }}>
                  <span style={{ color: '#64748b' }}>Uploaded At:</span>{' '}
                  <b>{inspectedUploadJob.timestamps?.uploaded_at ? new Date(inspectedUploadJob.timestamps.uploaded_at).toLocaleString() : '—'}</b>
                </div>
                <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '4px' }}>
                  <span style={{ color: '#64748b' }}>Received At:</span>{' '}
                  <b>{inspectedUploadJob.timestamps?.received_at ? new Date(inspectedUploadJob.timestamps.received_at).toLocaleString() : '—'}</b>
                </div>
                <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '4px' }}>
                  <span style={{ color: '#64748b' }}>Validated At:</span>{' '}
                  <b>{inspectedUploadJob.timestamps?.validated_at ? new Date(inspectedUploadJob.timestamps.validated_at).toLocaleString() : '—'}</b>
                </div>
                <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '4px' }}>
                  <span style={{ color: '#64748b' }}>Registered At:</span>{' '}
                  <b>{inspectedUploadJob.timestamps?.registered_at ? new Date(inspectedUploadJob.timestamps.registered_at).toLocaleString() : '—'}</b>
                </div>
              </div>
            </div>

            {/* Step History */}
            {inspectedUploadJob.steps && inspectedUploadJob.steps.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600 }}>Step Execution Audit Log</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {inspectedUploadJob.steps.map((step, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        background: step.passed ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${step.passed ? '#bbf7d0' : '#fecaca'}`,
                        borderRadius: '6px',
                        fontSize: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: step.passed ? '#15803d' : '#b91c1c' }}>
                        {step.passed ? '✓' : '✕'} {step.step}
                      </span>
                      <span style={{ color: '#64748b' }}>{step.detail || 'Completed'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              {inspectedUploadJob.status !== 'REJECTED' && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setCancellingUploadId(inspectedUploadJob.upload_id);
                  }}
                  style={{ color: '#dc2626' }}
                >
                  Cancel Upload Session
                </button>
              )}
              {inspectedUploadJob.status === 'VALIDATED' && (
                <Link
                  to="/ingestion"
                  className="btn-primary"
                  style={{ textDecoration: 'none' }}
                >
                  Continue to Ingestion ›
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Cancel Upload Dialog ─────────────────────────────────────────── */}
      {cancellingUploadId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a' }}>
              Cancel Upload: {cancellingUploadId}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              Calls <code>DELETE /upload/jobs/&#123;upload_id&#125;</code> to terminate the session and purge staging files.
            </p>

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Reason for Cancellation:
            </label>
            <input
              type="text"
              value={cancelReasonInput}
              onChange={(e) => setCancelReasonInput(e.target.value)}
              placeholder="e.g. Operator cancelled staging session"
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '18px',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCancellingUploadId(null)}
                disabled={isSubmittingCancel}
              >
                Dismiss
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleExecuteCancel}
                disabled={isSubmittingCancel || !cancelReasonInput.trim()}
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
              >
                {isSubmittingCancel ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
