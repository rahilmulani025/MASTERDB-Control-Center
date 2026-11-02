# MASTERDB CONTROL CENTER & DATA OPERATIONS INTERFACE
## CODEBASE INDEX & SYMBOL DICTIONARY

---

### 1. Codebase Directory Inventory

```
MASTERDB-Control-Center/
├── .env.example                               # Environment template with backend configuration
├── .gitignore                                 # Git exclusions (.env, node_modules, dist)
├── package.json                               # Node.js package manifest (exact pinned semvers)
├── package-lock.json                          # Reproducible npm dependency lockfile
├── pytest.ini                                 # Root pytest configuration
├── requirements.txt                           # Root python requirements matching backend baseline
├── tsconfig.json                              # TypeScript root references
├── tsconfig.app.json                          # TypeScript application compiler options
├── tsconfig.node.json                         # TypeScript node tools configuration
├── vite.config.ts                             # Vite frontend builder configuration
├── vitest.config.ts                           # Vitest testing suite configuration
├── eslint.config.js                           # ESLint configuration ignoring dist and coverage
├── index.html                                 # Single-page HTML entry point
│
├── src/                                       # Frontend Application Source Code
│   ├── main.tsx                               # Application bootstrap and DOM mounting
│   ├── index.css                              # Design system tokens, layouts, and styles
│   ├── routes/
│   │   └── router.tsx                         # Client-side router definition
│   ├── layouts/
│   │   └── AppShell.tsx                       # Navigation sidebar, topbar, dynamic breadcrumbs
│   ├── components/
│   │   └── ui.tsx                             # UI components: PageHeader, DataTable, StatusBadge
│   ├── pages/
│   │   ├── Pages.tsx                          # Overview, Datasets, Observability, Admin views
│   │   ├── ControlledIngestion.tsx            # 4-step controlled ingestion wizard
│   │   ├── IngestionJobs.tsx                  # Ingestion job monitor & target read-back viewer
│   │   └── GovernancePages.tsx                # Standalone governance control plane views
│   ├── api/                                   # Typed API Client Modules
│   │   ├── client.ts                          # Resilient fetch wrapper with JWT error redaction
│   │   ├── auth.ts                            # Token acquisition and session caching
│   │   ├── upload.ts                          # Upload session lifecycle & chunk streaming
│   │   ├── ingestion.ts                       # Ingestion submission & target read-back queries
│   │   ├── validation.ts                      # On-demand validation triggers and report queries
│   │   ├── certification.ts                   # MASTERDB certification gates
│   │   ├── discovery.ts                       # Package catalogue discovery
│   │   ├── tantra.ts                          # TANTRA runtime and retrieval readiness
│   │   ├── lineage.ts                         # Package lineage and dependency relationships
│   │   ├── mdu.ts                             # MDU schema contracts and provenance trail
│   │   ├── audit.ts                           # Audit completeness and deterministic replay
│   │   ├── admin.ts                           # Configuration reports, backup, and restore
│   │   ├── operations.ts                      # Shared data registry & convergence contracts
│   │   └── health.ts                          # Liveness and readiness endpoints
│   ├── types/
│   │   └── masterdb.ts                        # Complete TypeScript domain contracts & types
│   └── tests/                                 # Frontend Test Suites (Vitest)
│       ├── setup.ts                           # JSDOM environment setup and crypto polyfill
│       ├── api/
│       │   ├── client.test.ts                 # Base API client error handling & headers (9 tests)
│       │   ├── auth.test.ts                   # Token acquisition and cache expiry (4 tests)
│       │   ├── upload.test.ts                 # Upload lifecycle & validation (8 tests)
│       │   ├── ingestion.test.ts              # Ingestion dispatch & database read-back (6 tests)
│       │   └── governance_apis.test.ts        # Governance & operations client tests (9 tests)
│       ├── components/
│       │   ├── navigation.test.tsx            # Sidebar, brand, and breadcrumbs tests (2 tests)
│       │   └── governance.test.tsx            # Standalone governance components tests (7 tests)
│       └── integration/
│           └── workflow.test.tsx              # End-to-end ingestion workflow integration (1 test)
│
├── backend/                                   # Bundled Python FastAPI Subsystem
│   └── bhiv-masterdb-ingestion-certification-service-main/
│       ├── main.py                            # FastAPI application entry point
│       ├── models.py                          # Pydantic request and response schemas
│       ├── requirements.txt                   # Backend pinned dependencies
│       ├── pytest.ini                         # Backend local pytest configuration
│       ├── services/                          # Core domain business logic
│       │   ├── validation_service.py          # Deterministic profiling and schema validator
│       │   ├── certification_service.py       # Multi-stage certification state machine
│       │   ├── package_registry_service.py    # Package registration, promotion, deprecation
│       │   ├── artifact_store.py              # File-based JSON artifact repository
│       │   ├── sql_artifact_store.py          # Central SQL database store (SQLite/Postgres)
│       │   ├── backup_service.py              # Application-level snapshot export and restore
│       │   └── tantra_interface_service.py    # TANTRA runtime integration adapter
│       ├── tests/                             # 38 pytest test modules (272 tests)
│       │   ├── test_deterministic_execution.py# 50-run repeatability verification test
│       │   ├── test_malformed_inputs.py       # Fuzz and malformed payload defense suite
│       │   └── ...                            # 36 unit and integration test modules
│       └── datasets/                          # Reference evaluation datasets & contracts
│
├── scripts/                                   # Standalone Verification Scripts
│   └── verify_deterministic_state.py          # Standalone 50-run verification harness
│
├── docs/                                      # Technical Documentation
│   ├── MASTERDB_CONTROL_CENTER_SPEC.md        # Architecture specification
│   ├── MASTERDB_DASHBOARD_API_MAP.md          # Complete API map
│   ├── MASTERDB_INGESTION_UI_FLOW.md          # UI workflow details
│   ├── MASTERDB_CONTROL_CENTER_PROOF.md       # Acceptance proof & verification report
│   ├── ROUTES.md                              # Complete client route directory
│   ├── API-INTEGRATION.md                     # Backend API contracts
│   ├── DEPLOYMENT.md                          # Deployment guidelines
│   └── HANDOFF.md                             # Operations handoff guide
│
├── REVIEW_PACKET.md                           # Parikshak Evaluation Review Packet
├── CODE_PACKET.md                             # Code Packet & Technical Architecture
└── CODE_INDEX.md                              # Codebase Index & Dictionary (this file)
```

