# MASTERDB Control Center — System Specification

> Comprehensive architectural and functional specification for the MASTERDB Control Center and Controlled Data Ingestion Interface.

---

## 1. Purpose

The **MASTERDB Control Center** is the unified enterprise control-plane interface for the sovereign **MASTERDB** data management platform. It enables engineers, data operators, compliance officers, and governance teams to:

1. Discover, inspect, and track dataset packages across their entire governance lifecycle.
2. Monitor dataset validation, MASTERDB certification, MDU canonical schema conformance, and TANTRA runtime readiness.
3. Perform **Controlled Data Ingestion** — securely uploading files, validating dataset structure, enforcing format compatibility, gating through certification, and routing writes to authorized sovereign storage engines with full read-back verification.
4. Execute administrative audits, configuration validation, backup generation, and protected snapshot recovery.
5. Inspect cross-subsystem telemetry and synchronization state across Parikshak, Niyantran, and the Replay Registry.

---

## 2. Scope

The Control Center provides complete operational coverage of MASTERDB capabilities:

- **Package & Dataset Registry:** Discovery, identity resolution, metadata inspection, lifecycle progression, and audit logs.
- **Governance Pipeline:** Validation reports, certification gates, MDU canonical schemas, and schema compatibility checks.
- **TANTRA Integration:** Certification status, retrieval readiness assessments, and bundled runtime lookup.
- **Controlled Ingestion:** Session initiation, binary content transfer (`application/octet-stream`), pre-ingestion validation, dynamic target database capabilities matching, controlled ingestion submission, asynchronous job tracking, and target database read-back.
- **System Administration:** Configuration compliance reports, non-destructive backup exports, and multi-step protected snapshot restoration.
- **Observability:** System liveness/readiness, runtime identity manifests, shared data registry entries, and replay-capable subsystem registries.

---

## 3. Ownership & Responsibility Boundaries

The project operates under a strict division of ownership between frontend interface orchestration and backend authoritative governance:

```
┌──────────────────────────────────────────────────────────────────┐
│                           RAHIL (Frontend)                       │
│  - MASTERDB Control Center UI/UX                                 │
│  - Frontend / API Integration Layer (ApiClient)                  │
│  - Operational Dashboard & Observability Panels                  │
│  - Controlled Ingestion User Interface & Polling Orchestrator    │
│  - User-Facing Evidence, Audit Display & Target DB Read-Back     │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ HTTPS / REST (Bearer Auth)
┌─────────────────────────────────▼────────────────────────────────┐
│                            KAVY (Backend)                        │
│  - MASTERDB Core Backend & Ingestion Engine                      │
│  - Authoritative API Contracts & OpenAPI Specifications          │
│  - Storage Persistence & Target Database Routing                 │
│  - Authoritative RBAC & Server-Side Role Enforcement             │
│  - Validation Engine, Certification Gates & Audit Trails         │
└──────────────────────────────────────────────────────────────────┘
```

| Area | Frontend Responsibility (Rahil) | Backend Responsibility (Kavy) |
|---|---|---|
| **Authentication & RBAC** | Submits credentials via `POST /auth/token`, attaches Bearer token, reflects server-assigned roles in UI | Authoritatively verifies credentials, assigns roles server-side, enforces 401/403 gates on protected endpoints |
| **Controlled Ingestion** | Provides drag-and-drop file upload, computes SHA-256 client-side, streams octet-stream bytes, displays database capabilities, polls job status | Creates upload session, writes content to disk, executes format validation, executes certification gate, persists records to target DB |
| **Validation & Certification** | Triggers validation/certification actions via UI, renders reports and status badges | Executes validation rules, verifies schema constraints, issues signed certification records |
| **Database Read-Back** | Queries `GET /databases/{key}/records/{id}` and renders verified records to the user | Reads directly from underlying physical store (Relational, Vector, Document, Graph, TimeSeries, Ledger, Object) |
| **Governance & Safety** | Implements safety dialogs, confirmation gates, and validation before mutating calls | Holds authoritative business logic, rejects unauthorized or invalid requests regardless of client state |

---

## 4. Architecture

