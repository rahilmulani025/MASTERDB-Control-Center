import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  PageHeader,
  SectionHeader,
  StatusBadge,
  SearchInput,
} from '../components/ui';
import type {
  DiscoveredPackage,
  TargetDatabaseInfo,
  IngestionJob,
  IngestionRequest,
  ValidationStatusResponse,
  APIError,
  UploadInitiationResponse,
  UploadValidationResponse,
  UploadJob,
} from '../types/masterdb';
import { getDiscoveredPackages } from '../api/discovery';
import { getValidationStatus } from '../api/validation';
import {
  getDatabases,
  createIngestion,
  getIngestionJob,
} from '../api/ingestion';

import {
  initiateUpload,
  uploadFileContent,
  validateUpload,
  getUploadJob,
  cancelUploadJob,
  computeFileSha256,
} from '../api/upload';

/** Supported backend content types and extension mappings */
export const ALLOWED_CONTENT_TYPES: Record<string, { label: string; extensions: string[] }> = {
  'text/csv': { label: 'CSV Document', extensions: ['.csv'] },
  'application/json': { label: 'JSON Data', extensions: ['.json'] },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    label: 'Excel Spreadsheet',
    extensions: ['.xlsx'],
  },
  'application/pdf': { label: 'PDF Document', extensions: ['.pdf'] },
  'text/plain': { label: 'Plain Text', extensions: ['.txt'] },
  'image/png': { label: 'PNG Image', extensions: ['.png'] },
  'image/jpeg': { label: 'JPEG Image', extensions: ['.jpg', '.jpeg'] },
  'image/gif': { label: 'GIF Image', extensions: ['.gif'] },
  'application/zip': { label: 'ZIP Archive', extensions: ['.zip'] },
};

export const MAX_UPLOAD_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

/** Format bytes into readable string */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/** Helper to extract database name identifier */
function getDbKey(db?: TargetDatabaseInfo | null): string {
  if (!db) return '';
  return String(db.name || db.key || db.display_name || '');
}

/** Helper to extract database display name */
function getDbDisplayName(db?: TargetDatabaseInfo | null): string {
  if (!db) return '';
  return String(db.display_name || db.name || db.key || '');
}

/** Resolve file MIME type using extension fallback */
function resolveFileContentType(file: File): string {
  const mime = file.type.toLowerCase().trim();
  if (mime && Object.keys(ALLOWED_CONTENT_TYPES).includes(mime)) {
    return mime;
  }
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  for (const [typeKey, config] of Object.entries(ALLOWED_CONTENT_TYPES)) {
    if (config.extensions.includes(ext)) {
      return typeKey;
    }
  }
  return mime || 'application/octet-stream';
}

/** Parse and normalize error messages from backend API calls */
function parseApiError(err: unknown): { title: string; detail: string; status?: number } {
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

  if (status === 400) {
    return {
      title: 'Invalid Request (400)',
      detail: cleanDetail || message || 'The request was rejected by backend validation.',
      status,
    };
  }

  if (status === 401) {
    return {
      title: 'Authentication Required (401)',
      detail: cleanDetail || 'Bearer token missing, invalid, or expired. Please re-authenticate.',
      status,
    };
  }

  if (status === 403) {
    return {
      title: 'Authorization Denied (403)',
      detail: cleanDetail || 'RBAC permission denied by MASTERDB backend. Your role does not permit this operation.',
      status,
    };
  }

  if (status === 404) {
    return {
      title: 'Resource Not Found (404)',
      detail: cleanDetail || 'The requested upload session, dataset, or ingestion job was not found.',
      status,
    };
  }

  if (status === 409) {
    return {
      title: 'State Conflict (409)',
      detail: cleanDetail || 'Invalid upload lifecycle transition or resource state conflict.',
      status,
    };
  }

  if (status === 422) {
    return {
      title: 'Unprocessable Entity (422)',
      detail: cleanDetail || message || 'MASTERDB rejected the request format.',
      status,
    };
  }

  if (status && status >= 500) {
    return {
      title: `MASTERDB Service Failure (HTTP ${status})`,
      detail: cleanDetail || 'The MASTERDB backend service encountered an internal server error.',
      status,
    };
  }

  if (
    message.toLowerCase().includes('abort') ||
    message.toLowerCase().includes('failed to fetch') ||
    message.toLowerCase().includes('network')
  ) {
    return {
      title: 'MASTERDB API Unreachable',
      detail: 'Could not connect to MASTERDB backend. Check network connectivity or backend status.',
      status,
    };
  }

  return {
    title: sanitize(message),
    detail: cleanDetail,
    status,
  };
}

/** Check if job reached terminal state */
function isTerminalState(state?: string): boolean {
  if (!state) return false;
  const upper = state.toUpperCase();
  return (
    upper === 'PERSISTED' ||
    upper === 'REJECTED' ||
    upper === 'PARTIAL_PERSISTENCE' ||
    upper === 'COMPLETED' ||
    upper === 'FAILED'
  );
}

