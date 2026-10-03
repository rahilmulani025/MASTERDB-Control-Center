export interface HealthResponse {
  /** Service liveness status, e.g., "ok" */
  status: string;
}

export interface ReadinessResponse {
  /** Overall readiness status, e.g., "ok" or "degraded" */
  status: string;
  /** Individual subsystem checks, key = subsystem name, value = "ok" or an error string */
  checks: Record<string, string>;
}

/** Normalized API error used throughout the client */
export interface APIError {
  /** Human‑readable error message */
  message: string;
  /** HTTP status code when available */
  status?: number;
  /** Request path that caused the error */
  path?: string;
  /** Optional error type identifier from backend */
  type?: string;
  /** Any additional payload from the backend error response */
  detail?: unknown;
}

// Existing placeholder interfaces retained for compatibility with other pages
export interface Dataset { id: string; name?: string }
export interface Package { id: string; name?: string }
export interface ValidationResult { status?: string }
export interface CertificationResult { status?: string }
export interface PackageHistory { packageId: string }
export interface Lineage { packageId: string }
export interface RetrievalReadiness { status?: string }
export interface AuditResult { timestamp?: string }
export interface MDUResponse { status?: string }
export interface TantraRuntime { status?: string }

export interface DiscoveryResponse {
  /** Total number of packages returned */
  count: number;
  /** List of discovered packages */
  packages: DiscoveredPackage[];
}

export interface DiscoveredPackage {
  /** Unique package identifier */
  package_id: string;
  /** Dataset identifier this package belongs to */
  dataset_id: string;
  /** Version of the dataset */
  dataset_version: string;
  /** Schema version associated with the package */
  schema_version: string;
  /** Board classification */
  board: string;
  /** Medium classification */
  medium: string;
  /** Language of the dataset */
  language: string;
  /** Owner of the package */
  owner: string;
  /** Timestamp when the package was created */
  created_at: string;
  /** Timestamp of last update */
  updated_at: string;
  /** Lifecycle status */
  status: string;
  /** Transition history – optional */
  history?: PackageTransition[];
}

export interface PackageTransition {
  /** Transition identifier */
  transition_id: string;
  /** Previous status – may be omitted for initial registration */
  from_status?: string;
  /** New status after transition */
  to_status: string;
  /** Reason for the transition */
  reason: string;
  /** Actor who performed the transition */
  actor: string;
  /** Timestamp of the transition */
  timestamp: string;
}
export interface PackageDetail {
  package_id: string;
  dataset_id: string;
  dataset_version: string;
  schema_version: string;
  board: string;
  medium: string;
  language: string;
  owner: string;
  created_at: string;
  updated_at: string;
  status: string;
  history?: PackageTransition[];
}

export interface PackageHistory {
  package_id: string;
  history: PackageTransition[];
}

export interface ValidationRequest {
  dataset_path: string;
  metadata_path?: string | null;
  dataset_id?: string | null;
}

export interface ValidationStatusResponse {
  dataset_id: string;
  state: string;
  classification: string;
  integrity_score: number;
  eligible_for_masterdb: boolean;
}

export interface SchemaValidationDetail {
  column: string;
  expected?: string;
  actual?: string;
  status: string;
}

export interface SchemaValidationResult {
  score: number;
  details: SchemaValidationDetail[];
}

export interface CompletenessValidationResult {
  score: number;
  missing_cells: number;
}

export interface DuplicatesValidationResult {
  score: number;
  duplicate_rows: number;
  duplicate_percentage: number;
}

export interface ConsistencyValidationResult {
  score: number;
  issues: string[];
}

export interface MetadataValidationResult {
  score: number;
  missing_fields: string[];
}

export interface ProvenanceValidationResult {
  score: number;
  missing_fields: string[];
}

export interface IntegrityViolation {
  column: string;
  violations: number;
}

export interface IntegrityValidationResult {
  score: number;
  violations: IntegrityViolation[];
}

export interface ValidationResults {
  schema: SchemaValidationResult;
  completeness: CompletenessValidationResult;
  duplicates: DuplicatesValidationResult;
  consistency: ConsistencyValidationResult;
  metadata: MetadataValidationResult;
  provenance: ProvenanceValidationResult;
  integrity: IntegrityValidationResult;
}

