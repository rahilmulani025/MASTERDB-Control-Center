# MASTERDB Control Center — Engineering Handoff

> Complete engineering guide and operational handoff for the MASTERDB Control Center and Controlled Data Ingestion system.

---

## 1. Project Overview

The **MASTERDB Control Center** is the unified enterprise frontend for the sovereign MASTERDB platform. It provides operational visibility, dataset governance tracking, schema compliance inspection, and end-to-end **Controlled Data Ingestion** across multiple sovereign database engines.

> **Key Architectural Principle:** The Control Center is an interface over authoritative MASTERDB APIs. It does not contain its own database or replace backend ingestion, routing, or governance logic.

---

## 2. Ownership & Responsibility Boundaries

| Area | Lead | Core Responsibilities |
|---|---|---|
| **Frontend & UI/UX** | **Rahil** | MASTERDB Control Center SPA, UI design system, React component hierarchy, API client orchestration, controlled ingestion workflow wizard, job polling, evidence display, and database read-back inspection. |
| **Backend & Ingestion** | **Kavy** | MASTERDB FastAPI service, authoritative REST contracts, sovereign storage persistence, database routing, server-side RBAC enforcement, validation engine, certification gates, and audit trails. |

---

## 3. System Architecture

```
                               ┌──────────────────────────────────────────────┐
                               │           Web Browser (Control Center)       │
                               │        React 18 + TypeScript + Vanilla CSS   │
                               └──────────────────────┬───────────────────────┘
                                                      │
                                                      │ REST (JSON & Octet-Stream)
                                                      │ Bearer Auth
                                                      ▼
                               ┌──────────────────────────────────────────────┐
                               │           MASTERDB FastAPI Backend           │
                               │        (Port 8000 / Production URL)          │
                               └───────┬──────────────┬──────────────┬────────┘
                                       │              │              │
                       ┌───────────────┘              │              └───────────────┐
                       ▼                              ▼                              ▼
          ┌──────────────────────────┐   ┌──────────────────────────┐   ┌──────────────────────────┐
          │     Package Registry     │   │    Validation & Cert     │   │ Controlled Ingestion Svc │
          │ - Package metadata       │   │ - MDU Schema Engine      │   │ - Session & Hash Verify  │
          │ - Lifecycle states       │   │ - TANTRA Cert Gates      │   │ - Target DB Routing      │
          │ - Lineage & Provenance   │   │ - Rule-based validation  │   │ - Read-Back Verification │
          └──────────────────────────┘   └──────────────────────────┘   └─────────────┬────────────┘
                                                                                      │
                                 ┌────────────────────────────────────────────────────┴────────────────────────────────┐
                                 ▼                              ▼                              ▼                       ▼
                       ┌───────────────────┐          ┌───────────────────┐          ┌───────────────────┐   ┌───────────────────┐
                       │   RelationalDB    │          │     VectorDB      │          │   DocumentStore   │   │  Ledger / Object  │
                       │ (SQLite/Postgres) │          │(FAISS / Embeddings│          │  (JSON / Reports) │   │  (Audit / Blobs)  │
                       └───────────────────┘          └───────────────────┘          └───────────────────┘   └───────────────────┘
```

---

## 4. Frontend Codebase Organization