export function ControlledIngestion() {
  // ─── Mode Selector: Upload File Subsystem vs Discovered Dataset ────────────
  const [activeTab, setActiveTab] = React.useState<'upload' | 'catalog'>('upload');

  // ─── 1. Target Databases State ─────────────────────────────────────────────
  const [databases, setDatabases] = React.useState<TargetDatabaseInfo[]>([]);
  const [dbLoading, setDbLoading] = React.useState<boolean>(true);
  const [dbError, setDbError] = React.useState<string | null>(null);

  // ─── 2. Discovered Datasets State ──────────────────────────────────────────
  const [packages, setPackages] = React.useState<DiscoveredPackage[]>([]);
  const [pkgLoading, setPkgLoading] = React.useState<boolean>(true);
  const [pkgError, setPkgError] = React.useState<string | null>(null);
  const [searchFilter, setSearchFilter] = React.useState<string>('');

  // ─── 3. Selected Ingestion Parameters ──────────────────────────────────────
  const [selectedDatasetId, setSelectedDatasetId] = React.useState<string>('');
  const [selectedPackageId, setSelectedPackageId] = React.useState<string>('');
  const [selectedTargetDb, setSelectedTargetDb] = React.useState<string>('');
  const [selectedFormat, setSelectedFormat] = React.useState<string>('csv');

  // ─── 4. Pre-submission Certification Context ──────────────────────────────
  const [certStatus, setCertStatus] = React.useState<ValidationStatusResponse | null>(null);

  // ─── 5. Submission & Ingestion Job Execution State ─────────────────────────
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [submitError, setSubmitError] = React.useState<{ title: string; detail: string; status?: number } | null>(null);
  const [activeJob, setActiveJob] = React.useState<IngestionJob | null>(null);
  const [isPolling, setIsPolling] = React.useState<boolean>(false);

  // ─── 6. REAL FILE UPLOAD SUBSYSTEM STATE (Phase 3) ─────────────────────────
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [fileSha256, setFileSha256] = React.useState<string>('');
  const [isComputingHash, setIsComputingHash] = React.useState<boolean>(false);

  // Upload governance form fields
  const [classification, setClassification] = React.useState<string>('internal');
  const [sourceReference, setSourceReference] = React.useState<string>('');
  const [productSource, setProductSource] = React.useState<string>('MASTERDB-CONTROL-CENTER');
  const [intendedUse, setIntendedUse] = React.useState<string>('governed_ingestion');
  const [schemaVersion, setSchemaVersion] = React.useState<string>('1.0.0');

  // Upload execution state
  const [isUploading, setIsUploading] = React.useState<boolean>(false);
  const [uploadProgressMsg, setUploadProgressMsg] = React.useState<string>('');
  const [uploadInitResponse, setUploadInitResponse] = React.useState<UploadInitiationResponse | null>(null);
  const [validationResponse, setValidationResponse] = React.useState<UploadValidationResponse | null>(null);
  const [uploadJobDetail, setUploadJobDetail] = React.useState<UploadJob | null>(null);
  const [uploadError, setUploadError] = React.useState<{ title: string; detail: string; status?: number } | null>(null);

  // Cancellation state
  const [showCancelModal, setShowCancelModal] = React.useState<boolean>(false);
  const [cancelReason, setCancelReason] = React.useState<string>('');
  const [isCancelling, setIsCancelling] = React.useState<boolean>(false);

  // Refs for safe async operations
  const pollingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = React.useRef<boolean>(true);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, []);

  // ─── Initial Data Load ─────────────────────────────────────────────────────
  React.useEffect(() => {
    let active = true;

    getDatabases()
      .then((data) => {
        if (active) {
          setDatabases(data);
          if (data.length > 0) {
            setSelectedTargetDb(getDbKey(data[0]));
          }
          setDbLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          const parsed = parseApiError(err);
          setDbError(`${parsed.title}: ${parsed.detail || 'Failed to retrieve database configuration.'}`);
          setDbLoading(false);
        }
      });

    getDiscoveredPackages()
      .then((res) => {
        if (active) {
          setPackages(res?.packages || []);
          setPkgLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          const parsed = parseApiError(err);
          setPkgError(`${parsed.title}: ${parsed.detail || 'Failed to retrieve discovered packages.'}`);
          setPkgLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // ─── Refresh Databases Callback ────────────────────────────────────────────
  const refreshDatabases = React.useCallback(async () => {
    setDbLoading(true);
    setDbError(null);
    try {
      const data = await getDatabases();
      if (isMountedRef.current) {
        setDatabases(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const parsed = parseApiError(err);
        setDbError(`${parsed.title}: ${parsed.detail || 'Failed to retrieve database configuration.'}`);
      }
    } finally {
      if (isMountedRef.current) {
        setDbLoading(false);
      }
    }
  }, []);

  // ─── Refresh Packages Callback ─────────────────────────────────────────────
  const refreshPackages = React.useCallback(async () => {
    setPkgLoading(true);
    setPkgError(null);
    try {
      const res = await getDiscoveredPackages();
      if (isMountedRef.current) {
        setPackages(res?.packages || []);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const parsed = parseApiError(err);
        setPkgError(`${parsed.title}: ${parsed.detail || 'Failed to retrieve discovered packages.'}`);
      }
    } finally {
      if (isMountedRef.current) {
        setPkgLoading(false);
      }
    }
  }, []);

  // Fetch certification context when dataset selection changes
  React.useEffect(() => {
    if (!selectedDatasetId) {
      return;
    }
    let active = true;
    getValidationStatus(selectedDatasetId)
      .then((data) => {
        if (active && isMountedRef.current) {
          setCertStatus(data);
        }
      })
      .catch(() => {
        if (active && isMountedRef.current) {
          setCertStatus(null);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedDatasetId]);

  // ─── FILE SELECTION HANDLER (STEP 1) ───────────────────────────────────────
  const handleFileSelection = async (file: File | null) => {
    setFileError(null);
    setUploadError(null);
    setFileSha256('');
    setUploadInitResponse(null);
    setValidationResponse(null);
    setUploadJobDetail(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // 1. Check empty file
    if (file.size === 0) {
      setFileError('The selected file is empty (0 bytes). Upload rejected.');
      setSelectedFile(null);
      return;
    }

    // 2. Check maximum size (500 MB)
    if (file.size > MAX_UPLOAD_FILE_SIZE) {
      setFileError(
        `File size (${formatBytes(file.size)}) exceeds the maximum allowed limit of ${formatBytes(MAX_UPLOAD_FILE_SIZE)} (500 MB).`
      );
      setSelectedFile(null);
      return;
    }

    // 3. Check allowed extension & MIME
    const resolvedMime = resolveFileContentType(file);
    const isValidMime = Object.keys(ALLOWED_CONTENT_TYPES).includes(resolvedMime);
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidExt = Object.values(ALLOWED_CONTENT_TYPES).some((c) => c.extensions.includes(ext));

    if (!isValidMime && !isValidExt) {
      setFileError(
        `File type not allowed. Supported formats: ${Object.values(ALLOWED_CONTENT_TYPES)
          .map((c) => c.extensions.join(', '))
          .join(', ')}`
      );
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setSourceReference(file.name);

    // Compute Web Crypto SHA-256 for non-huge files (<= 100MB) automatically
    if (file.size <= 100 * 1024 * 1024) {
      setIsComputingHash(true);
      try {
        const hash = await computeFileSha256(file);
        if (isMountedRef.current) {
          setFileSha256(hash);
        }
      } catch (e) {
        console.warn('Could not compute SHA-256 client side:', e);
      } finally {
        if (isMountedRef.current) {
          setIsComputingHash(false);
        }
      }
    }
  };

  // Manual compute SHA-256 trigger
  const handleComputeHash = async () => {
    if (!selectedFile) return;
    setIsComputingHash(true);
    try {
      const hash = await computeFileSha256(selectedFile);
      setFileSha256(hash);
    } catch (e) {
      alert(`Failed to compute SHA-256: ${String(e)}`);
    } finally {
      setIsComputingHash(false);
    }
  };

  // ─── EXECUTE REAL UPLOAD WORKFLOW (STEPS 3 & 4) ───────────────────────────
  const handleExecuteUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadProgressMsg('Initiating upload session with MASTERDB backend (POST /upload)…');

    try {
      const resolvedMime = resolveFileContentType(selectedFile);

      // STEP 3A: POST /upload (Initiation)
      const initRes = await initiateUpload({
        filename: selectedFile.name,
        content_type: resolvedMime,
        file_size: selectedFile.size,
        checksum_sha256: fileSha256 || undefined,
        classification: classification || undefined,
        source_reference: sourceReference || undefined,
        product_source: productSource || undefined,
        intended_use: intendedUse || undefined,
        schema_version: schemaVersion || undefined,
      });

      if (!isMountedRef.current) return;
      setUploadInitResponse(initRes);
      setUploadProgressMsg(`Transferring raw binary stream to /upload/${initRes.upload_id}/content…`);

      // STEP 3B: POST /upload/{upload_id}/content (Send raw bytes)
      await uploadFileContent(initRes.upload_id, selectedFile, resolvedMime);

      if (!isMountedRef.current) return;
      setUploadProgressMsg('File content transferred successfully. Validating staged file (POST /upload/.../validate)…');

      // STEP 4: POST /upload/{upload_id}/validate
      const valRes = await validateUpload(initRes.upload_id);

      if (!isMountedRef.current) return;
      setValidationResponse(valRes);

      // Fetch full upload job details
      const jobDetail = await getUploadJob(initRes.upload_id);
      if (isMountedRef.current) {
        setUploadJobDetail(jobDetail);
      }

      if (valRes.validation_passed) {
        setUploadProgressMsg('Validation passed! File is staged and certified.');
        if (jobDetail.dataset_id) {
          setSelectedDatasetId(jobDetail.dataset_id);
        } else {
          setSelectedDatasetId(initRes.upload_id);
        }
      } else {
        setUploadProgressMsg('Upload validation failed. Review rejection reasons below.');
        setUploadError({
          title: 'Upload Validation Failed',
          detail: valRes.rejection_reason || 'Backend integrity check failed for the uploaded file.',
        });
      }
    } catch (err) {
      if (isMountedRef.current) {
        const parsed = parseApiError(err);
        setUploadError(parsed);
      }
    } finally {
      if (isMountedRef.current) {
        setIsUploading(false);
      }
    }
  };

  // ─── CANCEL UPLOAD (DELETE /upload/jobs/{upload_id}) ──────────────────────
  const handleCancelUpload = async () => {
    const uploadId = uploadInitResponse?.upload_id || uploadJobDetail?.upload_id;
    if (!uploadId || !cancelReason.trim()) return;

    setIsCancelling(true);
    try {
      const res = await cancelUploadJob(uploadId, cancelReason.trim());
      setShowCancelModal(false);
      setCancelReason('');
      if (isMountedRef.current) {
        const updated = await getUploadJob(uploadId);
        setUploadJobDetail(updated);
        setUploadError({
          title: 'Upload Session Rejected (Cancelled)',
          detail: `Upload session ${uploadId} was cancelled by operator and moved to REJECTED. Reason: ${res.rejection_reason || cancelReason}`,
        });
      }
    } catch (err) {
      const parsed = parseApiError(err);
      alert(`Cancellation failed: ${parsed.title}\n${parsed.detail}`);
    } finally {
      if (isMountedRef.current) {
        setIsCancelling(false);
      }
    }
  };

  // ─── Poll Job Status ───────────────────────────────────────────────────────
  const pollJobStatus = React.useCallback((jobId: string) => {
    setIsPolling(true);
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      if (!isMountedRef.current) return;
      attempts += 1;
      try {
        const updated = await getIngestionJob(jobId);
        if (isMountedRef.current) {
          setActiveJob(updated);
          const state = updated.state || updated.status;
          if (isTerminalState(state) || attempts >= maxAttempts) {
            setIsPolling(false);
            return;
          }
        }
      } catch {
        // continue polling until max attempts
      }

      if (isMountedRef.current && attempts < maxAttempts) {
        pollingTimerRef.current = setTimeout(poll, 2000);
      } else if (isMountedRef.current) {
        setIsPolling(false);
      }
    };

    pollingTimerRef.current = setTimeout(poll, 1500);
  }, []);

  // ─── CONTROLLED INGESTION SUBMISSION (POST /ingest) ───────────────────────
  const handleSubmitIngestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId) {
      setSubmitError({
        title: 'Validation Error',
        detail: 'Please specify a Dataset ID or complete a file upload before submitting.',
      });
      return;
    }
    if (!selectedTargetDb) {
      setSubmitError({
        title: 'Validation Error',
        detail: 'Please select a Target Database from the authoritative database registry.',
      });
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setActiveJob(null);

    const selectedDb = databases.find((d) => getDbKey(d) === selectedTargetDb);
    const acceptedFormats = selectedDb?.accepted_formats || ['csv', 'json'];
    const fileExt = selectedFile ? selectedFile.name.split('.').pop()?.toLowerCase() : '';
    const formatToUse = selectedFormat || (fileExt && acceptedFormats.includes(fileExt) ? fileExt : acceptedFormats[0]) || 'csv';

    const linkedUploadId = uploadInitResponse?.upload_id || uploadJobDetail?.upload_id || null;

    const payload: IngestionRequest = {
      dataset_id: selectedDatasetId.trim(),
      target_database: selectedTargetDb,
      source_format: formatToUse,
      package_id: selectedPackageId.trim() || null,
      upload_id: linkedUploadId,
      metadata: {
        submitted_by: 'MASTERDB Control Center',
        submitted_at: new Date().toISOString(),
        trace_id: uploadInitResponse?.trace_id || undefined,
      },
    };

    try {
      const job = await createIngestion(payload);
      if (isMountedRef.current) {
        setActiveJob(job);
        pollJobStatus(job.job_id);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setSubmitError(parseApiError(err));
      }
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="INGESTION SUBSYSTEM"
        title="Controlled Ingestion & Governed File Upload"
        description="Execute authoritative file uploads and controlled ingestion into MASTERDB target databases with cryptographic integrity and state verification."
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/ingestion/jobs" className="btn-secondary" style={{ textDecoration: 'none' }}>
              View All Jobs ›
            </Link>
          </div>
        }
      />

      {/* ─── Governed Upload Subsystem Capability Banner ─────────────────── */}
      <div
        className="section-container"
        style={{
          background: '#f8fafc',
          borderColor: '#93c5fd',
          marginBottom: '20px',
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#dbeafe',
              color: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 'bold',
              flexShrink: 0,
            }}
          >
            ⚡
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                MASTERDB Governed Upload Subsystem (Phase 3 Active)
              </h4>
              <span className="badge success">LIVE BACKEND INTEGRATION</span>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              Real two-phase file transport is now active on the MASTERDB backend: Session Initiation (<code>POST /upload</code>),
              Raw Binary Stream (<code>POST /upload/&#123;id&#125;/content</code>), and Checksum Verification (<code>POST /upload/&#123;id&#125;/validate</code>).
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge info">Session Initiation: POST /upload</span>
              <span className="badge info">Raw Binary Content: POST /upload/&#123;id&#125;/content</span>
              <span className="badge info">Cryptographic Validation: POST /upload/&#123;id&#125;/validate</span>
              <span className="badge info">Max Size: 500 MB</span>
              <span className="badge success">RBAC Bearer Auth: Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── WORKFLOW MODE SWITCHER TABS ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          type="button"
          className={activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('upload')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>📁 Governed File Upload (New Subsystem)</span>
          <span className="badge-dot badge-dot-success" />
        </button>
        <button
          type="button"
          className={activeTab === 'catalog' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('catalog')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>📚 Discovered Dataset Catalog</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(360px, 1.2fr)', gap: '24px' }}>
        {/* ─── LEFT COLUMN: WORKFLOW STEPS ─────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {activeTab === 'upload' ? (
            <>
              {/* ─── STEP 1: SELECT FILE ─────────────────────────────────────── */}
              <div className="section-container" style={{ borderLeft: '4px solid #2563eb' }}>
                <SectionHeader
                  number="1"
                  eyebrow="FILE INGESTION BOUNDARY"
                  title="STEP 1 — Select Local File"
                  detail="Choose a file from your machine for governed transfer into the MASTERDB staging boundary."
                />

                {/* Dropzone & File Picker */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileSelection(e.dataTransfer.files[0]);
                    }
                  }}
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '28px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelection(e.target.files[0]);
                      }
                    }}
                    accept={Object.values(ALLOWED_CONTENT_TYPES)
                      .flatMap((c) => c.extensions)
                      .join(',')}
                  />
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
                    Click to select file or drag & drop here
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                    Accepted: CSV, JSON, XLSX, PDF, TXT, PNG, JPEG, GIF, ZIP (Max 500 MB)
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Browse Local Storage
                  </button>
                </div>

                {fileError && (
                  <div className="notice error" style={{ marginTop: '14px' }}>
                    <b>File Validation Error:</b> {fileError}
                  </div>
                )}

                {selectedFile && !fileError && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '12px 16px',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#065f46' }}>
                        ✓ Selected: {selectedFile.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#047857' }}>
                        Size: {formatBytes(selectedFile.size)} | Content-Type: {resolveFileContentType(selectedFile)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => handleFileSelection(null)}
                      style={{ color: '#047857' }}
                    >
                      Change File
                    </button>
                  </div>
                )}
              </div>

              {/* ─── STEP 2: REVIEW FILE METADATA & GOVERNANCE ─────────────── */}
              {selectedFile && !fileError && (
                <div className="section-container" style={{ borderLeft: '4px solid #0284c7' }}>
                  <SectionHeader
                    number="2"
                    eyebrow="GOVERNANCE METADATA"
                    title="STEP 2 — Review File Metadata & Checksum"
                    detail="Review file parameters and optional governance metadata prior to initiation."
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Filename
                      </label>
                      <input
                        type="text"
                        value={selectedFile.name}
                        disabled
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          background: '#f1f5f9',
                          fontSize: '12px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Content-Type (MIME)
                      </label>
                      <input
                        type="text"
                        value={resolveFileContentType(selectedFile)}
                        disabled
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          background: '#f1f5f9',
                          fontSize: '12px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        File Size (Bytes)
                      </label>
                      <input
                        type="text"
                        value={`${selectedFile.size} bytes (${formatBytes(selectedFile.size)})`}
                        disabled
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          background: '#f1f5f9',
                          fontSize: '12px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Classification
                      </label>
                      <select
                        value={classification}
                        onChange={(e) => setClassification(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '12px',
                          background: '#fff',
                        }}
                      >
                        <option value="internal">internal</option>
                        <option value="public">public</option>
                        <option value="restricted">restricted</option>
                        <option value="confidential">confidential</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Product Source
                      </label>
                      <input
                        type="text"
                        value={productSource}
                        onChange={(e) => setProductSource(e.target.value)}
                        placeholder="e.g. FIN/VANA, NCERT, MASTERDB"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Intended Use
                      </label>
                      <input
                        type="text"
                        value={intendedUse}
                        onChange={(e) => setIntendedUse(e.target.value)}
                        placeholder="e.g. analytics, ingestion, vectorization"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Schema Version
                      </label>
                      <input
                        type="text"
                        value={schemaVersion}
                        onChange={(e) => setSchemaVersion(e.target.value)}
                        placeholder="e.g. 1.0.0"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      />
                    </div>
                  </div>

                  {/* Cryptographic SHA-256 Checksum calculation */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '12px 14px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        SHA-256 Cryptographic Checksum (Web Crypto):
                      </span>
                      {isComputingHash ? (
                        <span style={{ fontSize: '12px', color: '#0284c7' }}>Computing hash…</span>
                      ) : !fileSha256 ? (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={handleComputeHash}
                          style={{ fontSize: '11px', padding: '2px 6px' }}
                        >
                          Calculate Checksum
                        </button>
                      ) : null}
                    </div>
                    <div
                      className="code-val"
                      style={{
                        wordBreak: 'break-all',
                        fontSize: '12px',
                        color: fileSha256 ? '#0f172a' : '#94a3b8',
                      }}
                    >
                      {isComputingHash
                        ? 'Computing SHA-256 using window.crypto.subtle…'
                        : fileSha256 || 'Optional / Not calculated yet'}
                    </div>
                  </div>

                  {/* Explicit Upload Initiation Trigger */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleExecuteUpload}
                      disabled={isUploading}
                      style={{ minWidth: '180px' }}
                    >
                      {isUploading ? 'Executing Upload…' : '⬆ Initiate & Upload File'}
                    </button>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Explicit operator action required. Will call <code>POST /upload</code> then stream raw bytes.
                    </span>
                  </div>
                </div>
              )}

              {/* ─── STEP 3 & 4: UPLOAD & VALIDATE PROGRESS ─────────────────── */}
              {(isUploading || uploadInitResponse || validationResponse) && (
                <div className="section-container" style={{ borderLeft: '4px solid #10b981' }}>
                  <SectionHeader
                    number="3"
                    eyebrow="EXECUTION & VALIDATION"
                    title="STEPS 3 & 4 — Transfer & Staging Validation"
                    detail="Live backend response from session initiation, raw streaming, and cryptographic validation."
                  />

                  {uploadProgressMsg && (
                    <div className="notice info" style={{ marginBottom: '14px' }}>
                      {uploadProgressMsg}
                    </div>
                  )}

                  {uploadError && (
                    <div className="notice error" style={{ marginBottom: '14px' }}>
                      <b>{uploadError.title}:</b> {uploadError.detail}
                    </div>
                  )}

                  {uploadInitResponse && (
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '14px',
                        marginBottom: '16px',
                        fontSize: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Upload ID:</span>
                        <span className="code-val" style={{ fontWeight: 600 }}>
                          {uploadInitResponse.upload_id}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Trace ID:</span>
                        <span className="code-val">{uploadInitResponse.trace_id}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Storage Staging Path:</span>
                        <span className="code-val">{uploadInitResponse.storage_path}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Upload Status:</span>
                        <StatusBadge kind={validationResponse?.validation_passed ? 'success' : 'info'}>
                          {validationResponse?.status || uploadInitResponse.status}
                        </StatusBadge>
                      </div>
                    </div>
                  )}

                  {/* Validation Steps Checklist */}
                  {validationResponse && (
                    <div style={{ marginTop: '12px' }}>
                      <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600 }}>
                        Validation Checklist (POST /upload/&#123;upload_id&#125;/validate)
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {validationResponse.steps?.map((step, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              background: step.passed ? '#f0fdf4' : '#fef2f2',
                              border: `1px solid ${step.passed ? '#bbf7d0' : '#fecaca'}`,
                              borderRadius: '6px',
                              fontSize: '12px',
                            }}
                          >
                            <span style={{ fontWeight: 600, color: step.passed ? '#15803d' : '#b91c1c' }}>
                              {step.passed ? '✓' : '✕'} {step.step}
                            </span>
                            <span style={{ color: '#64748b' }}>{step.detail || (step.passed ? 'PASSED' : 'FAILED')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* ─── CATALOG SELECTION (Original Workflow) ─────────────────────── */
            <div className="section-container">
              <SectionHeader
                number="1"
                eyebrow="SOURCE SELECTION"
                title="Select Available Dataset"
                detail="Choose an existing dataset registered in the MASTERDB discovery registry."
                action={
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={refreshPackages}
                    disabled={pkgLoading}
                  >
                    {pkgLoading ? 'Refreshing…' : '↻ Refresh Datasets'}
                  </button>
                }
              />

              {pkgError ? (
                <div className="notice error">
                  <b>Error loading datasets:</b> {pkgError}
                </div>
              ) : pkgLoading ? (
                <div className="notice info">Loading registered datasets…</div>
              ) : (
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <SearchInput
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Search datasets by ID, board, medium, owner…"
                    />
                  </div>

                  <div className="table-wrap" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Select</th>
                          <th>Dataset ID</th>
                          <th>Package ID</th>
                          <th>Board / Medium</th>
                          <th>Owner</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {packages.map((pkg) => {
                          const isSelected = selectedDatasetId === pkg.dataset_id;
                          return (
                            <tr
                              key={pkg.package_id}
                              style={{
                                background: isSelected ? '#eff6ff' : undefined,
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                setSelectedDatasetId(pkg.dataset_id);
                                setSelectedPackageId(pkg.package_id);
                              }}
                            >
                              <td>
                                <input
                                  type="radio"
                                  name="selectedDataset"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedDatasetId(pkg.dataset_id);
                                    setSelectedPackageId(pkg.package_id);
                                  }}
                                />
                              </td>
                              <td className="code-val" style={{ fontWeight: 600 }}>
                                {pkg.dataset_id}
                              </td>
                              <td className="code-val">{pkg.package_id}</td>
                              <td>
                                {pkg.board} / {pkg.medium}
                              </td>
                              <td>{pkg.owner}</td>
                              <td>
                                <StatusBadge kind="info">{pkg.status}</StatusBadge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── TARGET DATABASE SELECTION ─────────────────────────────────── */}
          <div className="section-container">
            <SectionHeader
              number={activeTab === 'upload' ? '5' : '2'}
              eyebrow="DESTINATION"
              title="Target Database Routing"
              detail="Select an authoritative destination database from GET /databases."
              action={
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={refreshDatabases}
                  disabled={dbLoading}
                >
                  {dbLoading ? 'Refreshing…' : '↻ Refresh Databases'}
                </button>
              }
            />

            {dbError ? (
              <div className="notice error">
                <b>Database Configuration Error:</b> {dbError}
              </div>
            ) : dbLoading ? (
              <div className="notice info">Loading authoritative database configuration…</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {databases.map((db) => {
                  const key = getDbKey(db);
                  const isSelected = selectedTargetDb === key;
                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedTargetDb(key)}
                      style={{
                        padding: '14px',
                        border: `2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                        borderRadius: '8px',
                        background: isSelected ? '#eff6ff' : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                          {getDbDisplayName(db)}
                        </span>
                        {isSelected && <span className="badge success">Selected</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                        {db.description || 'Enterprise managed data target.'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569' }}>
                        Formats: {db.accepted_formats?.join(', ') || 'All'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                        Role: <code>{db.required_role || 'open'}</code>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dynamic Format Selector derived from selected target database */}
            {selectedTargetDb && (
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Source Format (Dynamically Derived from Target Capability):
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(databases.find((d) => getDbKey(d) === selectedTargetDb)?.accepted_formats || ['csv', 'json']).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      className={selectedFormat === fmt ? 'btn-primary' : 'btn-secondary'}
                      style={{ fontSize: '12px', padding: '4px 12px', textTransform: 'uppercase' }}
                      onClick={() => setSelectedFormat(fmt)}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT COLUMN: REVIEW, DISPATCH & EVIDENCE ────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Dispatch Review Panel */}
          <div className="section-container" style={{ borderTop: '3px solid #2563a6' }}>
            <SectionHeader
              eyebrow="DISPATCH REVIEW"
              title="Controlled Ingestion Dispatch"
              detail="Verify parameters before issuing authoritative POST /ingest call."
            />

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '14px',
                marginBottom: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Dataset / Upload Ref:</span>
                <span className="code-val" style={{ fontWeight: 600, color: '#0f172a' }}>
                  {selectedDatasetId || (selectedFile ? selectedFile.name : '— (Please select/upload)')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Target Database:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {selectedTargetDb || '— (Please select)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Source Format:</span>
                <span className="code-val" style={{ textTransform: 'uppercase', fontWeight: 600 }}>
                  {selectedFormat}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Linked Upload ID:</span>
                <span className="code-val">
                  {uploadInitResponse?.upload_id || uploadJobDetail?.upload_id || 'None (Direct catalog)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Certification Context:</span>
                <span>
                  {certStatus ? (
                    <StatusBadge kind={certStatus.eligible_for_masterdb ? 'success' : 'warning'}>
                      {certStatus.state}
                    </StatusBadge>
                  ) : (
                    <StatusBadge kind="neutral">NOT CERTIFIED / UNKNOWN</StatusBadge>
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Upload Status:</span>
                <StatusBadge kind={validationResponse?.validation_passed ? 'success' : 'info'}>
                  {validationResponse?.status || (selectedFile ? 'FILE_SELECTED' : 'NO_FILE')}
                </StatusBadge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Authentication:</span>
                <span style={{ color: '#16845b', fontWeight: 600 }}>Bearer JWT (Authoritative)</span>
              </div>
              {fileSha256 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748b' }}>SHA-256:</span>
                  <span className="code-val" style={{ fontSize: '10px' }}>
                    {fileSha256.slice(0, 16)}…
                  </span>
                </div>
              )}
            </div>

            {submitError && (
              <div className="notice error" style={{ marginBottom: '16px' }}>
                <b>{submitError.title}</b>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>{submitError.detail}</div>
              </div>
            )}

            {/* Ingestion Submit Action */}
            <form onSubmit={handleSubmitIngestion} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={
                  submitting ||
                  !selectedTargetDb ||
                  (!selectedDatasetId && !validationResponse?.validation_passed)
                }
                style={{ width: '100%', height: '38px' }}
              >
                {submitting ? 'Dispatching Ingestion…' : '⚡ Execute Controlled Ingestion (POST /ingest)'}
              </button>

              {uploadInitResponse && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCancelModal(true)}
                  style={{ width: '100%', color: '#b91c1c' }}
                >
                  Cancel Upload Session
                </button>
              )}
            </form>
          </div>

          {/* ─── ACTIVE JOB STATUS & EVIDENCE (STEP 6) ──────────────────────── */}
          {activeJob && (
            <div className="section-container" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <SectionHeader
                eyebrow="JOB EXECUTION"
                title="STEP 6 — Job Status & Evidence"
                detail="Real-time execution status and evidence record."
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Job ID:</span>
                  <span className="code-val" style={{ fontWeight: 600 }}>{activeJob.job_id}</span>
                </div>
                {activeJob.trace_id && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Trace ID:</span>
                    <span className="code-val">{activeJob.trace_id}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>State:</span>
                  <StatusBadge
                    kind={
                      activeJob.status === 'PERSISTED' || activeJob.state === 'PERSISTED' || activeJob.state === 'COMPLETED'
                        ? 'success'
                        : activeJob.status === 'PARTIAL_PERSISTENCE' || activeJob.state === 'PARTIAL_PERSISTENCE'
                          ? 'warning'
                          : activeJob.status === 'REJECTED' || activeJob.state === 'REJECTED' || activeJob.state === 'FAILED'
                            ? 'danger'
                            : 'info'
                    }
                  >
                    {activeJob.status || activeJob.state || 'PENDING'}
                  </StatusBadge>
                </div>

                {/* Specific callouts for PERSISTED / PARTIAL_PERSISTENCE / REJECTED */}
                {(activeJob.status === 'PERSISTED' || activeJob.state === 'PERSISTED') && (
                  <div className="notice success" style={{ marginTop: '6px' }}>
                    <b>Persistence Verified:</b> Data is permanently persisted into {String(activeJob.target_database)}.
                    {activeJob.metadata?.target_reference && (
                      <div style={{ marginTop: '4px' }}>
                        Target Ref: <code className="code-val">{activeJob.metadata.target_reference}</code>
                      </div>
                    )}
                    {activeJob.metadata?.records_persisted !== undefined && (
                      <div>
                        Records Persisted: <b>{activeJob.metadata.records_persisted}</b>
                      </div>
                    )}
                  </div>
                )}

                {(activeJob.status === 'PARTIAL_PERSISTENCE' || activeJob.state === 'PARTIAL_PERSISTENCE') && (
                  <div className="notice warning" style={{ marginTop: '6px' }}>
                    <b>Partial Persistence Warning:</b> Data was persisted, but the upload lifecycle could not be completed.
                  </div>
                )}

                {(activeJob.status === 'REJECTED' || activeJob.state === 'REJECTED') && (
                  <div className="notice error" style={{ marginTop: '6px' }}>
                    <b>Ingestion Rejected:</b> {activeJob.rejection_reason || 'Rejection reason not provided.'}
                  </div>
                )}

                {/* Step verification checklist */}
                {activeJob.steps && activeJob.steps.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <h5 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 600 }}>
                      Pipeline Execution Steps
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {activeJob.steps.map((step, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '6px 10px',
                            background: step.passed ? '#f0fdf4' : '#fef2f2',
                            border: `1px solid ${step.passed ? '#bbf7d0' : '#fecaca'}`,
                            borderRadius: '4px',
                            fontSize: '11px',
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

                {isPolling && (
                  <div style={{ fontSize: '11px', color: '#8b5cf6', marginTop: '4px' }}>
                    Polling /ingest/jobs/{activeJob.job_id}…
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── CANCEL UPLOAD MODAL ───────────────────────────────────────────── */}
      {showCancelModal && (
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
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a' }}>
              Confirm Upload Cancellation
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              This will invoke <code>DELETE /upload/jobs/&#123;upload_id&#125;</code> on the MASTERDB backend,
              abort the session, and clean up backend staging files.
            </p>

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Reason for Cancellation (Required):
            </label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Operator aborted transfer / incorrect file selected"
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
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
              >
                Keep Upload
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCancelUpload}
                disabled={isCancelling || !cancelReason.trim()}
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
              >
                {isCancelling ? 'Cancelling…' : 'Confirm Cancel Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