---

### 2. Frontend Component & View Catalog

| Route Path | Exported Component | Source File | Responsibilities |
|---|---|---|---|
| `/dashboard` | `Dashboard` | `src/pages/Pages.tsx` | Operational landing page, cluster health, and quick actions |
| `/datasets` | `Datasets` | `src/pages/Pages.tsx` | Sovereign dataset package catalogue browser |
| `/datasets/:id` | `DatasetDetails` | `src/pages/Pages.tsx` | 360-degree governance inspection & action view |
| `/ingestion` | `ControlledIngestion` | `src/pages/ControlledIngestion.tsx` | 4-step controlled ingestion wizard with target read-back |
| `/ingestion/jobs` | `IngestionJobs` | `src/pages/IngestionJobs.tsx` | Ingestion job monitor, trace inspector, and read-back card |
| `/observability` | `Observability` | `src/pages/Pages.tsx` | Metrics, runtime identity, and operational sync monitoring |
| `/admin`, `/admin/system` | `Admin` | `src/pages/Pages.tsx` | Admin panel, configuration compliance, and backup/restore |
| `/governance` | `GovernanceOverview` | `src/pages/GovernancePages.tsx` | Governance pipeline stage tracker and dataset inventory |
| `/governance/validation` | `ValidationView` | `src/pages/GovernancePages.tsx` | On-demand validation evaluation and profile metrics |
| `/governance/certification` | `CertificationView` | `src/pages/GovernancePages.tsx` | Formal certification authority with dual runtime standing |
| `/lineage` | `LineageView` | `src/pages/GovernancePages.tsx` | Ancestor/descendant dependency walk and canonical MDU audit |
| `/governance/retrieval` | `RetrievalReadinessView` | `src/pages/GovernancePages.tsx` | Indexing rule checklist and corrective action evaluation |
| `/audit` | `AuditView` | `src/pages/GovernancePages.tsx` | Audit completeness and deterministic history replay |
| `/admin/shared-data` | `SharedDataAdminView` | `src/pages/GovernancePages.tsx` | Ecosystem shared data registries and service contracts |
| `*` | `NotFound` | `src/pages/Pages.tsx` | 404 Fallback view with navigation back to overview |

