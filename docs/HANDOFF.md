# MASTERDB Control Center — Developer Handoff

> A developer joining the project should understand the system in 10–15 minutes by reading this document.

---

## 1. Project Purpose

MASTERDB Control Center is an **enterprise governance frontend** for the MASTERDB dataset management platform. It gives engineers and data governance teams:

- Visibility into the full lifecycle of every registered dataset package
- Tooling to trigger and inspect validation, certification, and knowledge-object registration
- Read-only inspection of schemas, compatibility reports, provenance, and audit logs
- Admin controls for configuration auditing, backup, and protected data restore
- Cross-service operational views (Parikshak, Niyantran, Replay Registry)

The frontend does **not** have its own persistent storage. All state lives in the MASTERDB backend.

---

## 2. Repository Structure

```
MASTERDB-Control-Center-Stage1/
│
├── README.md                  # Project overview and quick-start
├── package.json               # Scripts and dependencies
├── package-lock.json          # Locked dependency tree
├── vite.config.ts             # Vite build config + dev proxy rules
├── tsconfig.json              # TypeScript project references root
├── tsconfig.app.json          # App source TypeScript config
├── tsconfig.node.json         # Node/Vite config TypeScript config
├── eslint.config.js           # ESLint configuration
├── index.html                 # Vite HTML entrypoint
├── .env.example               # Environment variable template
├── .gitignore                 # Files excluded from version control
│
├── docs/
│   ├── HANDOFF.md             # This file — developer onboarding guide
│   ├── ROUTES.md              # Route reference
│   ├── API-INTEGRATION.md     # API endpoint reference
│   └── DEPLOYMENT.md          # Deployment guide
│
├── Reffrences/
│   ├── API_DOCUMENTATION.md   # Original backend API reference document
│   └── *.zip                  # Backend source reference archive
│
├── backend/
│   └── bhiv-masterdb-ingestion-certification-service-main/
│                              # Backend source reference (for API inspection only)
│
└── src/
    ├── api/                   # All backend API call functions
    ├── app/                   # React app entry (App.tsx)
    ├── components/            # Reusable UI primitives (ui.tsx)
    ├── layouts/               # AppShell (persistent navigation + shell)
    ├── lib/                   # Configuration (config.ts)
    ├── pages/                 # All page implementations (Pages.tsx)
    ├── routes/                # React Router definition (router.tsx)
    ├── styles/                # Global CSS design system (global.css)
    ├── types/                 # TypeScript types for all API shapes (masterdb.ts)
    ├── main.tsx               # Vite/React bootstrap
    └── vite-env.d.ts          # Vite env type declarations
```

---

## 3. Frontend Architecture

### Entry Point
`src/main.tsx` → mounts `<App />` into `#root`

### App
`src/app/App.tsx` → renders `<RouterProvider>` with the router

### Router
`src/routes/router.tsx` → defines all routes, wrapping them in `<AppShell>`

### AppShell
`src/layouts/AppShell.tsx` → persistent navigation sidebar + header; renders `<Outlet>` for page content

### Pages
`src/pages/Pages.tsx` → all page components in a single file. Each page is a React component that:
- Calls the appropriate API function(s) via `useEffect`
- Manages local state (`useState`) for loading, error, and data
- Renders content using shared UI primitives from `src/components/ui.tsx`

### UI Primitives
`src/components/ui.tsx` → lightweight shared components: `StatusBadge`, `MetaRow`, `Section`, `ErrorPanel`, `LoadingSpinner`, etc.

### API Layer
`src/api/` — one file per backend subsystem. Each file exports typed async functions that call `apiClient.request()`.

`src/api/client.ts` — the `ApiClient` class:
- Constructs absolute URLs when `VITE_MASTERDB_API_URL` is set, relative paths otherwise
- Applies a 10-second request timeout via `AbortController`
- Normalizes HTTP and network errors into a consistent `APIError` shape
- Handles both JSON and plain-text responses

### Configuration
`src/lib/config.ts` — reads `VITE_MASTERDB_API_URL` from the Vite environment, strips trailing slash.

### Types
`src/types/masterdb.ts` — TypeScript interfaces for every API response and request body. These mirror the backend Pydantic schemas.

### Styles
`src/styles/global.css` — vanilla CSS design system with CSS custom properties (design tokens), dark theme, component classes, and responsive layout utilities.

---

## 4. API Architecture