export interface DatasetProfile {
  rows: number;
  columns: number;
  missing_values: number;
  duplicate_rows: number;
}

export interface AuditTrailEntry {
  from_state: string;
  to_state: string;
  rule: string;
  passed: boolean;
  reason: string;
}

export interface IngestionDecision {
  dataset_id: string;
  eligible_for_masterdb: boolean;
  state: string;
  classification: string;
  integrity_score: number;
  rejection_reasons: string[];
  audit_trail: AuditTrailEntry[];
}

export interface ValidationReportResponse {
  dataset_id: string;
  state: string;
  profile: DatasetProfile;
  validation_results: ValidationResults;
  risk_flags: string[];
  integrity_score: number;
  classification: string;
  recommendations: string[];
  metadata: Record<string, string>;
  audit_trail: AuditTrailEntry[];
  ingestion_decision?: IngestionDecision;
}

export interface ValidationResponse {
  dataset_id: string;
  state: string;
  report: ValidationReportResponse;
}

export interface CertificationRequest {
  dataset_id?: string | null;
  dataset_path?: string | null;
  metadata_path?: string | null;
}

export interface CertificationResponse {
  dataset_id: string;
  state: string;
  decision: IngestionDecision;
  report: ValidationReportResponse;
}

export interface MDUProvenanceSummary {
  source: string;
  reason?: string;
  dataset_id?: string;
  provenance?: unknown;
}

export interface PackageLineageResponse {
  package_id: string;
  knowledge_object_registered: boolean;
  knowledge_object_id?: string;
  knowledge_hash?: string;
  source_reference?: string | null;
  lineage_reference?: string | null;
  derivation_path?: string[];
  ancestors: string[];
  descendants: string[];
  known_gaps: string[];
  mdu_provenance?: MDUProvenanceSummary;
}