```
src/
├── api/                       # Typed API client modules (one per subsystem)
│   ├── admin.ts               # Configuration, backup, and restore
│   ├── auth.ts                # Token acquisition and session state
│   ├── client.ts              # Unified ApiClient with error unwrapping and timeout
│   ├── discovery.ts           # Package catalogue discovery
│   ├── health.ts              # System liveness and readiness
│   ├── ingestion.ts           # Controlled ingestion submission and job tracking
│   ├── lineage.ts             # Lineage graph fetching
│   ├── mdu.ts                 # Canonical MDU schema and compatibility
│   ├── operations.ts          # Operational sync (Parikshak, Niyantran, Replay)
│   ├── packages.ts            # Package detail, history, audit, and replay
│   ├── tantra.ts              # TANTRA certification and runtime state
│   ├── upload.ts              # Upload session init, binary transfer, format check
│   └── validation.ts          # Dataset validation and certification triggers
├── components/
│   └── ui.tsx                 # Shared UI primitives (StatusBadge, DataTable, Modal, Cards)
├── layouts/
│   └── AppShell.tsx           # Persistent sidebar navigation and header
├── pages/
│   ├── ControlledIngestion.tsx# Full-lifecycle 4-step controlled ingestion wizard
│   ├── IngestionJobs.tsx      # Real-time ingestion job monitor with read-back proof
│   └── Pages.tsx              # Dashboard, Datasets, DatasetDetails, Observability, Admin
├── routes/
│   └── router.tsx             # React Router route tree
├── styles/
│   └── global.css             # Vanilla CSS design tokens and dark mode styling
├── types/
│   └── masterdb.ts            # Strict TypeScript interfaces matching backend models
└── main.tsx                   # React 18 DOM mount point
```

---

## 5. Controlled Ingestion Integration

The Controlled Ingestion interface implements a secure, validated 4-step workflow:

1. **File Selection & Checksum:** Computes SHA-256 in the browser before transfer.
2. **Session Initialization (`POST /upload`):** Registers expected file size, format, and hash.
3. **Binary Octet-Stream Transfer (`POST /upload/{id}/content`):** Streams file with `Content-Type: application/octet-stream`.
4. **Pre-Validation (`POST /upload/{id}/validate`):** Verifies file structure and records detected.
5. **Dynamic Target DB Selection:** Fetches supported targets via `GET /databases` and dynamically disables incompatible engines.
6. **Ingestion Submission (`POST /ingest`):** Dispatches job with top-level `upload_id`, `package_id`, and `dataset_id`.
7. **Job Polling & Target DB Read-Back:** Polls `GET /ingest/jobs/{id}` and executes `GET /databases/{key}/records/{dataset_id}` for verified evidence.

---

## 6. Authentication & RBAC

- **Endpoint:** `POST /auth/token`
- **Request:** `{"actor": "bhiv-admin", "password": null, "roles": ["ignored"]}`
- **Server Authority:** The backend assigns roles server-side based on `actor`. Client-supplied roles are safely ignored.
- **In-Memory Caching:** The JWT access token is stored in memory (never written to `localStorage` or `cookies`) and refreshed automatically before expiration.
- **Protected Actions:**
  - `POST /upload` and `POST /ingest` require `operator` or `admin` or `bhiv-admin`.
  - `/admin/*` endpoints require `bhiv-admin`.
  - Unauthenticated requests return `401 Unauthorized`.
  - Unauthorized roles return `403 Forbidden`.

---

## 7. Environment Configuration

The application uses a single environment variable:

| Variable | Default (Local Dev) | Description |
|---|---|---|
| `VITE_MASTERDB_API_URL` | `""` (Empty string) | Base URL of the MASTERDB backend service. |

- **Local Development:** When left empty, Vite dev server proxies API calls to `http://127.0.0.1:8000`.
- **Production (Reverse Proxy):** When left empty, browser requests use relative paths (`/health`, `/ingest`), which the reverse proxy (Nginx, Caddy) routes to the backend.
- **Production (Direct Cross-Origin):** Set `VITE_MASTERDB_API_URL=https://api.yourhost.com` if frontend and backend are hosted on separate domains.

---

## 8. Local Setup & Commands

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
# Running at http://127.0.0.1:5173

# 3. Type-check TypeScript codebase
npm run type-check

# 4. Run ESLint code quality checks
npm run lint

# 5. Build production bundle
npm run build
# Emits compiled assets to dist/
```

---

## 9. Verification & Acceptance Summary

The system is fully verified against the authoritative live backend:

- **E2E Proof:** Upload `upl-613917ce2612` → Ingestion `ingest-26afcc5fcae7` → State `PERSISTED` → Read-back returned 2 verified records.
- **Type-Check:** 0 TypeScript compilation errors.
- **Lint:** 0 ESLint warnings or errors.
- **Build:** Clean production bundle generated.
- **Security:** Verified 401, 403, path traversal protection, server-side role assignment, and zero credential leakage.