### Design Principles
- All API calls go through `ApiClient.request<T>()` — no raw `fetch` in page components
- API modules export pure async functions — no React hooks
- Pages call API functions inside `useEffect` and manage their own loading/error/data state
- Mutations (POST) are all explicit user actions — never triggered on mount except token refresh

### Admin Token Flow
Admin operations require a bearer token:
1. `getAdminToken()` in `src/api/admin.ts` calls `POST /auth/token`
2. The token is cached in module-level memory (not localStorage)
3. The token is refreshed if < 60 seconds remain before expiry
4. The token is attached as `Authorization: Bearer <token>` on admin requests

---

## 5. Data Flow (Typical Page)

```
User navigates to /datasets/:datasetId
  │
  ▼
DatasetDetails component mounts
  │
  ▼
useEffect fires
  │
  ├── getPackage(packageId)          → GET /packages/{package_id}
  │     └── extracts dataset_id from response
  │
  ├── getValidationStatus(datasetId) → GET /status/{dataset_id}
  ├── getValidationReport(datasetId) → GET /report/{dataset_id}
  ├── getPackageHistory(packageId)   → GET /packages/{package_id}/history
  ├── getPackageLineage(packageId)   → GET /packages/{package_id}/lineage
  ├── getMDUProvenance(datasetId)    → GET /mdu/provenance/{dataset_id}
  ├── getMDUSchema(datasetId)        → GET /mdu/schema/{dataset_id}
  ├── ... (more parallel calls)
  │
  ▼
State updates → component re-renders with data, loading, or error states
```

All calls are independent and fire concurrently via `Promise.allSettled` or parallel `useEffect` calls.

---

## 6. Route Map

| Path | Component | Live data |
|---|---|---|
| `/` | redirect → `/dashboard` | — |
| `/dashboard` | `Dashboard` | health, readiness |
| `/datasets` | `Datasets` | discovery packages |
| `/datasets/:datasetId` | `DatasetDetails` | all package governance APIs |
| `/ingestion` | `Ingestion` | architecture page only (read-only) |
| `/ingestion/jobs` | `Jobs` | architecture page only (read-only) |
| `/observability` | `Observability` | health, readiness, replay registry |
| `/admin` | `Admin` | admin token, configuration, backup, restore |
| `/admin/system` | `Admin` | same as `/admin` |
| `/admin/shared-data` | `Placeholder` | shared registry, contracts |
| `*` | `NotFound` | none |

---

## 7. API Module Map

| File | Subsystem | Functions |
|---|---|---|
| `health.ts` | Health/Readiness | `getHealth`, `getReadiness` |
| `discovery.ts` | Discovery | `getDiscoveredPackages` |
| `packages.ts` | Packages | `getPackage`, `getPackageHistory` |
| `validation.ts` | Validation | `validateDataset`, `getValidationStatus`, `getValidationReport` |
| `certification.ts` | Certification | `certifyDataset` |
| `lineage.ts` | Lineage | `getPackageLineage` |
| `mdu.ts` | MDU | `getMDUProvenance`, `getMDUSchema`, `getMDUSchemaCompatibility` |
| `tantra.ts` | TANTRA | `getTantraCertification`, `getRetrievalReadiness`, `getPackageRuntime` |
| `retrieval.ts` | Retrieval | `getPackageRetrieval` |
| `knowledgeObject.ts` | Knowledge Objects | `registerKnowledgeObject` |
| `audit.ts` | Audit/Replay | `getPackageAudit`, `getPackageReplay` |
| `operations.ts` | Operations | `getRuntimeIdentity`, `getSharedRegistry`, `getSharedContracts`, `getParikshakReviewReferences`, `getNiyantranTaskState`, `getReplayRegistryManifest` |
| `admin.ts` | Admin | `getAdminToken`, `getAdminConfiguration`, `createAdminBackup`, `restoreAdminBackup` |
| `auth.ts` | Auth | (empty — token logic is in admin.ts) |
| `ingestion.ts` | Ingestion | (empty — deferred Stage 2) |
| `client.ts` | HTTP client | `ApiClient`, `apiClient` |
| `index.ts` | Re-export | `apiClient` |

---

## 8. Dataset / Package Identifier Mapping

**This is the most important integration detail for future developers.**

Two distinct identifier types are used:

| Identifier | Source | Used By |
|---|---|---|
| `package_id` | URL path parameter (from discovery list) | `/packages/{package_id}/*` endpoints |
| `dataset_id` | Field inside the package detail response | `/validate`, `/status`, `/report`, `/certify`, `/mdu/*`, `/tantra/certification/*` |