export interface MDUProvenanceEvent {
  id?: string;
  dataset_id?: string;
  event_type?: string;
  source_reference?: string | null;
  transformation_reference?: string | null;
  timestamp?: string;
  actor?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export type RetrievalStatus =
  | 'NOT_RETRIEVABLE'
  | 'PARTIALLY_RETRIEVABLE'
  | 'RETRIEVABLE'
  | 'CERTIFIED_RETRIEVABLE';

export interface RetrievalRuleResult {
  rule: string;
  passed: boolean;
  detail: string;
}

export interface RetrievalEvidence {
  package_id: string;
  status: RetrievalStatus;
  rules: RetrievalRuleResult[];
  corrective_actions: string[];
  generated_at: string;
}

export interface PackageAuditReport {
  package_id: string;
  complete: boolean;
  issues: string[];
  replay_consistent: boolean;
  replay_error?: string | null;
  transition_count: number;
}

export interface PackageReplayResult {
  package_id: string;
  replay_consistent: boolean;
  replayed_status?: string;
  replay_error?: string;
}

export interface KnowledgeObjectRegisterRequest {
  package_id: string;
  parent_package?: string | null;
  source_reference?: string | null;
  lineage_reference?: string | null;
  derivation_path?: string[];
}

export interface KnowledgeObject {
  knowledge_object_id: string;
  knowledge_hash: string;
  package_id: string;
  schema_version: string;
  parent_package?: string | null;
  child_packages: string[];
  source_reference?: string | null;
  lineage_reference?: string | null;
  derivation_path: string[];
  created_at: string;
}

export interface MDUSchemaField {
  name?: string;
  type?: string;
  nullable?: boolean;
  description?: string;
  constraints?: string[];
  [key: string]: unknown;
}

export interface MDUSchemaResponse {
  schema_version?: string;
  version?: string;
  dataset_id?: string;
  fields?: MDUSchemaField[] | Record<string, unknown>;
  columns?: MDUSchemaField[] | Record<string, unknown>;
  properties?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface MDUSchemaCompatibilityResponse {
  source: 'mdu-live' | 'placeholder' | string;
  compatible: boolean;
  reason: string;
  dataset_id?: string;
  mdu_schema_version?: string;
  local_schema_version?: string;
  negotiation?: 'exact_match' | 'minor_version_drift' | 'major_version_mismatch' | 'unknown' | string;
  known_gaps?: string[];
}

export interface TantraCertificationStatus {
  dataset_id: string;
  state: string;
  classification: string;
  integrity_score: number;
  eligible_for_masterdb: boolean;
}

export interface TantraRuntimeLookup {
  package: PackageDetail;
  lineage: PackageLineageResponse;
  retrieval_readiness: RetrievalEvidence;
  certification_status: TantraCertificationStatus | null;
}

export interface RuntimeIdentityResponse {
  service_name: string;
  version: string;
  constitutional_role: string;
  capabilities: string[];
  api_groups: Record<string, string>;
  auth: {
    method: string;
    token_endpoint: string;
    note: string;
  };
  health_check_url: string;
  readiness_check_url: string;
  openapi_url: string;
  replay_endpoints: Record<string, string>;
  status: string;
  note: string;
}

export interface SharedDatasetEntry {
  name: string;
  purpose: string;
  owner: string;
  consumers: string[];
  update_policy: string;
  lifecycle: string;
  schema_contract: string;
  mdu_contract: string;
  [key: string]: unknown;
}

export interface SharedRegistryResponse {
  count: number;
  datasets: SharedDatasetEntry[];
}

export interface SharedContractDetail {
  version: string;
  inputs: Record<string, string[]>;
  outputs: string;
  failure_behaviour?: string;
  upstream_authority?: string;
  mdu_sync_mechanism?: string;
  replay_mechanism?: string;
  [key: string]: unknown;
}

export interface SharedContractsResponse {
  count: number;
  contracts: Record<string, SharedContractDetail>;
}

export interface OperationalSyncResponse<T = Record<string, unknown>> {
  count: number;
  records: T[];
}

export interface ReplayCapability {
  name: string;
  endpoint: string;
  mechanism: string;
  current_replay_hash?: string;
  currently_passes?: boolean;
}

export interface ReplayRegistryManifestResponse {
  service_name: string;
  replay_capabilities: ReplayCapability[];
  status: string;
  note: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  actor: string;
  roles: string[];
  expires_at: string;
}

export interface AdminConfigItem {
  set?: boolean;
  format?: string;
  note?: string | null;
  value?: string;
  valid?: boolean;
  mode?: string;
}

export interface AdminConfigurationReport {
  AUTH_JWT_SECRET?: AdminConfigItem;
  MASTERDB_STORAGE_DIR?: AdminConfigItem;
  MASTERDB_DATABASE_URL?: AdminConfigItem;
  persistence?: {
    mode: string;
    note: string;
  };
  MDU_BASE_URL?: AdminConfigItem;
  MDU_API_KEY?: AdminConfigItem;
  PRAVAH_BHIV_INSIGHT_FLOW_BRIDGE?: AdminConfigItem;
  RATE_LIMIT_MAX_REQUESTS?: {
    value: string;
    valid: boolean;
  };
  RATE_LIMIT_WINDOW_SECONDS?: {
    value: string;
    valid: boolean;
  };
  [key: string]: unknown;
}

export interface AdminStoreSnapshot {
  persisted: boolean;
  records: unknown[];
}

export interface AdminBackupSnapshot {
  exported_at: string;
  stores: Record<string, AdminStoreSnapshot>;
}

export interface AdminRestoreResponse {
  restored: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────
// CONTROLLED INGESTION CONTRACT TYPES
// ─────────────────────────────────────────────────────────────

export type TargetDatabase =
  | 'VectorDB'
  | 'GraphDB'
  | 'MetadataDB'
  | 'DocumentDB'
  | 'TimeSeriesDB'
  | 'RelationalDB'
  | 'ArchiveDB'
  | 'AnalyticsDB';

export type SourceFormat = 'csv' | 'json' | 'xlsx' | 'pdf' | 'txt' | 'image' | string;

export interface IngestionJobStep {
  step: string;
  passed: boolean;
  detail?: string;
  at?: string;
  [key: string]: unknown;
}

export interface TargetDatabaseInfo {
  key: string;
  display_name: string;
  description: string;
  accepted_formats: string[];
  required_role: string;
  status: string;
  name?: string;
  availability?: string;
  permissions?: string[] | Record<string, unknown>;
  [key: string]: unknown;
}

export type DatabasesResponse = TargetDatabaseInfo[] | { databases: TargetDatabaseInfo[] };

export interface IngestionRequest {
  dataset_id: string;
  target_database: TargetDatabase | string;
  source_format: SourceFormat | string;
  package_id?: string | null;
  upload_id?: string | null;
  metadata?: Record<string, unknown>;
}

export type IngestionJobState =
  | 'PERSISTED'
  | 'REJECTED'
  | 'PARTIAL_PERSISTENCE'
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | string;

export interface IngestionJobMetadata {
  target_reference?: string;
  records_persisted?: number;
  [key: string]: unknown;
}

export interface IngestionJob {
  job_id: string;
  trace_id?: string;
  dataset_id?: string;
  target_database?: TargetDatabase | string;
  source_format?: SourceFormat | string;
  package_id?: string | null;
  upload_id?: string | null;
  actor?: string;
  roles?: string[];
  status?: IngestionJobState;
  state?: IngestionJobState;
  certification_state?: string;
  integrity_score?: number;
  steps?: IngestionJobStep[];
  rejection_reason?: string | null;
  failure_reason?: string | null;
  metadata?: IngestionJobMetadata;
  submitted_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
  detail?: unknown;
  [key: string]: unknown;
}

export type IngestionJobsResponse = IngestionJob[] | { jobs: IngestionJob[]; count?: number };

// ─────────────────────────────────────────────────────────────
// GOVERNED UPLOAD CONTRACT TYPES
// ─────────────────────────────────────────────────────────────

export type UploadStatus =
  | 'UPLOADED'
  | 'RECEIVED'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'REGISTERED'
  | 'INGESTED'
  | 'AVAILABLE'
  | 'REJECTED';

export interface UploadJobStep {
  step: string;
  passed: boolean;
  detail?: string;
  at?: string;
  [key: string]: unknown;
}

export interface UploadInitiationRequest {
  filename: string;
  content_type: string;
  file_size: number;
  checksum_sha256?: string | null;
  classification?: string | null;
  source_reference?: string | null;
  provenance_metadata?: Record<string, unknown>;
  schema_version?: string | null;
  product_source?: string | null;
  intended_use?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UploadInitiationResponse {
  upload_id: string;
  trace_id: string;
  status: UploadStatus | string;
  storage_path: string;
  max_size_bytes: number;
  allowed_content_types: string[];
  checksum_algorithm: string;
}

export interface UploadContentResponse {
  upload_id: string;
  status: UploadStatus | string;
  file_size_bytes: number;
}

export interface UploadValidationResponse {
  upload_id: string;
  status: UploadStatus | string;
  validation_passed: boolean;
  rejection_reason?: string | null;
  steps: UploadJobStep[];
}

export interface UploadJobTimestamps {
  uploaded_at?: string;
  received_at?: string | null;
  validated_at?: string | null;
  registered_at?: string | null;
  [key: string]: string | null | undefined;
}

export interface UploadJob {
  upload_id: string;
  status: UploadStatus | string;
  filename: string;
  content_type: string;
  file_size_bytes: number;
  actor: string;
  steps: UploadJobStep[];
  rejection_reason?: string | null;
  dataset_id?: string | null;
  package_id?: string | null;
  ingestion_job_id?: string | null;
  timestamps: UploadJobTimestamps;
  trace_id?: string;
  product_source?: string;
  [key: string]: unknown;
}

export type UploadStatusResponse = UploadJob;

export interface UploadListItem {
  upload_id: string;
  status: UploadStatus | string;
  filename: string;
  file_size_bytes: number;
  actor: string;
  product_source?: string | null;
  uploaded_at: string;
}

export interface UploadListResponse {
  count: number;
  uploads: UploadListItem[];
}

export interface UploadCancelRequest {
  reason: string;
}

export interface UploadCancelResponse {
  upload_id: string;
  status: 'REJECTED' | UploadStatus | string;
  rejection_reason?: string | null;
}

