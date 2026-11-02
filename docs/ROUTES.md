# MASTERDB Control Center — Frontend Route Directory

> Complete inventory and reference of all client-side routes in the MASTERDB Control Center.

---

## 1. Route Map Summary

All routes are nested within the root layout `<AppShell>`, which provides the persistent navigation sidebar, system health indicator, and breadcrumb header.

| Route Path | View Component | Operational Type | Live Backend APIs Used |
|---|---|---|---|
| `/` | `Navigate` (Redirect) | Read-Only | None (Redirects to `/dashboard`) |
| `/dashboard` | `Dashboard` | Read-Only | `GET /health`, `GET /ready` |
| `/datasets` | `Datasets` | Read-Only | `GET /discovery/packages` |
| `/datasets/:datasetId` | `DatasetDetails` | Read + Controlled Mutation | 14 Package, Validation, MDU, and TANTRA APIs |
| `/ingestion` | `ControlledIngestion` | Controlled Mutation | `GET /databases`, `POST /upload`, `POST /upload/{id}/content`, `POST /upload/{id}/validate`, `POST /ingest` |
| `/ingestion/jobs` | `IngestionJobs` | Read-Only | `GET /ingest/jobs`, `GET /ingest/jobs/{id}`, `GET /databases/{key}/records/{id}` |
| `/observability` | `Observability` | Read-Only | `GET /health`, `GET /ready`, `GET /metrics`, `GET /runtime/identity`, `GET /replay-registry/manifest` |
| `/admin` | `Admin` | Read + Controlled Mutation | `POST /auth/token`, `GET /admin/configuration`, `GET /admin/backup`, `POST /admin/restore` |
| `/admin/system` | `Admin` | Read + Controlled Mutation | Same as `/admin` |
| `/admin/shared-data` | `SharedDataAdminView` | Read-Only | `GET /shared/registry`, `GET /shared/contracts` |
| `/governance` | `GovernanceOverview` | Read-Only | `GET /discovery/packages` |
| `/governance/validation` | `ValidationView` | Read + Controlled Mutation | `GET /discovery/packages`, `GET /status/{id}`, `GET /report/{id}`, `POST /validate` |
| `/governance/certification` | `CertificationView` | Read + Controlled Mutation | `GET /discovery/packages`, `GET /status/{id}`, `GET /tantra/certification/{id}`, `POST /certify` |
| `/lineage` | `LineageView` | Read-Only | `GET /discovery/packages`, `GET /packages/{id}/lineage`, `GET /mdu/provenance/{id}` |
| `/governance/retrieval` | `RetrievalReadinessView` | Read-Only | `GET /discovery/packages`, `GET /packages/{id}/retrieval`, `GET /tantra/packages/{id}/retrieval-readiness` |
| `/audit` | `AuditView` | Read-Only | `GET /discovery/packages`, `GET /packages/{id}/audit`, `GET /packages/{id}/replay` |
| `*` | `NotFound` | Read-Only | None (404 Fallback) |

---

## 2. Route Specifications

### `/dashboard`
- **Component:** `Dashboard`
- **Purpose:** System control-plane landing page. Provides immediate operational status of the MASTERDB backend cluster, storage subsystems, and certification engines.
- **APIs:**
  - `GET /health` — Liveness status
  - `GET /ready` — Subsystem readiness matrix
- **Interactions:** Auto-refreshes on mount; includes direct action buttons to browse datasets or trigger ingestion.

---

### `/datasets`
- **Component:** `Datasets`
- **Purpose:** Sovereign Dataset Catalogue. Displays all discoverable packages in the registry.
- **APIs:**
  - `GET /discovery/packages` — Paginated catalogue of packages
- **Interactions:** Search filter by package name/ID; sorting by creation timestamp and record count; click navigation to `/datasets/:datasetId`.

---

### `/datasets/:datasetId`
- **Component:** `DatasetDetails`
- **Purpose:** Comprehensive 360-degree governance inspection and operational management for a specific package.
- **Identifier Mapping:** `:datasetId` in the URL corresponds to the physical `package_id`. The logical `dataset_id` is parsed from the package response.
- **APIs (Read):**
  - `GET /packages/{package_id}`
  - `GET /packages/{package_id}/history`
  - `GET /packages/{package_id}/lineage`
  - `GET /packages/{package_id}/retrieval`
  - `GET /packages/{package_id}/audit`
  - `GET /packages/{package_id}/replay`
  - `GET /status/{dataset_id}`
  - `GET /report/{dataset_id}`
  - `GET /mdu/provenance/{dataset_id}`
  - `GET /mdu/schema/{dataset_id}`
  - `GET /mdu/schema-compatibility/{dataset_id}`
  - `GET /tantra/certification/{dataset_id}`
  - `GET /tantra/packages/{package_id}/retrieval-readiness`
  - `GET /tantra/packages/{package_id}/runtime`