---

### 3. API Client Function Dictionary

| Module | Exported Function | Endpoint Path | Method | Description |
|---|---|---|---|---|
| `src/api/auth.ts` | `getAuthToken()` | `/auth/token` | POST | Acquires or reuses cached JWT token |
| `src/api/auth.ts` | `clearAuthToken()` | — | — | Clears cached session token |
| `src/api/upload.ts` | `initiateUpload()` | `/upload` | POST | Initializes upload session with client hash |
| `src/api/upload.ts` | `uploadChunk()` | `/upload/{id}/content` | POST | Streams raw binary octet-stream chunk |
| `src/api/upload.ts` | `validateUpload()` | `/upload/{id}/validate` | POST | Triggers pre-ingestion format check |
| `src/api/upload.ts` | `computeFileSha256()` | — | — | Browser-side Web Crypto SHA-256 calculation |
| `src/api/ingestion.ts` | `getDatabases()` | `/databases` | GET | Returns dynamic target database matrix |
| `src/api/ingestion.ts` | `ingestDataset()` | `/ingest` | POST | Dispatches controlled dataset ingestion |
| `src/api/ingestion.ts` | `getIngestionJob()` | `/ingest/jobs/{id}` | GET | Queries status for individual job |
| `src/api/ingestion.ts` | `getIngestionJobs()` | `/ingest/jobs` | GET | Lists all ingestion execution jobs |
| `src/api/ingestion.ts` | `getDatabaseRecords()` | `/databases/{k}/records/{i}` | GET | Live direct target database read-back |
| `src/api/validation.ts` | `validateDataset()` | `/validate` | POST | Triggers deterministic validation |
| `src/api/validation.ts` | `getValidationStatus()` | `/status/{id}` | GET | Retrieves compact validation status |
| `src/api/validation.ts` | `getValidationReport()` | `/report/{id}` | GET | Retrieves full validation report |
| `src/api/certification.ts` | `certifyDataset()` | `/certify` | POST | Triggers certification state machine gate |
| `src/api/discovery.ts` | `getDiscoveredPackages()`| `/discovery/packages` | GET | Returns discovered package catalogue |
| `src/api/tantra.ts` | `getRetrievalReadiness()`| `/tantra/packages/{id}/retrieval-readiness` | GET | Fetches retrieval readiness assessment |
| `src/api/tantra.ts` | `getTantraCertification()`| `/tantra/certification/{id}` | GET | Fetches TANTRA runtime certification |
| `src/api/tantra.ts` | `getPackageRuntime()` | `/tantra/packages/{id}/runtime` | GET | Bundled package, lineage, & readiness |
| `src/api/lineage.ts` | `getPackageLineage()` | `/packages/{id}/lineage` | GET | Fetches package ancestor/descendant graph |
| `src/api/mdu.ts` | `getMDUProvenance()` | `/mdu/provenance/{id}` | GET | Fetches canonical MDU provenance events |
| `src/api/mdu.ts` | `getMDUSchema()` | `/mdu/schema/{id}` | GET | Fetches canonical schema contract |
| `src/api/mdu.ts` | `getMDUSchemaCompatibility()` | `/mdu/schema-compatibility/{id}` | GET | Validates schema version compatibility |
| `src/api/audit.ts` | `getPackageAudit()` | `/packages/{id}/audit` | GET | Checks transition history completeness |
| `src/api/audit.ts` | `getPackageReplay()` | `/packages/{id}/replay` | GET | Replays status purely from history |
| `src/api/admin.ts` | `getAdminToken()` | `/auth/token` | POST | Acquires `bhiv-admin` bearer token |
| `src/api/admin.ts` | `getAdminConfiguration()`| `/admin/configuration` | GET | Sanitized configuration compliance report |
| `src/api/admin.ts` | `createAdminBackup()` | `/admin/backup` | GET | Exports application-level snapshot |
| `src/api/admin.ts` | `restoreAdminBackup()` | `/admin/restore` | POST | Restores records from snapshot |
| `src/api/operations.ts` | `getRuntimeIdentity()` | `/runtime/identity` | GET | Capabilities manifest for TANTRA runtime |
| `src/api/operations.ts` | `getSharedRegistry()` | `/shared/registry` | GET | Shared data registry entries |
| `src/api/operations.ts` | `getSharedContracts()` | `/shared/contracts` | GET | Service convergence contracts |
| `src/api/health.ts` | `getHealth()` | `/health` | GET | Liveness health check |
| `src/api/health.ts` | `getReadiness()` | `/ready` | GET | Subsystem readiness checks |

