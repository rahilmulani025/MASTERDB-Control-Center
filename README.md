# MASTERDB Control Center

> Enterprise control-plane frontend for monitoring, validating, certifying, governing, and executing controlled data ingestion across sovereign MASTERDB storage engines.

---

## 1. Overview

**MASTERDB** is a sovereign data-management platform that tracks dataset packages through a full governance lifecycle — from initial registration through validation, certification, knowledge-object tagging, retrieval readiness, and multi-tier sovereign database persistence.

This **Control Center** is the primary operational and governance interface for engineers, data operators, compliance officers, and governance teams. It provides:

- **Controlled Data Ingestion** — 4-step upload wizard, client-side SHA-256 integrity verification, format validation, certification gating, and dynamic target database persistence.
- **Real-Time Job Monitoring** — Ingestion job tracking with direct target database record read-back verification.
- **Dataset Package Explorer** — Real-time catalogue of registered packages, lifecycle states, lineage, and audit trails.
- **Dataset Governance Workflows** — On-demand validation evaluation, MASTERDB certification requests, and Knowledge Object registration.
- **MDU Schema Compliance** — Master Data Unit canonical schema inspection and schema compatibility evaluation.
- **TANTRA Integration** — Sovereign certification verification, retrieval readiness assessment, and runtime state lookup.
- **Cross-Service Telemetry** — Operational synchronization with Parikshak review references, Niyantran task states, and Replay Registry manifests.
- **System Administration** — Configuration compliance auditing, non-destructive backup exports, and protected snapshot restoration.

---

## 2. System Architecture

```
Browser (Control Center SPA)
  │
  ▼
MASTERDB FastAPI Backend (Port 8000 / Production URL)
  │
  ├── Package Registry / Artifacts
  ├── Validation & Certification Engine (MDU & TANTRA)
  ├── Controlled Ingestion Service (Session & Octet-Stream Manager)
  │
  └── Multi-Tier Sovereign Storage Engines
      ├── RelationalDB (SQLite / PostgreSQL)
      ├── VectorDB (High-Dimensional Semantic Embeddings)
      ├── DocumentStore (Semi-Structured JSON / Documents)
      ├── GraphStore (Knowledge Graphs & Relationships)
      ├── TimeSeriesDB (Temporal Telemetry & Logs)
      ├── LedgerDB (Cryptographic Append-Only Audit Ledger)
      └── ObjectStore (Binary Blobs & Large Archives)
```

---

## 3. Technology Stack

| Technology | Role |
|---|---|
| **React 18** | Component-based UI rendering |
| **TypeScript 5.6** | Strict end-to-end type safety |
| **React Router 6** | Client-side routing with SPA layouts |
| **Vite 6** | Fast build tooling and development proxy |
| **Vanilla CSS** | Hand-crafted design system with CSS custom properties (tokens) |
| **ESLint 9** | Code quality and standard adherence |

---

## 4. Quick Start & Local Development

### Prerequisites
- **Node.js** v18 or later (verified on v24.2.0)
- **npm** v8 or later (verified on v11.3.0)
- A running **MASTERDB FastAPI backend**

### Installation
```bash
# 1. Clone repository and install dependencies
git clone https://github.com/rahilmulani025/MASTERDB-Control-Center.git
cd MASTERDB-Control-Center
npm install

# 2. Configure environment (optional for local proxy)
cp .env.example .env

# 3. Start local development server
npm run dev
# Application available at http://127.0.0.1:5173
```

---

## 5. Build & Code Quality Commands

```bash
# Type-check TypeScript code (0 errors required)
npm run type-check

# Run ESLint linter (0 errors, 0 warnings required)
npm run lint

# Build production bundle to dist/
npm run build
```

---

## 6. Controlled Ingestion Workflow

The Control Center implements the complete authoritative Controlled Ingestion lifecycle:

```
[Select File] ──> [Compute SHA-256] ──> [POST /upload] ──> [POST /upload/{id}/content]
                                                                     │
[Read-Back Proof] <── [Job Polling] <── [POST /ingest] <── [POST /upload/{id}/validate]
```

1. **File Selection & Hash:** Browser reads file and calculates SHA-256 digest via Web Crypto API.
2. **Session Initialization:** `POST /upload` initializes upload session with metadata and checksum.
3. **Binary Streaming:** `POST /upload/{upload_id}/content` streams raw bytes with `Content-Type: application/octet-stream`.
4. **Pre-Ingestion Validation:** `POST /upload/{upload_id}/validate` verifies format structure.
5. **Dynamic Database Capability:** `GET /databases` fetches supported targets and filters by accepted format.
6. **Ingestion Submission:** `POST /ingest` authoritatively dispatches data to sovereign target store.
7. **Read-Back Verification:** `GET /databases/{key}/records/{id}` retrieves live persisted records over HTTP.

---

## 7. Documentation Directory

Complete engineering and architecture documentation is available in the [`docs/`](./docs) folder:

- [**`docs/MASTERDB_CONTROL_CENTER_SPEC.md`**](./docs/MASTERDB_CONTROL_CENTER_SPEC.md) — Comprehensive architectural and functional specification.
- [**`docs/MASTERDB_DASHBOARD_API_MAP.md`**](./docs/MASTERDB_DASHBOARD_API_MAP.md) — Authoritative backend API contract reference.
- [**`docs/MASTERDB_INGESTION_UI_FLOW.md`**](./docs/MASTERDB_INGESTION_UI_FLOW.md) — Controlled Ingestion lifecycle and UI flow documentation.
- [**`docs/MASTERDB_CONTROL_CENTER_PROOF.md`**](./docs/MASTERDB_CONTROL_CENTER_PROOF.md) — Formal end-to-end verification, RBAC security audit, and acceptance proof.
- [**`docs/HANDOFF.md`**](./docs/HANDOFF.md) — Complete engineering handoff and ownership boundaries.
- [**`docs/ROUTES.md`**](./docs/ROUTES.md) — Route map and page interactions.
- [**`docs/API-INTEGRATION.md`**](./docs/API-INTEGRATION.md) — Frontend API integration architecture.
- [**`docs/DEPLOYMENT.md`**](./docs/DEPLOYMENT.md) — Production hosting and reverse-proxy deployment guide.

---

## 8. Verification & Acceptance Standing

| Verification Item | Scope | Result |
|---|---|---|
| **E2E Ingestion Pipeline** | Live session init, octet-stream upload, format check, ingestion, persistence, and HTTP read-back | ✅ **PASS** |
| **RBAC Security Boundaries** | 401 unauthenticated, 403 unauthorized, server-side role assignment | ✅ **PASS** |
| **Storage Persistence** | Real records persisted and queried from RelationalDB engine | ✅ **PASS** |
| **TypeScript Strictness** | Full type-safety across all components, API clients, and page models | ✅ **PASS** (0 errors) |
| **ESLint Standards** | Static analysis compliance | ✅ **PASS** (0 errors) |
| **Production Build** | Optimized bundle compiled to `dist/` | ✅ **PASS** |
| **Zero Secret Leakage** | In-memory token storage, `.env` git-ignored, no hardcoded credentials | ✅ **PASS** |
