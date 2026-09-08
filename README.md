# MASTERDB Control Center

> Enterprise control-plane frontend for monitoring, validating, certifying, and governing MASTERDB dataset packages.

---

## 1. Overview

**MASTERDB** is a sovereign data-management platform that tracks dataset packages through a full governance lifecycle — from initial registration through validation, certification, knowledge-object tagging, and retrieval readiness.

This **Control Center** is the primary operational and governance interface for engineers and data-governance teams who work with MASTERDB. It provides:

- Real-time visibility into package states, lineage, and history
- Dataset governance workflows (validation, certification, knowledge-object registration)
- MDU schema inspection and compatibility checking
- TANTRA runtime integration and certification status
- Operational synchronization with downstream services (Parikshak, Niyantran)
- Shared data registry and service-contract inspection
- Admin controls: configuration audit, backup snapshot, protected restore
- Observability panel: health, readiness, and replay registry

The frontend is a **read-mostly** interface. Mutations are limited, explicit, and clearly marked in the codebase.

---

## 2. Architecture

```
Browser
  │
  ▼
MASTERDB Control Center  (React / TypeScript / Vite)
  │
  ▼
MASTERDB FastAPI Backend
  │
  ├── Package Registry / Artifacts
  │
  ├── MDU  (Master Data Unit — canonical schema & provenance)
  │
  ├── TANTRA  (certification & runtime registration authority)
  │
  ├── Parikshak  (engineering review service)
  │
  ├── Niyantran  (operational task lifecycle service)
  │
  └── Replay Registry  (replay-capable subsystem manifest)
```

**Responsibilities:**

| Layer | Responsibility |
|---|---|
| **This frontend** | UI rendering, user interactions, API orchestration, mutation safety |
| **MASTERDB backend** | Business logic, data storage, downstream service proxying |
| **MDU / TANTRA / etc.** | External services — accessed through MASTERDB backend only |

---

## 3. Features

### Control Plane
- **Dashboard** — live health, readiness, and high-level status summary
- **Dataset Explorer** — paginated list of all discovered packages
- **Observability** — health/readiness checks, replay registry manifest
- **System Administration** — configuration validation, backup, and protected restore

### Dataset Governance (per-package detail view)
- Package identity and lifecycle state
- Validation trigger and report
- MASTERDB certification trigger
- Lineage & provenance (MDU provenance events)
- MDU schema inspection
- MDU schema compatibility check
- TANTRA certification status
- Knowledge Object registration
- Retrieval readiness assessment
- TANTRA runtime state
- Audit completeness report
- Replay consistency verification
- Package transition history

### Administration
- System configuration report (read-only, no secrets)
- Backup snapshot export (explicitly triggered, not automatic)
- Protected snapshot restore (destructive, requires valid JSON + safety acknowledgement)

---

## 4. Technology Stack

| Package | Role |
|---|---|
| `react` | UI rendering |
| `react-dom` | DOM mounting |
| `react-router-dom` | Client-side routing |
| `typescript` | Type safety |
| `vite` | Build tool and dev server |
| `@vitejs/plugin-react` | React Fast Refresh |
| `eslint` + `typescript-eslint` | Linting |

No external charting, animation, or component libraries are used. CSS is hand-written vanilla CSS with design tokens.

---

## 5. Prerequisites

- **Node.js** v18 or later (verified on v24)
- **npm** v8 or later (verified on v11)
- A running **MASTERDB FastAPI backend** reachable at a known URL

---

## 6. Installation

```bash
npm install
```

---

## 7. Environment Setup

Copy the example file and configure it for your environment:

```bash
cp .env.example .env
```

Then edit `.env`:

```
VITE_MASTERDB_API_URL=http://127.0.0.1:8000
```

**For local development with the Vite proxy** (see `vite.config.ts`), you can leave `VITE_MASTERDB_API_URL` **blank** — the dev server's proxy rewrites API paths automatically.

**For production** with a reverse proxy serving both frontend and backend, leave `VITE_MASTERDB_API_URL` **blank** as well — API requests become relative paths, which the web server routes to the backend.

> ⚠️ All `VITE_` variables are compiled into the browser bundle and are **publicly visible**. Never put secrets, JWT signing keys, database passwords, or API tokens in `.env` files.