---

### 4. Backend Service Modules & Endpoints

| Python Module | Primary Class / Function | Endpoints Served | Responsibilities |
|---|---|---|---|
| `services/validation_service.py` | `ValidationService` | `POST /validate` | Profile extraction, schema rules validation, deterministic scoring |
| `services/certification_service.py` | `CertificationService` | `POST /certify` | Lifecycle transition state machine (`VALIDATED` -> `CERTIFIED`) |
| `services/report_service.py` | `ReportService` | `GET /status/{id}`, `GET /report/{id}` | Formats and serves compact and full validation reports |
| `services/package_registry_service.py` | `PackageRegistryService`| `POST /packages/register`, `GET /packages/{id}` | Package registration, lifecycle promotion, transition history |
| `services/tantra_interface_service.py` | `TantraInterfaceService`| `GET /tantra/*` | TANTRA runtime lookup, retrieval readiness assessment |
| `services/mdu_contract_adapter.py` | `MDUContractAdapter` | `GET /mdu/*` | Canonical schema contract negotiation and compatibility checks |
| `services/backup_service.py` | `BackupService` | `GET /admin/backup`, `POST /admin/restore` | Full JSON application snapshot creation and safe restoration |
| `services/artifact_store.py` | `ArtifactStore` | Internal persistence | File-based JSON storage of validation reports and artifacts |
| `services/sql_artifact_store.py` | `SqlArtifactStore` | Internal persistence | SQLAlchemy central database store (SQLite/Postgres) |
| `auth/service.py` | `AuthService` | `POST /auth/token` | JWT token issuance with HMAC-SHA256 and role binding |

---

### 5. Automated Test Suite Registry

#### Frontend Test Suites (8 files, 46 tests)
- `src/tests/api/client.test.ts` (9 tests) — Base HTTP client, token redaction, timeout handling, error parsing.
- `src/tests/api/auth.test.ts` (4 tests) — JWT acquisition, caching, token refresh on expiry.
- `src/tests/api/upload.test.ts` (8 tests) — Upload initiation, binary chunk streaming, SHA-256 calculation.
- `src/tests/api/ingestion.test.ts` (6 tests) — Ingestion submission, job polling, target database read-back.
- `src/tests/api/governance_apis.test.ts` (9 tests) — Validation, certification, discovery, lineage, TANTRA, MDU, audit, admin APIs.
- `src/tests/integration/workflow.test.tsx` (1 test) — Full end-to-end controlled ingestion pipeline simulation.
- `src/tests/components/governance.test.tsx` (7 tests) — Rendering and interaction of all 7 governance views.
- `src/tests/components/navigation.test.tsx` (2 tests) — AppShell brand, sidebar links, dynamic breadcrumbs.

#### Backend Test Suites (38 files, 272 tests)
- `tests/test_deterministic_execution.py` — 50-run repeatability verification on certifiable sample dataset.
- `tests/test_malformed_inputs.py` — Defense against malformed payloads across all endpoints.
- `tests/test_validation_service.py` — Validation rules, integrity score calculations, gap flags.
- `tests/test_certification_service.py` — Certification state machine transitions and audit trails.
- `tests/test_admin_backup_endpoints.py` — Backup export and restore permission gates.
- `tests/test_admin_configuration_endpoint.py` — Configuration reporting with secret masking.
- `tests/test_bcaes_registry_service.py` — Object cataloging, dependency resolution, persistence.
- `tests/test_tantra_interface_service.py` — TANTRA runtime lookups and readiness gates.
- `tests/test_mdu_contract_adapter.py` — MDU schema contract compatibility.
- `tests/test_sql_database.py` — SQL storage backend CRUD operations.
- *(plus 28 additional unit and integration test modules)*
