# MASTERDB CONTROL CENTER & DATA OPERATIONS INTERFACE
## CODE PACKET & IMPLEMENTATION SPECIFICATION

---

### 1. Architectural Overview

The MASTERDB Control Center is a sovereign dataset governance and data operations interface. The repository implements a hybrid architecture:
- **Frontend Layer:** React 19 Single Page Application built with Vite 6, TypeScript 5, and vanilla CSS design system with dark mode aesthetics, semantic navigation, and reactive state management.
- **Backend Service Layer:** Bundled FastAPI service under `backend/bhiv-masterdb-ingestion-certification-service-main` providing deterministic dataset validation, ingestion certification gates, package registry, MDU contract compliance adapters, TANTRA runtime interfaces, and shared data store services.

---

### 2. Directory Tree & Source Map

```
MASTERDB-Control-Center/
├── .env.example                               # Environment template with backend URLs
├── .gitignore                                 # Git ignore rules (node_modules, dist, .env)
├── package.json                               # Frontend dependency manifest with pinned semvers
├── package-lock.json                          # Lockfile for reproducible node builds
├── pytest.ini                                 # Root pytest configuration with pythonpath
├── requirements.txt                           # Root python requirements matching backend baseline
├── tsconfig.json                              # TypeScript root references
├── tsconfig.app.json                          # TypeScript application compiler options
├── tsconfig.node.json                         # TypeScript node tools configuration
├── vite.config.ts                             # Vite bundler configuration
├── vitest.config.ts                           # Vitest testing configuration with v8 coverage
├── eslint.config.js                           # ESLint configuration ignoring dist and coverage
├── index.html                                 # Single-page HTML entry point
│
├── src/                                       # Frontend Source Code
│   ├── main.tsx                               # Application bootstrap and DOM mounting
│   ├── index.css                              # Design tokens, typography, glassmorphism styles
│   ├── routes/
│   │   └── router.tsx                         # Client-side router with all operational views
│   ├── layouts/
│   │   └── AppShell.tsx                       # Navigation sidebar, topbar, dynamic breadcrumbs
│   ├── components/
│   │   └── ui.tsx                             # UI primitives: PageHeader, DataTable, StatusBadge
│   ├── pages/
│   │   ├── Pages.tsx                          # Dashboard, Datasets, Observability, Admin views
│   │   ├── ControlledIngestion.tsx            # 4-step controlled ingestion wizard
│   │   ├── IngestionJobs.tsx                  # Ingestion job monitor & target read-back viewer
│   │   └── GovernancePages.tsx                # Standalone governance control plane views
│   ├── api/                                   # Typed API Clients
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
├── docs/                                      # Comprehensive Technical Documentation
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
├── CODE_PACKET.md                             # Code Packet & Technical Architecture (this file)
└── CODE_INDEX.md                              # Codebase Index & Dictionary
```

---

### 3. Key Modules Explained

#### Frontend Modules

1. **`src/api/client.ts` (`ApiClient`):**
   - Configurable base URL with sensible defaults (`http://localhost:8000` or `VITE_MASTERDB_API_URL`).
   - AbortController timeout protection (30,000ms default).
   - Authoritative error parsing handling Pydantic arrays, nested API errors, and standard error shapes.
   - **Security Invariant:** Automatically strips and redacts JWT bearer tokens from error strings before returning them to UI state.

2. **`src/api/ingestion.ts`:**
   - Implements `getDatabases()` to dynamically retrieve target database capabilities.
   - Implements `ingestDataset()` for controlled pipeline execution.
   - Implements `getDatabaseRecords()` for live HTTP read-back verification against `/databases/{key}/records/{id}` with URL encoding and token attachment.

3. **`src/pages/GovernancePages.tsx`:**
   - Contains standalone governance control plane views:
     - `GovernanceOverview`: Catalogue inventory and progression tracker.
     - `ValidationView`: On-demand validation execution and profile inspection.
     - `CertificationView`: Dual MASTERDB and TANTRA runtime status indicators.
     - `LineageView`: Ancestor/descendant dependency walk and canonical MDU audit log.
     - `RetrievalReadinessView`: Indexing rule checklist and corrective actions.
     - `AuditView`: Transition history replay consistency evaluator.
     - `SharedDataAdminView`: Ecosystem shared registries and contracts.

4. **`src/layouts/AppShell.tsx`:**
   - Responsive sidebar with categorized navigation groups: *Control Plane*, *Dataset Governance*, and *System Operations*.
   - Dynamic accessible breadcrumbs navigation.
   - Persistent backend connection heartbeat indicator.

#### Backend Modules

1. **`services/validation_service.py`:**
   - Performs profile extraction (row count, column types, missingness, duplicate rows) and schema rule validation against `config/schema.json` and `config/validation_rules.json`.
   - Generates deterministic integrity scores and risk flags.
   - Handles path resolution relative to package root when invoked from outside the backend directory.

2. **`services/certification_service.py`:**
   - Enforces transition state machine: `REGISTERED` -> `VALIDATED` -> `VERIFIED` -> `CERTIFIED` (or `REJECTED`).
   - Generates immutable audit trail entries containing rule verdicts, state transitions, reasons, and timestamps.