```
                                      ┌───────────────────────────────────────┐
                                      │        Client Browser (SPA)           │
                                      │  React 18 + TypeScript + Vanilla CSS  │
                                      └───────────────────┬───────────────────┘
                                                          │
                                                          │ REST / JSON & Octet-Stream
                                                          ▼
                                      ┌───────────────────────────────────────┐
                                      │      MASTERDB FastAPI Backend         │
                                      │     (Port 8000 / Production URL)      │
                                      └───────┬───────┬───────┬───────┬───────┘
                                              │       │       │       │
              ┌───────────────────────────────┘       │       │       └───────────────────────────────┐
              ▼                                       ▼       ▼                                       ▼
┌───────────────────────────┐      ┌────────────────────┐   ┌──────────────────┐      ┌──────────────────────────┐
│    Package Registry       │      │  Validation & Cert │   │ Controlled       │      │ Sovereign Storage Engines│
│ - Physical package state  │      │ - Rule evaluation  │   │ Ingestion Engine │      │ - RelationalDB (SQLite)  │
│ - Transition history      │      │ - Certification    │   │ - Session mgr    │      │ - VectorDB / DocStore    │
│ - Lineage & provenance    │      │ - MDU Schema sync  │   │ - Format check   │      │ - Graph / TimeSeries     │
│ - Audit & replay logs     │      │ - TANTRA registry  │   │ - Persistence    │      │ - LedgerDB / ObjectStore │
└───────────────────────────┘      └────────────────────┘   └──────────────────┘      └──────────────────────────┘
```

---

## 5. Major Control Center Areas

The application is structured into the following operational zones:

1. **Control-Plane Dashboard (`/dashboard`)**: Live backend health (`/health`), component readiness checks (`/ready`), high-level package metrics, and rapid navigation shortcuts.
2. **Dataset Explorer (`/datasets`)**: Paginated catalogue of all discoverable packages returned by `GET /discovery/packages`.
3. **Dataset Details & Governance (`/datasets/:datasetId`)**: Full 360-degree governance inspection and mutation panel for a selected package.
4. **Controlled Ingestion (`/ingestion`)**: Full-lifecycle file ingestion wizard: upload initialization, binary transmission, structure validation, dynamic database capability matching, and submission.
5. **Ingestion Job Monitor (`/ingestion/jobs`)**: Real-time tracking of active, persisted, and rejected ingestion jobs with full target database read-back evidence.
6. **Observability & Cross-Service Sync (`/observability`)**: Health metrics, TANTRA runtime identity, Replay Registry subsystem manifests, and operational sync status (Parikshak, Niyantran).
7. **System Administration (`/admin`, `/admin/system`)**: Authenticated administrative controls: configuration compliance audit, non-destructive backup exports, and protected snapshot restoration.

---

## 6. Dataset Discovery

- **Endpoint:** `GET /discovery/packages`
- **Behavior:** Loads the catalogue of all packages registered in MASTERDB.
- **Data Model:** Returns an array of `DiscoveredPackage` items containing `package_id`, `dataset_id`, `state`, `created_at`, `record_count`, and `owner`.
- **UI Presentation:** Responsive data table with state badges, search filtering, and direct links to individual package governance pages.

---

## 7. Dataset Detail

The Dataset Detail page resolves the relationship between two fundamental identifiers:
- **`package_id`**: The physical artifact package identifier passed in the URL path.
- **`dataset_id`**: The logical dataset identifier extracted from the package record and used for all downstream governance operations.

Upon mounting, the view aggregates data across 14 independent backend endpoints:
- `GET /packages/{package_id}` — Identity and core state
- `GET /packages/{package_id}/history` — Lifecycle transition log
- `GET /packages/{package_id}/lineage` — Ancestor and descendant dependency graph
- `GET /packages/{package_id}/retrieval` — Retrieval evidence
- `GET /packages/{package_id}/audit` — Audit trail completeness report
- `GET /packages/{package_id}/replay` — Deterministic replay consistency verification

---

## 8. Validation

- **Execution:** `POST /validate` with payload `{"dataset_id": "...", "strict_mode": false}`.
- **Status Read:** `GET /status/{dataset_id}` for compact pass/fail and summary metrics.
- **Report Read:** `GET /report/{dataset_id}` for comprehensive rule-by-rule validation reports, error listings, and execution traces.
- **Authority:** Backend validation engine authoritatively decides validity against registered MDU schemas and data rules.

---

## 9. Certification

- **Execution:** `POST /certify` with payload `{"dataset_id": "...", "certification_type": "MASTERDB_STANDARD"}`.
- **Status Read:** `GET /certify/{dataset_id}/status` to inspect current certification standing.
- **Authority:** MASTERDB certification gate requires validation pass before granting certification tokens.