**Example flow:**
1. User clicks a package in the Dataset Explorer → navigates to `/datasets/{package_id}`
2. `DatasetDetails` loads `GET /packages/{package_id}` → response contains `dataset_id`
3. All downstream governance calls use the extracted `dataset_id`

Do not pass `package_id` to endpoints that expect `dataset_id`. They are different values.

---

## 9. Mutation Endpoints

All write operations in the frontend. These should be reviewed carefully.

| Function | Method | Endpoint | Trigger |
|---|---|---|---|
| `validateDataset` | POST | `/validate` | User clicks "Run Validation" |
| `certifyDataset` | POST | `/certify` | User clicks "Request Certification" |
| `registerKnowledgeObject` | POST | `/packages/{id}/knowledge-object` | User submits KO form |
| `createAdminBackup` | GET | `/admin/backup` | User clicks "Generate Backup" |
| `restoreAdminBackup` | POST | `/admin/restore` | User confirms restore dialog |
| `getAdminToken` | POST | `/auth/token` | Auto, before admin API calls |

---

## 10. Read-Only Endpoints

All other endpoints are read-only (GET). See `docs/API-INTEGRATION.md` for the full reference.

---

## 11. Admin Safety Boundaries

| Boundary | Implementation |
|---|---|
| Configuration | GET only — never POSTs configuration changes |
| Backup | User must click button — never called on component mount |
| Restore | Requires: valid JSON in textarea, checkbox acknowledgement, confirm dialog |
| Token | Memory-only, 1-minute expiry buffer, never stored persistently |

---

## 12. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_MASTERDB_API_URL` | Optional | Base URL for the MASTERDB backend. Leave blank to use Vite proxy (dev) or relative paths (production). |

Only one environment variable. No secrets, no tokens, no credentials.

---

## 13. Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env
# Edit .env if needed — can leave VITE_MASTERDB_API_URL blank to use Vite proxy

# 3. Start MASTERDB backend (separate terminal)
# (follow backend repo instructions)

# 4. Start frontend dev server
npm run dev
# → http://127.0.0.1:5173
```

The Vite dev server in `vite.config.ts` proxies these paths to `http://127.0.0.1:8000`:
`/health`, `/ready`, `/discovery`, `/packages`, `/validate`, `/status`, `/report`, `/certify`, `/mdu`, `/tantra`, `/runtime`, `/shared`, `/parikshak`, `/niyantran`, `/replay-registry`, `/admin`, `/auth`

---

## 14. Production Deployment Considerations

See `docs/DEPLOYMENT.md` for the full guide. Key points:

1. Run `npm run build` → produces `dist/`
2. Serve `dist/` as static files
3. Configure your reverse proxy to forward all API paths to the MASTERDB backend
4. Set `VITE_MASTERDB_API_URL=` (blank) at build time if using a reverse proxy on the same host
5. Set `VITE_MASTERDB_API_URL=https://api.yourhost.com` if the backend is on a different host

---

## 15. Known Limitations (Stage 1)

| Limitation | Reason |
|---|---|
| No browser-side dataset upload/ingestion | Backend upload contract not defined in Stage 1 |
| No server-side package search/filter | Discovery endpoint returns full list only — no search parameters |
| No outbound telemetry mutations | Frontend-initiated telemetry push not within Stage 1 governance scope |
| Ingestion & Jobs pages are informational | Architecture overview pages only — backend contract pending |

---

## 16. Future Stage 2 Considerations

The following functionality is **outside Stage 1 scope** and may be addressed in Stage 2:

- **Browser-side ingestion** — if the backend exposes a multipart upload or ingestion-job API with clear contract, the `src/api/ingestion.ts` stub and `Ingestion`/`Jobs` pages are ready to be extended
- **Server-side package search** — if the discovery endpoint gains query parameters, the Dataset Explorer can be enhanced with a search UI
- **Outbound telemetry controls** — if governance permits frontend-initiated telemetry push, the Observability panel is the natural location
- **Real-time updates** — if the backend gains WebSocket or SSE endpoints, the Dashboard and Observability panels could be extended
- **Additional operational capabilities** — as downstream services (Parikshak, Niyantran) expose more backend APIs, corresponding frontend panels can be added to the Operations section
- **Authentication / login UI** — if the backend adds user-scoped authentication (not just service role tokens), a login page may be appropriate