3. **`services/backup_service.py`:**
   - Produces portable JSON snapshots of all registered stores and restores state with input validation.

4. **`tests/test_deterministic_execution.py`:**
   - Executes 50 consecutive runs on `certifiable_sample.csv`, canonicalizes report state, and verifies identical SHA-256 digest `9b7bd6b9ecdf98a198251257d7f771d7a25a53ad15dd295b6d867d98691afbca`.

5. **`tests/test_malformed_inputs.py`:**
   - Asserts that corrupt, missing, or malformed payloads to `/validate`, `/certify`, `/packages/register`, and `/admin/restore` return controlled 4xx HTTP responses and zero 500 crashes.

---

### 4. Implementation Diff Summary

During the Phase 2 Parikshak remediation, the following files were added or modified:

| File Path | Type | Remediation Purpose |
|---|---|---|
| `pytest.ini` | Added | Configures root test discovery for backend suites and pythonpath |
| `vitest.config.ts` | Added | Configures Vitest runner, jsdom environment, and v8 coverage |
| `requirements.txt` | Added | Pinned root Python dependencies matching backend baseline |
| `package.json` | Modified | Pinned exact semvers, removed "latest", added test scripts |
| `eslint.config.js` | Modified | Added `coverage` to ignores array |
| `tsconfig.app.json` | Modified | Excluded `src/tests` from production app build |
| `src/types/masterdb.ts` | Modified | Added target database read-back models and response types |
| `src/api/ingestion.ts` | Modified | Added `getDatabaseRecords()` read-back client function |
| `src/pages/IngestionJobs.tsx` | Modified | Integrated live read-back verification card and record viewer |
| `src/pages/ControlledIngestion.tsx` | Modified | Added target read-back verification step to ingestion wizard |
| `src/pages/GovernancePages.tsx` | Added | Replaced placeholder routes with 7 functional governance views |
| `src/routes/router.tsx` | Modified | Routed standalone governance paths to `GovernancePages.tsx` |
| `src/layouts/AppShell.tsx` | Modified | Added Ingestion Jobs and governance subroutes to navigation |
| `src/components/ui.tsx` | Modified | Enhanced `DataTable` to accept both headers and ReactNode array rows |
| `src/tests/setup.ts` | Added | Configured JSDOM crypto polyfill and testing-library setup |
| `src/tests/api/client.test.ts` | Added | Unit tests for base API client (9 tests) |
| `src/tests/api/auth.test.ts` | Added | Unit tests for authentication client (4 tests) |
| `src/tests/api/upload.test.ts` | Added | Unit tests for upload client (8 tests) |
| `src/tests/api/ingestion.test.ts` | Added | Unit tests for ingestion and read-back client (6 tests) |
| `src/tests/api/governance_apis.test.ts` | Added | Unit tests for governance API clients (9 tests) |
| `src/tests/integration/workflow.test.tsx`| Added | End-to-end integration test for ingestion workflow (1 test) |
| `src/tests/components/governance.test.tsx`| Added | Component tests for standalone governance views (7 tests) |
| `src/tests/components/navigation.test.tsx`| Added | Component tests for brand, sidebar, and breadcrumbs (2 tests) |
| `backend/.../services/validation_service.py`| Modified | Fixed relative config path resolution for root execution |
| `backend/.../services/certification_service.py`| Modified | Fixed relative config path resolution for root execution |
| `backend/.../services/backup_service.py`| Modified | Added input validation to prevent 500 error on malformed snapshot |
| `backend/.../tests/test_deterministic_execution.py`| Added | Automated 50-run deterministic repeatability test |
| `backend/.../tests/test_malformed_inputs.py`| Added | Automated malformed inputs defense test suite |
| `scripts/verify_deterministic_state.py`| Added | Standalone 50-run verification harness script |
| `docs/ROUTES.md` | Modified | Documented all 7 standalone governance routes and APIs |
| `docs/MASTERDB_CONTROL_CENTER_PROOF.md` | Modified | Documented test metrics, deterministic hash, and architecture notes |
| `REVIEW_PACKET.md` | Added | Root Parikshak evaluation review packet |
| `CODE_PACKET.md` | Added | Root code packet & implementation specification |
| `CODE_INDEX.md` | Added | Root comprehensive codebase index |

---

### 5. Verification Commands

#### 1. Backend Testing Suite
```bash
pytest -q
# Expected: 272 passed in ~8s
```

#### 2. Standalone 50-Run Deterministic Verification
```bash
python scripts/verify_deterministic_state.py
# Expected: 50/50 runs identical, SHA-256 digest: 9b7bd6b9ecdf98a198251257d7f771d7a25a53ad15dd295b6d867d98691afbca
```

#### 3. Frontend Testing Suite
```bash
npm test -- --run
# Expected: 8 passed / 8 files, 46 passed tests in ~3s
```

#### 4. Frontend Code Coverage
```bash
npm run test:coverage -- --run
# Expected: >86% line coverage, 96% function coverage across src/api
```

#### 5. Static Type Checking
```bash
npm run type-check
# Expected: 0 errors
```

#### 6. ESLint Verification
```bash
npm run lint
# Expected: 0 errors, 0 warnings
```

#### 7. Production Build
```bash
npm run build
# Expected: Clean production bundle created in dist/
```
