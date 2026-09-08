# MASTERDB Control Center — Route Reference

All routes are wrapped inside `<AppShell>` (persistent sidebar navigation + header). The router is defined in `src/routes/router.tsx`.

---

## Route Table

| Path | Component | Live Backend Data | Key APIs |
|---|---|---|---|
| `/` | (redirect) | — | Redirects to `/dashboard` |
| `/dashboard` | `Dashboard` | Yes | `GET /health`, `GET /ready` |
| `/datasets` | `Datasets` | Yes | `GET /discovery/packages` |
| `/datasets/:datasetId` | `DatasetDetails` | Yes | See below |
| `/ingestion` | `Ingestion` | No | Architecture overview only |
| `/ingestion/jobs` | `Jobs` | No | Architecture overview only |
| `/governance` | `Placeholder` | No | Placeholder (navigation entry) |
| `/governance/validation` | `Placeholder` | No | Placeholder |
| `/governance/certification` | `Placeholder` | No | Placeholder |
| `/governance/retrieval` | `Placeholder` | No | Placeholder |
| `/lineage` | `Placeholder` | No | Placeholder |
| `/audit` | `Placeholder` | No | Placeholder |
| `/observability` | `Observability` | Yes | `GET /health`, `GET /ready`, `GET /replay-registry/manifest` |
| `/admin` | `Admin` | Yes | `POST /auth/token`, `GET /admin/configuration`, `GET /admin/backup`, `POST /admin/restore` |
| `/admin/system` | `Admin` | Yes | Same as `/admin` |
| `/admin/shared-data` | `Placeholder` | Partial | `GET /shared/registry`, `GET /shared/contracts` |
| `*` | `NotFound` | No | 404 page |

---

## Route Detail

### `/dashboard`

**Purpose:** Control-plane overview. Shows live MASTERDB backend liveness and readiness status.

**APIs used:**
- `GET /health` → liveness status
- `GET /ready` → dependency readiness checks

**Behavior:** Polls on mount. Displays health indicator, dependency status list, and link to Dataset Explorer.

---

### `/datasets`

**Purpose:** Dataset Explorer. Lists all discoverable dataset packages.

**APIs used:**
- `GET /discovery/packages` → returns array of package metadata

**Behavior:** Loads all packages on mount. Each row links to `/datasets/{package_id}`.

**Note:** Discovery returns the full package list. There is no server-side search or pagination in Stage 1.

---

### `/datasets/:datasetId`

**Purpose:** Full governance detail view for a single package. The `:datasetId` URL parameter is the `package_id` (not the logical `dataset_id`).

**APIs used (all called on mount):**
- `GET /packages/{package_id}` — package identity and state (also extracts `dataset_id`)
- `GET /packages/{package_id}/history` — transition history
- `GET /packages/{package_id}/lineage` — lineage and ancestors
- `GET /packages/{package_id}/retrieval` — retrieval evidence
- `GET /packages/{package_id}/audit` — audit completeness report
- `GET /packages/{package_id}/replay` — replay consistency
- `GET /status/{dataset_id}` — validation status
- `GET /report/{dataset_id}` — validation report
- `GET /mdu/provenance/{dataset_id}` — MDU provenance events
- `GET /mdu/schema/{dataset_id}` — canonical schema
- `GET /mdu/schema-compatibility/{dataset_id}` — schema compatibility
- `GET /tantra/certification/{dataset_id}` — TANTRA certification
- `GET /tantra/packages/{package_id}/retrieval-readiness` — retrieval readiness via TANTRA
- `GET /tantra/packages/{package_id}/runtime` — bundled runtime state

**Mutation triggers (explicit user action only):**
- `POST /validate` — user clicks "Run Validation"
- `POST /certify` — user clicks "Request Certification"
- `POST /packages/{package_id}/knowledge-object` — user submits KO form

**Important:** `:datasetId` in the URL path is the `package_id`. The logical `dataset_id` is resolved from the package detail response. See `docs/HANDOFF.md` §8.

---

### `/ingestion`

**Purpose:** Ingestion Architecture page. Describes the intended ingestion workflow conceptually.

**Live data:** None. This is an informational/architecture page.

**Stage 2 note:** When a backend ingestion API contract is defined, this page is the intended location for the upload UI.

---

### `/ingestion/jobs`

**Purpose:** Ingestion Jobs page. Companion to `/ingestion`.

**Live data:** None in Stage 1.

---

### `/observability`

**Purpose:** System observability panel. Shows live health, readiness, runtime identity, and replay registry.

**APIs used:**
- `GET /health`
- `GET /ready`
- `GET /replay-registry/manifest`
- `GET /runtime/identity` (TANTRA runtime identity)
- `GET /shared/registry`
- `GET /shared/contracts`
- `GET /parikshak/review-references`
- `GET /niyantran/task-state`

**Behavior:** All data loaded on mount, read-only.

---

### `/admin` and `/admin/system`

**Purpose:** Admin control panel. Configuration audit, backup, and protected restore.

**APIs used:**
- `POST /auth/token` — obtain admin bearer token
- `GET /admin/configuration` — configuration validation report
- `GET /admin/backup` — generate backup snapshot (user-triggered)
- `POST /admin/restore` — restore from snapshot (user-confirmed)

**Safety:** Backup requires explicit button click. Restore requires: valid JSON, acknowledgement checkbox, and confirm dialog.

---

### `/admin/shared-data`

**Purpose:** Placeholder for Shared Data Registry inspection.

**Current state:** Placeholder component. The Observability page already renders shared registry and contract data.

---

### `*` (NotFound)

**Purpose:** Catch-all 404 page. Renders for any unmatched path.

---

## Redirect Behavior

| From | To | Type |
|---|---|---|
| `/` | `/dashboard` | `<Navigate replace>` |