---

## 8. Running Locally

Ensure the MASTERDB backend is running first, then:

```bash
npm run dev
```

Frontend will be available at: `http://127.0.0.1:5173`

---

## 9. Production Build

```bash
npm run type-check   # 0 errors required
npm run lint         # 0 errors required
npm run build        # produces dist/
```

Output is emitted to `dist/`. Serve `dist/` as static files from any web server.

---

## 10. Reverse Proxy / Production Deployment

**Intended production topology:**

```
Browser
  │
  ▼
Web Server / Reverse Proxy (e.g. nginx, Caddy, Traefik)
  │
  ├── /           → serve dist/ (static frontend)
  │
  └── /health, /ready, /discovery, /packages, /validate,
      /status, /report, /certify, /mdu, /tantra, /runtime,
      /shared, /parikshak, /niyantran, /replay-registry,
      /admin, /auth
                  → proxy to MASTERDB FastAPI backend
```

When `VITE_MASTERDB_API_URL` is blank at build time, all API calls use relative paths (e.g. `/discovery/packages`), which the reverse proxy intercepts and forwards to the backend.

The exact reverse-proxy configuration (nginx, Caddy, etc.) is not included in this repository and must be configured by the deployment team.

---

## 11. Backend Dependency

The frontend has **no standalone functionality** — it requires the MASTERDB backend to be running and reachable.

- If the backend is unreachable, all data panels display error states.
- MDU-dependent panels (schema, compatibility, provenance) will show `unavailable` or `502` states when MDU is down.
- Admin endpoints require `bhiv-admin` role authorization on the backend.

---

## 12. Authentication

The frontend uses `POST /auth/token` to obtain a short-lived signed bearer token for admin operations. The token request includes:

```json
{ "actor": "control-center-admin", "roles": ["bhiv-admin"] }
```

The token is cached in memory and automatically refreshed before expiry. It is **only used for admin endpoints** (`/admin/configuration`, `/admin/backup`, `/admin/restore`).

Non-admin endpoints (health, discovery, packages, validation, certification, MDU, TANTRA, operations) do not require authentication tokens from the frontend.

---

## 13. API Integration Reference

### Health

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/ready` | Readiness/dependency checks |

### Discovery

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/discovery/packages` | List all discoverable packages |

### Packages

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/packages/{package_id}` | Full package detail |
| GET | `/packages/{package_id}/history` | Governance lifecycle history |
| GET | `/packages/{package_id}/lineage` | Lineage (ancestors/descendants) |
| GET | `/packages/{package_id}/retrieval` | Retrieval evidence |
| GET | `/packages/{package_id}/audit` | Audit completeness report |
| GET | `/packages/{package_id}/replay` | Replay consistency verification |
| POST | `/packages/{package_id}/knowledge-object` | Register a knowledge object |

### Validation

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/validate` | Trigger validation (uses `dataset_id`) |
| GET | `/status/{dataset_id}` | Compact validation status |
| GET | `/report/{dataset_id}` | Full validation report |

### Certification

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/certify` | Trigger MASTERDB certification |

### MDU

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/mdu/provenance/{dataset_id}` | MDU provenance events |
| GET | `/mdu/schema/{dataset_id}` | Canonical schema from MDU |
| GET | `/mdu/schema-compatibility/{dataset_id}` | Schema compatibility check |

### TANTRA

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/tantra/certification/{dataset_id}` | TANTRA certification status |
| GET | `/tantra/packages/{package_id}/retrieval-readiness` | Retrieval readiness via TANTRA |
| GET | `/tantra/packages/{package_id}/runtime` | Bundled TANTRA runtime state |

### Runtime / Operations

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/runtime/identity` | TANTRA runtime identity manifest |
| GET | `/shared/registry` | Shared data registry entries |
| GET | `/shared/contracts` | Shared service convergence contracts |
| GET | `/parikshak/review-references` | Parikshak sync status |
| GET | `/niyantran/task-state` | Niyantran task lifecycle sync |
| GET | `/replay-registry/manifest` | Replay-capable subsystem manifest |