---

## 10. Lineage

- **Endpoint:** `GET /packages/{package_id}/lineage`
- **Presentation:** Upstream source datasets, transformation pipelines, and downstream consumer dependencies.

---

## 11. Provenance

- **Endpoint:** `GET /mdu/provenance/{dataset_id}`
- **Presentation:** Chronological MDU provenance events detailing origin, ingest timestamp, checksum verification, and transformation history.

---

## 12. Retrieval Readiness

- **Endpoints:** `GET /packages/{package_id}/retrieval` and `GET /tantra/packages/{package_id}/retrieval-readiness`
- **Presentation:** Assesses whether the dataset package is indexed, certified, and compliant for downstream low-latency retrieval by sovereign inference engines.

---

## 13. Audit & Replay

- **Audit:** `GET /packages/{package_id}/audit` verifies log completeness, trace ID continuity, and hash chain integrity.
- **Replay:** `GET /packages/{package_id}/replay` verifies that re-executing pipeline steps on original source data reproduces identical package outputs.

---

## 14. Knowledge Object Registration

- **Endpoint:** `POST /packages/{package_id}/knowledge-object`
- **Payload:** `{"object_type": "...", "metadata": {...}, "tags": [...]}`
- **Purpose:** Registers a certified dataset package into the sovereign knowledge graph for semantic discovery.

---

## 15. MDU Schema & Compatibility

- **Schema Read:** `GET /mdu/schema/{dataset_id}` retrieves the canonical Master Data Unit schema definition.
- **Compatibility Check:** `GET /mdu/schema-compatibility/{dataset_id}` verifies backward and forward compatibility across schema revisions.

---

## 16. TANTRA Certification & Runtime Integration

Where implemented in the MASTERDB backend:
- `GET /tantra/certification/{dataset_id}` — TANTRA sovereign certification verification.
- `GET /tantra/packages/{package_id}/runtime` — Bundled TANTRA runtime state lookup.
- `GET /runtime/identity` — Global TANTRA runtime identity manifest.

---

## 17. Observability

The Observability panel integrates system-wide telemetry:
- `GET /health` and `GET /ready` liveness and readiness monitoring.
- `GET /metrics` backend metrics.
- `GET /replay-registry/manifest` listing all replay-capable subsystems.
- `GET /shared/registry` and `GET /shared/contracts` inspecting inter-service convergence models.
- `GET /parikshak/review-references` and `GET /niyantran/task-state` monitoring operational task synchronization.

---

## 18. Administration

Admin capabilities are gated by Bearer token authorization (`bhiv-admin` / `admin` / `operator`):
- **Configuration Audit:** `GET /admin/configuration` inspects active runtime parameters without exposing private secrets.
- **Backup Generation:** `GET /admin/backup` explicitly triggered by the user to export a complete system state snapshot.
- **Protected Restore:** `POST /admin/restore` requires valid JSON snapshot data, explicit confirmation checkbox, and browser confirmation before executing.

---

## 19. Controlled Ingestion

Controlled Ingestion is the flagship operational data pipeline:

```
[File Select] ──> [POST /upload] ──> [POST /upload/{id}/content] ──> [POST /upload/{id}/validate]
                                                                               │
[Target Read-Back] <── [Job Polling] <── [POST /ingest] <── [Select Target DB] ┘
```

1. **Session Creation:** `POST /upload` initializes upload session with filename, size, format, and SHA-256 hash.
2. **Binary Upload:** `POST /upload/{upload_id}/content` streams raw file content with header `Content-Type: application/octet-stream`.
3. **Pre-Ingestion Validation:** `POST /upload/{upload_id}/validate` checks format structure and records detected.
4. **Dynamic Database Selection:** `GET /databases` fetches real supported target databases (`RelationalDB`, `VectorDB`, `DocumentStore`, `GraphStore`, `TimeSeriesDB`, `LedgerDB`, `ObjectStore`) with accepted formats and required roles.
5. **Controlled Ingestion:** `POST /ingest` executes authorized ingestion with top-level `upload_id`, `package_id`, and `dataset_id`.
6. **Asynchronous Polling & Verification:** `GET /ingest/jobs/{job_id}` polls job status until terminal `PERSISTED`.
7. **Read-Back Verification:** `GET /databases/{database_key}/records/{dataset_id}` reads back persisted records directly from target storage.

