# MASTERDB Control Center — API Integration Reference

This document is for **frontend maintainers**. It describes every backend endpoint the frontend calls, organized by subsystem. It is not a full OpenAPI document.

For implementation details, see the corresponding file in `src/api/`.

---

## Identifier Notes

Before reading this reference, understand the two identifiers used:

| Identifier | Meaning |
|---|---|
| `package_id` | Physical artifact/package identifier — used in `/packages/{package_id}/*` |
| `dataset_id` | Logical dataset identifier — used in `/validate`, `/status`, `/report`, `/certify`, `/mdu/*`, `/tantra/certification/*` |

These are **different values**. `dataset_id` is extracted from the package detail response.

---

## Health

**Source file:** `src/api/health.ts`

| Method | Path | Classification | Frontend purpose |
|---|---|---|---|
| GET | `/health` | Read-only | Liveness check — displayed on Dashboard and Observability |
| GET | `/ready` | Read-only | Readiness checks — dependency status displayed on Dashboard and Observability |

**Response shapes:**
- `/health` → `HealthResponse { status: string }`
- `/ready` → `ReadinessResponse { status: string, checks: Record<string, unknown> }`

---

## Discovery

**Source file:** `src/api/discovery.ts`

| Method | Path | Classification | Frontend purpose |
|---|---|---|---|
| GET | `/discovery/packages` | Read-only | Fetches full package list for Dataset Explorer |

**Response shape:** `DiscoveryResponse` — array of package metadata objects

**Note:** No search parameters are supported. The full list is returned. Filtering is done client-side.

---

## Packages

**Source file:** `src/api/packages.ts`, `src/api/lineage.ts`, `src/api/retrieval.ts`, `src/api/audit.ts`

| Method | Path | Classification | Frontend purpose |
|---|---|---|---|
| GET | `/packages/{package_id}` | Read-only | Full package detail; extracts `dataset_id` |
| GET | `/packages/{package_id}/history` | Read-only | Governance transition history |
| GET | `/packages/{package_id}/lineage` | Read-only | Lineage (ancestors and descendants) |
| GET | `/packages/{package_id}/retrieval` | Read-only | Retrieval evidence and rule evaluations |
| GET | `/packages/{package_id}/audit` | Read-only | Audit completeness report |
| GET | `/packages/{package_id}/replay` | Read-only | Replay consistency verification |
| POST | `/packages/{package_id}/knowledge-object` | **Mutation** | Register a knowledge object (user-triggered) |

**Key mapping:** `package_id` comes from the URL parameter `:datasetId` in the route `/datasets/:datasetId`.

---

## Validation

**Source file:** `src/api/validation.ts`

| Method | Path | Classification | Frontend purpose |
|---|---|---|---|
| POST | `/validate` | **Mutation** | Trigger validation run (user-triggered) |
| GET | `/status/{dataset_id}` | Read-only | Compact validation status |
| GET | `/report/{dataset_id}` | Read-only | Full validation report with field-level results |

**Request body for POST `/validate`:**
```json
{
  "dataset_id": "<dataset_id>",
  "package_id": "<package_id>"
}
```

**Note:** Uses `dataset_id`, not `package_id`, for the GET paths.

---

## Certification

**Source file:** `src/api/certification.ts`

| Method | Path | Classification | Frontend purpose |
|---|---|---|---|
| POST | `/certify` | **Mutation** | Trigger MASTERDB certification (user-triggered) |

**Request body:**
```json
{
  "dataset_id": "<dataset_id>",
  "package_id": "<package_id>"
}
```

---

## MDU (Master Data Unit)

**Source file:** `src/api/mdu.ts`

| Method | Path | Classification | Frontend purpose |
|---|---|---|---|
| GET | `/mdu/provenance/{dataset_id}` | Read-only | MDU provenance event history |
| GET | `/mdu/schema/{dataset_id}` | Read-only | Canonical schema contract from MDU |
| GET | `/mdu/schema-compatibility/{dataset_id}` | Read-only | Schema compatibility between local version and MDU |

**Query parameter for compatibility:**
- `?local_schema_version=<version>` (default: `1.0`)

**Availability:** MDU endpoints may return 502/unavailable if MDU is not accessible from the backend. This is expected and handled gracefully in the UI.

---

## TANTRA

**Source file:** `src/api/tantra.ts`

| Method | Path | Classification | Frontend purpose |
|---|---|---|---|
| GET | `/tantra/certification/{dataset_id}` | Read-only | TANTRA certification status for a dataset |
| GET | `/tantra/packages/{package_id}/retrieval-readiness` | Read-only | Retrieval readiness via TANTRA |
| GET | `/tantra/packages/{package_id}/runtime` | Read-only | Bundled TANTRA runtime state |

**Note:** TANTRA certification uses `dataset_id`; retrieval-readiness and runtime use `package_id`.

---

## Knowledge Objects

**Source file:** `src/api/knowledgeObject.ts`

| Method | Path | Classification | Frontend purpose |
|---|---|---|---|
| POST | `/packages/{package_id}/knowledge-object` | **Mutation** | Register a knowledge object with provenance pointer |

**Request body:**
```json
{
  "knowledge_type": "<type>",
  "content_reference": "<uri>",
  "description": "<text>"
}
```

---

## Runtime / Operations

**Source file:** `src/api/operations.ts`

| Method | Path | Classification | Frontend purpose |
|---|---|---|---|
| GET | `/runtime/identity` | Read-only | TANTRA runtime identity and capabilities manifest |
| GET | `/shared/registry` | Read-only | Shared data registry entries |
| GET | `/shared/contracts` | Read-only | Shared service convergence contracts |
| GET | `/parikshak/review-references` | Read-only | Parikshak engineering review sync status |
| GET | `/niyantran/task-state` | Read-only | Niyantran operational task lifecycle state |
| GET | `/replay-registry/manifest` | Read-only | Replay-capable subsystem manifest |

All operations endpoints are **read-only**.

---

## Admin

**Source file:** `src/api/admin.ts`

| Method | Path | Classification | Frontend purpose |
|---|---|---|---|
| POST | `/auth/token` | Auth | Obtain signed bearer token for admin operations |
| GET | `/admin/configuration` | Read-only | Configuration validation report (no secrets returned) |
| GET | `/admin/backup` | Controlled | Generate backup snapshot (user-triggered, not automatic) |
| POST | `/admin/restore` | **Destructive** | Restore from snapshot (requires safety acknowledgement) |

**Authorization:** All admin endpoints require `Authorization: Bearer <token>` header. Token is obtained via `POST /auth/token`.

**Token request body:**
```json
{
  "actor": "control-center-admin",
  "roles": ["bhiv-admin"]
}
```

**Safety rules for restore:**
1. User must paste valid JSON snapshot into the textarea
2. User must check the acknowledgement checkbox
3. User must confirm the browser confirm dialog
4. Only then is `POST /admin/restore` called

---

## Error Handling

All API calls are wrapped by `ApiClient.request<T>()`. Errors are normalized to:

```typescript
interface APIError {
  message: string;
  status?: number;   // HTTP status code, if available
  path: string;      // API path that failed
  detail?: string;   // Raw response body, if available
}
```

Pages catch these errors and display an `<ErrorPanel>` component instead of crashing.

Network timeouts (10 seconds) are handled via `AbortController` and surface as `APIError` with an abort message.