### Admin

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/configuration` | Configuration validation report |
| GET | `/admin/backup` | Generate backup snapshot (controlled) |
| POST | `/admin/restore` | Restore from snapshot (destructive) |

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/token` | Obtain signed bearer token for admin ops |

---

## 14. Package ID vs Dataset ID

This is a critical integration detail:

- **`package_id`** — used by the package registry APIs (`/packages/{package_id}/*`). Identifies the physical artifact/package.
- **`dataset_id`** — used by validation, MDU, and TANTRA APIs (`/validate`, `/mdu/schema/{dataset_id}`, `/tantra/certification/{dataset_id}`). Refers to the logical dataset identity.

The **Dataset Details** page resolves both: it fetches the package by `package_id` (from the URL), extracts `dataset_id` from the package detail response, then uses `dataset_id` for all downstream governance API calls. Future developers must preserve this mapping.

---

## 15. Governance Lifecycle

Packages progress through the following conceptual lifecycle:

```
REGISTERED
    ↓
VALIDATED         — validation passes against schema/rules
    ↓
CERTIFIED         — MASTERDB certification granted
    ↓
KNOWLEDGE OBJECT  — registered with provenance/lineage pointer
    ↓
RETRIEVAL READY   — cleared for use in downstream systems
```

Not all packages automatically progress to every stage. Transitions are triggered by explicit actions or external events.

---

## 16. Admin Safety

The Admin page implements several safety boundaries:

| Operation | Safety behaviour |
|---|---|
| Configuration | **Read-only** — inspection only, never writes config |
| Backup | **Explicitly triggered** — user must click "Generate Backup". Never called on page load. |
| Restore | **Destructive** — requires valid JSON input, user acknowledgement checkbox, and confirm dialog before executing |
| Auth token | **Short-lived** — cached in memory, not persisted to localStorage or cookies |

---

## 17. Security Notes

- No secrets are embedded in frontend source code
- `VITE_MASTERDB_API_URL` is the only `VITE_` variable — it is a URL, not a secret
- Sensitive credentials (`AUTH_JWT_SECRET`, `MDU_API_KEY`, database credentials) remain solely on the backend
- `.env`, `.env.local`, `.env.*.local` are all listed in `.gitignore`
- Admin bearer tokens are obtained at runtime from the backend — no static tokens exist in the frontend
- Admin operations are gated by backend `bhiv-admin` role authorization

---

## 18. Known Limitations

These items are **intentionally deferred** from Stage 1:

| Item | Status |
|---|---|
| Browser-side dataset ingestion/upload | Deferred — backend upload contract not implemented |
| Server-side package search | Not available — discovery endpoint does not accept search parameters |
| Outbound telemetry push mutations | Read-only only — backend governance does not permit frontend-push telemetry |

These are **deferred design decisions**, not bugs.

---

## 19. Troubleshooting

### Frontend cannot connect to backend
- Verify the MASTERDB backend is running
- Check `VITE_MASTERDB_API_URL` in `.env`
- Open browser DevTools → Network tab and inspect failing requests
- Try `curl http://127.0.0.1:8000/health` from your terminal

### MDU panels show "unavailable"
MDU-dependent panels (schema, compatibility, provenance) legitimately show unavailable or 502 states when MDU is not accessible from the MASTERDB backend. This is expected in environments without MDU.

### Admin access denied (403)
Admin endpoints require the backend to authorize `bhiv-admin` role. Check backend configuration and `auth/token` endpoint availability.

### Build fails
```bash
npm run type-check   # identify TypeScript errors first
npm run lint         # identify lint errors
npm run build        # only run after the above pass
```
Inspect the first failure — do not suppress errors.

---

## 20. Verification Status

| Check | Result |
|---|---|
| `npm run type-check` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors, 0 warnings |
| `npm run build` | ✅ Clean production build |
| Live browser smoke test | ✅ All pages rendered and functional |
| API contract verification | ✅ All endpoints verified against live backend |
| Mutation safety | ✅ Destructive restore requires explicit acknowledgement |
| Admin token handling | ✅ Runtime-only, not persisted |
| No secrets in frontend | ✅ Verified |
| No machine-specific paths | ✅ Verified |
| No mock/demo data | ✅ All data from live backend |