---

## 20. Security & Governance

1. **Zero Client-Side Trust:** All RBAC role assignments occur server-side upon `POST /auth/token`. Frontend role parameters are ignored by backend security filters.
2. **Authentication Enforcement:** Protected endpoints return HTTP `401 Unauthorized` when unauthenticated.
3. **Authorization Enforcement:** Mutating operations require authorized roles (`admin`, `operator`, `bhiv-admin`) and return HTTP `403 Forbidden` for unauthorized actors.
4. **No Hardcoded Secrets:** No JWT signing keys, passwords, or private tokens exist in frontend code or repository files.
5. **Path Traversal Protection:** Backend prevents path traversal attacks during file uploads.
6. **Upload Ownership Protection:** Uploads are isolated per session and actor.

---

## 21. Error Handling

- The frontend `ApiClient` normalizes all HTTP errors, FastAPI `{"error": {"message": ...}}` envelopes, and Pydantic validation error lists into structured `APIError` objects.
- User interfaces render dedicated `<ErrorState>` panels with trace identifiers and actionable guidance.
- Failed network requests trigger clean timeouts (10s limit) without hanging the browser UI.

---

## 22. Read-Only vs Mutating Operations

To ensure strict governance safety, operations are categorized as follows:

### Read-Only Operations (GET)
- Health and Readiness checks (`/health`, `/ready`, `/metrics`)
- Package discovery and detail inspection (`/discovery/packages`, `/packages/{id}/*`)
- Validation and Certification reports (`/status/{id}`, `/report/{id}`, `/certify/{id}/status`)
- MDU Schema and compatibility reports (`/mdu/*`)
- TANTRA runtime and certification state (`/tantra/*`, `/runtime/identity`)
- Replay and Audit logs (`/replay-registry/*`, `/shared/*`)
- Upload and Ingestion job status queries (`/upload/jobs`, `/ingest/jobs/*`)
- Target database capability queries and record read-backs (`/databases`, `/databases/{key}/records/{id}`)

### Controlled Mutating Operations (POST / DELETE)
- Ingestion upload session creation (`POST /upload`)
- Upload binary content transmission (`POST /upload/{id}/content`)
- Upload pre-validation execution (`POST /upload/{id}/validate`)
- Upload cancellation / deletion (`DELETE /upload/jobs/{id}`)
- Ingestion job dispatch (`POST /ingest`)
- Validation execution (`POST /validate`)
- Certification request (`POST /certify`)
- Knowledge object registration (`POST /packages/{id}/knowledge-object`)
- Admin backup generation (`GET /admin/backup` — explicitly user-triggered)
- Admin snapshot restoration (`POST /admin/restore` — destructive, protected)

> **Governance Invariant:** Backend authorization remains authoritative for every mutating operation.

---

## 23. Backend / Frontend Responsibility Boundaries

```
┌──────────────────────────────────────┐          ┌──────────────────────────────────────┐
│        Frontend (Rahil)              │          │         Backend (Kavy)               │
├──────────────────────────────────────┤          ├──────────────────────────────────────┤
│ - UI Component rendering             │          │ - Business rule validation           │
│ - Client-side SHA-256 computation    │          │ - Server-side hash verification      │
│ - Form validation & input formatting │  HTTP    │ - Schema compliance enforcement      │
│ - Token acquisition & caching        │ ───────> │ - Server-side role assignment        │
│ - State management & polling         │          │ - Physical database writes           │
│ - Error presentation & trace display │          │ - Certification gate evaluation      │
│ - Target DB record read-back display │          │ - Immutable audit log persistence    │
└──────────────────────────────────────┘          └──────────────────────────────────────┘
```

---

## 24. Final Definition of Done

The MASTERDB Control Center implementation is verified complete according to the following criteria:

- [x] All 8 required architecture and handoff documents authored and verified.
- [x] Complete alignment with the authoritative backend API contract.
- [x] Full-lifecycle controlled ingestion implemented, verified, and proven against live backend.
- [x] Dynamic database capabilities integrated across all 7 target storage engines.
- [x] Target database read-back verified with actual persisted records.
- [x] Zero TypeScript compilation errors (`npm run type-check`).
- [x] Zero ESLint warnings or errors (`npm run lint`).
- [x] Clean production build generated (`npm run build`).
- [x] Live end-to-end closure verification recorded with trace IDs and persistence proofs.