- **APIs (Controlled Mutation):**
  - `POST /validate` — Run validation evaluation
  - `POST /certify` — Request MASTERDB certification
  - `POST /packages/{package_id}/knowledge-object` — Register Knowledge Object

---

### `/ingestion`
- **Component:** `ControlledIngestion`
- **Purpose:** 4-step wizard for controlled dataset ingestion into sovereign target databases.
- **Workflow:**
  1. File selection & browser-side SHA-256 computation.
  2. Upload session initialization (`POST /upload`).
  3. Binary octet-stream upload (`POST /upload/{id}/content`).
  4. Pre-ingestion validation (`POST /upload/{id}/validate`).
  5. Dynamic target DB capability selection (`GET /databases`).
  6. Final review & ingestion dispatch (`POST /ingest`).
- **APIs:**
  - `GET /databases` — Dynamic database capability matrix
  - `POST /upload` — Session creation
  - `POST /upload/{upload_id}/content` — Binary transfer
  - `POST /upload/{upload_id}/validate` — Pre-validation
  - `POST /ingest` — Submission to ingestion service
  - `GET /ingest/jobs/{job_id}` — Polling job status
  - `GET /databases/{database_key}/records/{dataset_id}` — Direct target read-back verification

---

### `/ingestion/jobs`
- **Component:** `IngestionJobs`
- **Purpose:** Ingestion job history monitor and persistence proof inspector.
- **APIs:**
  - `GET /ingest/jobs` — Complete list of ingestion execution records
  - `GET /ingest/jobs/{job_id}` — Individual job detail modal
  - `GET /databases/{database_key}/records/{dataset_id}` — Live persistence record reader
- **Features:** Status filtering (`PERSISTED`, `FAILED`, `PROCESSING`), trace ID inspection, and live record inspection modal.

---

### `/observability`
- **Component:** `Observability`
- **Purpose:** System-wide telemetry, runtime identity, and operational sync monitoring.
- **APIs:**
  - `GET /health` & `GET /ready`
  - `GET /metrics`
  - `GET /runtime/identity`
  - `GET /replay-registry/manifest`
  - `GET /shared/registry` & `GET /shared/contracts`
  - `GET /parikshak/review-references` & `GET /niyantran/task-state`

---

### `/admin` & `/admin/system`
- **Component:** `Admin`
- **Purpose:** Administrative operations panel protected by `bhiv-admin` Bearer token.
- **APIs:**
  - `POST /auth/token` — Bearer token acquisition
  - `GET /admin/configuration` — Sanitized configuration compliance report
  - `GET /admin/backup` — Export full JSON system snapshot (User-triggered)
  - `POST /admin/restore` — Destructive state restoration (Protected with acknowledgement gate)

---

### `/governance`
- **Component:** `GovernanceOverview`
- **Purpose:** Sovereign dataset governance control plane. Displays progression diagram and searchable inventory of registered packages with 1-click links to validation, certification, and lineage views.
- **APIs:** `GET /discovery/packages`

---

### `/governance/validation`
- **Component:** `ValidationView`
- **Purpose:** On-demand deterministic validation execution and profile inspection.
- **APIs:** `GET /discovery/packages`, `GET /status/{id}`, `GET /report/{id}`, `POST /validate`

---

### `/governance/certification`
- **Component:** `CertificationView`
- **Purpose:** Formal certification authority interface with dual MASTERDB and TANTRA runtime status indicators.
- **APIs:** `GET /discovery/packages`, `GET /status/{id}`, `GET /tantra/certification/{id}`, `POST /certify`

---

### `/lineage`
- **Component:** `LineageView`
- **Purpose:** Ancestor/descendant dependency walk and canonical MDU provenance audit trail.
- **APIs:** `GET /discovery/packages`, `GET /packages/{id}/lineage`, `GET /mdu/provenance/{id}`

---

### `/governance/retrieval`
- **Component:** `RetrievalReadinessView`
- **Purpose:** Detailed retrieval readiness rules evaluation, schema compliance, and corrective action list.
- **APIs:** `GET /discovery/packages`, `GET /packages/{id}/retrieval`, `GET /tantra/packages/{id}/retrieval-readiness`

---

### `/audit`
- **Component:** `AuditView`
- **Purpose:** Audit completeness verification and deterministic replay consistency evaluation against transition history.
- **APIs:** `GET /discovery/packages`, `GET /packages/{id}/audit`, `GET /packages/{id}/replay`

---

### `/admin/shared-data`
- **Component:** `SharedDataAdminView`
- **Purpose:** Ecosystem shared data registry and service convergence contracts viewer.
- **APIs:** `GET /shared/registry`, `GET /shared/contracts`

---

### `*` (Catch-All)
- **Component:** `NotFound`
- **Purpose:** Graceful fallback for non-existent routes with navigation link back to `/dashboard`.

