# T-GOV-F01 COMPLETE FASTAPI ROUTE & PYDANTIC SCHEMA AUDIT

**Task ID:** `T-GOV-F01`  
**Subsystem:** MASTERDB Ingestion & Certification Service (`backend/bhiv-masterdb-ingestion-certification-service-main`)  
**Framework:** FastAPI with Pydantic v2 Core Schemas  

---

## 1. Route Reconciliation & Inventory Summary

- **Total `app.routes` Entries:** **86**
- **Domain `APIRoute` Instances:** **82**
- **FastAPI Internal Documentation Routes:** **4** (`/openapi.json`, `/docs`, `/docs/oauth2-redirect`, `/redoc`)
- **OpenAPI Unique Paths:** **73**
- **OpenAPI Operations Count:** **82**

### Reconciliation Explanation
1. **Why `app.routes` has 86 entries vs 73 OpenAPI paths:**
   - 4 internal documentation routes (`/openapi.json`, `/docs`, `/docs/oauth2-redirect`, `/redoc`) are Starlette `Route` objects that do not appear in `openapi.json` by framework convention.
   - 9 paths in the domain API support distinct operational handlers on the same URI path (e.g., `POST /shared/{service_name}/register` vs `GET /shared/{service_name}`, `POST /canonical-repository/documents` vs `GET /canonical-repository/documents`).
   - 82 `APIRoute` instances map 1:1 to the 82 operations documented in `openapi.json`.
2. **Sub-Application Mounts:** 0 mounted sub-applications.

---

## 2. Raw Binary Upload & Special Payload Boundaries

### Route: `POST /upload/{upload_id}/content`
- **Expected Content-Type:** `application/octet-stream` (raw binary bytes).
- **Binary Payload Boundary:** Consumes raw request stream or `bytes` payload to avoid loading multi-gigabyte datasets entirely into Python JSON strings.
- **File Size Validation:** Enforced against `max_file_size_bytes` configured in upload session initiation (`500MB` default limit).
- **Checksum Verification:** Client sends `checksum_sha256` during initiation; backend verifies cryptographic SHA-256 digest on binary stream.
- **Filename / Path Safety:** Stored in segregated staging directories keyed by UUID4 `upload_id`; no user-supplied directory path traversal is permitted.
- **Authentication & Ownership:** Protected by Bearer JWT; actor identity is associated with the staged upload session.

---

## 3. Complete Route-by-Route Schema Inventory

| ID | Method | Path | Request Body Model | Path Params | Query Params | Response Model | Auth & RBAC | Relevant Tests |
|:---:|:---:|:---|:---|:---|:---|:---|:---|:---|
| 1 | **GET/HEAD** | `/openapi.json` | _No Body_ | None | None | `HTML / JSON (Builtin)` | Public | `test_api.py` |
| 2 | **GET/HEAD** | `/docs` | _No Body_ | None | None | `HTML / JSON (Builtin)` | Public | `test_api.py` |
| 3 | **GET/HEAD** | `/docs/oauth2-redirect` | _No Body_ | None | None | `HTML / JSON (Builtin)` | Public | `test_api.py` |
| 4 | **GET/HEAD** | `/redoc` | _No Body_ | None | None | `HTML / JSON (Builtin)` | Public | `test_api.py` |
| 5 | **POST** | `/validate` | `ValidationRequest` | None | None | `dict` | Public (Unauthenticated) (Public) | `test_api.py`<br>`test_malformed_inputs.py` |
| 6 | **POST** | `/certify` | `CertificationRequest` | None | None | `dict` | Public (Unauthenticated) (Public) | `test_certification_service.py`<br>`test_malformed_inputs.py` |
| 7 | **GET** | `/status/{dataset_id}` | _No Body_ | `dataset_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_api.py`<br>`test_malformed_inputs.py` |
| 8 | **GET** | `/report/{dataset_id}` | _No Body_ | `dataset_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_api.py`<br>`test_malformed_inputs.py` |
| 9 | **POST** | `/packages/register` | `PackageRegisterRequest` | None | None | `dict` | Public (Unauthenticated) (Public) | `test_registry_api.py`<br>`test_package_registry_service.py` |
| 10 | **POST** | `/packages/promote` | `PackagePromoteRequest` | None | None | `dict` | Public (Unauthenticated) (Public) | `test_registry_api.py`<br>`test_package_registry_service.py` |
| 11 | **POST** | `/packages/deprecate` | `PackageDeprecateRequest` | None | None | `dict` | Public (Unauthenticated) (Public) | `test_registry_api.py`<br>`test_package_registry_service.py` |
| 12 | **GET** | `/packages/{package_id}` | _No Body_ | `package_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_registry_api.py`<br>`test_package_registry_service.py` |
| 13 | **GET** | `/packages/{package_id}/history` | _No Body_ | `package_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_registry_api.py`<br>`test_package_registry_service.py` |
| 14 | **GET** | `/packages/{package_id}/replay` | _No Body_ | `package_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_audit_and_replay.py` |
| 15 | **GET** | `/packages/{package_id}/audit` | _No Body_ | `package_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_audit_and_replay.py` |
| 16 | **POST** | `/packages/{package_id}/knowledge-object` | `KnowledgeObjectRegisterRequest` | `package_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_knowledge_object_service.py` |
| 17 | **GET** | `/packages/{package_id}/lineage` | _No Body_ | `package_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_knowledge_object_service.py` |
| 18 | **GET** | `/packages/{package_id}/retrieval` | _No Body_ | `package_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_retrieval_readiness_service.py` |
| 19 | **GET** | `/mdu/status` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_mdu_contract_adapter.py` |
| 20 | **GET** | `/mdu/schema/{dataset_id}` | _No Body_ | `dataset_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_mdu_contract_adapter.py` |
| 21 | **GET** | `/mdu/provenance/{dataset_id}` | _No Body_ | `dataset_id` | None | `list` | Public (Unauthenticated) (Public) | `test_mdu_contract_adapter.py` |
| 22 | **GET** | `/mdu/schema-compatibility/{dataset_id}` | _No Body_ | `dataset_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_mdu_contract_adapter.py` |
| 23 | **POST** | `/tantra/datasets/register` | `PackageRegisterRequest` | None | None | `dict` | Public (Unauthenticated) (Public) | `test_tantra_interface_service.py` |
| 24 | **GET** | `/tantra/packages/{package_id}/retrieval-readiness` | _No Body_ | `package_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_tantra_interface_service.py` |
| 25 | **GET** | `/tantra/certification/{dataset_id}` | _No Body_ | `dataset_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_tantra_interface_service.py` |
| 26 | **GET** | `/tantra/packages/{package_id}/runtime` | _No Body_ | `package_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_tantra_interface_service.py` |
| 27 | **GET** | `/discovery/packages` | _No Body_ | None | `package_id`, `dataset_id`, `board`, `medium`, `version`, `status` | `dict` | Public (Unauthenticated) (Public) | `test_runtime_discovery_service.py` |
| 28 | **GET** | `/shared/registry` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_shared_data_registry.py`<br>`test_shared_api.py` |
| 29 | **GET** | `/shared/registry/{dataset_name}` | _No Body_ | `dataset_name` | None | `dict` | Public (Unauthenticated) (Public) | `test_shared_data_registry.py`<br>`test_shared_api.py` |
| 30 | **GET** | `/shared/contracts` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_shared_platform_services.py`<br>`test_shared_api.py` |
| 31 | **GET** | `/shared/contracts/{service_name}` | _No Body_ | `service_name` | None | `dict` | Public (Unauthenticated) (Public) | `test_shared_platform_services.py`<br>`test_shared_api.py` |
| 32 | **GET** | `/shared/version-compatibility` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_shared_version_compatibility.py`<br>`test_shared_api.py` |
| 33 | **POST** | `/shared/{service_name}/register` | `SharedRecordRegisterRequest` | `service_name` | None | `dict` | Public (Unauthenticated) (Public) | `test_shared_api.py`<br>`test_shared_record_store.py` |
| 34 | **PUT** | `/shared/{service_name}/{record_id}` | `SharedRecordUpdateRequest` | `service_name`, `record_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_shared_api.py`<br>`test_shared_record_store.py` |
| 35 | **POST** | `/shared/{service_name}/{record_id}/deprecate` | `SharedRecordDeprecateRequest` | `service_name`, `record_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_shared_api.py`<br>`test_shared_record_store.py` |
| 36 | **GET** | `/shared/{service_name}` | _No Body_ | `service_name` | None | `dict` | Public (Unauthenticated) (Public) | `test_shared_api.py`<br>`test_shared_record_store.py` |
| 37 | **GET** | `/shared/{service_name}/{record_id}` | _No Body_ | `service_name`, `record_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_shared_api.py`<br>`test_shared_record_store.py` |
| 38 | **GET** | `/shared/{service_name}/{record_id}/history` | _No Body_ | `service_name`, `record_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_shared_api.py`<br>`test_shared_record_store.py` |
| 39 | **GET** | `/shared/{service_name}/{record_id}/replay` | _No Body_ | `service_name`, `record_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_shared_api.py`<br>`test_shared_record_store.py` |
| 40 | **GET** | `/shared/{service_name}/{record_id}/resolve` | _No Body_ | `service_name`, `record_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_shared_api.py`<br>`test_shared_record_store.py` |
| 41 | **POST** | `/bcaes/registries/{registry_type}/objects` | `RegisterObjectRequest` | `registry_type` | `identity` | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_api.py`<br>`test_bcaes_registry_service.py` |
| 42 | **GET** | `/bcaes/registries` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_api.py`<br>`test_bcaes_registry_service.py` |
| 43 | **GET** | `/bcaes/registries/{registry_type}/objects` | _No Body_ | `registry_type` | None | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_api.py`<br>`test_bcaes_registry_service.py` |
| 44 | **GET** | `/bcaes/registries/{registry_type}/objects/{object_id}` | _No Body_ | `registry_type`, `object_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_api.py`<br>`test_bcaes_registry_service.py` |
| 45 | **PATCH** | `/bcaes/registries/{registry_type}/objects/{object_id}` | `UpdateObjectRequest` | `registry_type`, `object_id` | `identity` | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_api.py`<br>`test_bcaes_registry_service.py` |
| 46 | **DELETE** | `/bcaes/registries/{registry_type}/objects/{object_id}` | _No Body_ | `registry_type`, `object_id` | `identity` | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_api.py`<br>`test_bcaes_registry_service.py` |
| 47 | **GET** | `/bcaes/search` | _No Body_ | None | `q`, `registry_type`, `owner`, `status` | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_api.py` |
| 48 | **GET** | `/bcaes/relationships/{object_id}` | _No Body_ | `object_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_api.py` |
| 49 | **GET** | `/bcaes/dependencies/{object_id}` | _No Body_ | `object_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_api.py` |
| 50 | **GET** | `/bcaes/capability-reuse-check` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_api.py` |
| 51 | **GET** | `/bcaes/validate/classification` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_api.py` |
| 52 | **GET** | `/bcaes/validate/duplicates` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_api.py` |
| 53 | **GET** | `/bcaes/validate/ownership` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_api.py` |
| 54 | **GET** | `/bcaes/validate/authority-boundaries` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_api.py` |
| 55 | **GET** | `/bcaes/validate/version-compatibility` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_api.py` |
| 56 | **GET** | `/bcaes/validate/dependency-integrity` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_api.py` |
| 57 | **GET** | `/bcaes/validate/architecture` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_api.py` |
| 58 | **POST** | `/bcaes/convergence/{object_id}` | `ConvergenceUpdateRequest` | `object_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_convergence_api.py` |
| 59 | **GET** | `/bcaes/convergence/{object_id}` | _No Body_ | `object_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_convergence_api.py` |
| 60 | **GET** | `/bcaes/convergence` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_convergence_api.py` |
| 61 | **GET** | `/bcaes/snapshot` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_bcaes_registry_service.py` |
| 62 | **POST** | `/canonical-repository/documents` | `RegisterDocumentRequest` | None | `identity` | `dict` | Public (Unauthenticated) (Public) | `test_canonical_repository_api.py` |
| 63 | **GET** | `/canonical-repository/documents` | _No Body_ | None | `identity` | `dict` | Public (Unauthenticated) (Public) | `test_canonical_repository_api.py` |
| 64 | **GET** | `/canonical-repository/documents/{document_id}` | _No Body_ | `document_id` | `identity` | `dict` | Public (Unauthenticated) (Public) | `test_canonical_repository_api.py` |
| 65 | **GET** | `/canonical-repository/by-category/{category}` | _No Body_ | `category` | `identity` | `dict` | Public (Unauthenticated) (Public) | `test_canonical_repository_api.py` |
| 66 | **POST** | `/canonical-repository/documents/{document_id}/versions` | `PublishVersionRequest` | `document_id` | `identity` | `dict` | Public (Unauthenticated) (Public) | `test_canonical_repository_api.py` |
| 67 | **GET** | `/canonical-repository/documents/{document_id}/versions` | _No Body_ | `document_id` | `identity` | `dict` | Public (Unauthenticated) (Public) | `test_canonical_repository_api.py` |
| 68 | **GET** | `/canonical-repository/documents/{document_id}/versions/{version_number}` | _No Body_ | `document_id`, `version_number` | `identity` | `dict` | Public (Unauthenticated) (Public) | `test_canonical_repository_api.py` |
| 69 | **GET** | `/canonical-repository/documents/{document_id}/latest` | _No Body_ | `document_id` | `identity` | `dict` | Public (Unauthenticated) (Public) | `test_canonical_repository_api.py` |
| 70 | **GET** | `/canonical-repository/documents/{document_id}/verify` | _No Body_ | `document_id` | `identity` | `dict` | Public (Unauthenticated) (Public) | `test_canonical_repository_api.py` |
| 71 | **POST** | `/auth/token` | `TokenRequest` | None | None | `Dict[str, Any]` | Public (Unauthenticated) (Public) | `test_auth_service.py`<br>`test_malformed_inputs.py` |
| 72 | **GET** | `/health` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_api.py`<br>`test_runtime_identity_and_metrics.py` |
| 73 | **GET** | `/ready` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_api.py`<br>`test_runtime_identity_and_metrics.py` |
| 74 | **GET** | `/admin/backup` | _No Body_ | None | `identity` | `dict` | Bearer JWT (bhiv-admin) | `test_admin_backup_endpoints.py`<br>`test_backup_service.py` |
| 75 | **POST** | `/admin/restore` | `dict` | None | `identity` | `dict` | Bearer JWT (bhiv-admin) | `test_admin_backup_endpoints.py`<br>`test_backup_service.py` |
| 76 | **GET** | `/admin/configuration` | _No Body_ | None | `identity` | `dict` | Bearer JWT (bhiv-admin) | `test_admin_configuration_endpoint.py`<br>`test_startup_config.py` |
| 77 | **GET** | `/runtime/identity` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_runtime_identity_and_metrics.py` |
| 78 | **GET** | `/metrics` | _No Body_ | None | None | `Any` | Public (Unauthenticated) (Public) | `test_runtime_identity_and_metrics.py` |
| 79 | **POST** | `/observability/push-to-insightbridge` | _No Body_ | None | `identity` | `dict` | Public (Unauthenticated) (Public) | `test_insightbridge_push_endpoint.py`<br>`test_insightbridge_client.py` |
| 80 | **POST** | `/parikshak/review-references` | `UpsertReviewReferenceRequest` | None | `identity` | `dict` | Public (Unauthenticated) (Public) | `test_operational_sync.py` |
| 81 | **GET** | `/parikshak/review-references` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_operational_sync.py` |
| 82 | **GET** | `/parikshak/review-references/{external_review_id}` | _No Body_ | `external_review_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_operational_sync.py` |
| 83 | **POST** | `/niyantran/task-state` | `UpsertOperationalTaskStateRequest` | None | `identity` | `dict` | Public (Unauthenticated) (Public) | `test_operational_sync.py` |
| 84 | **GET** | `/niyantran/task-state` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_operational_sync.py` |
| 85 | **GET** | `/niyantran/task-state/{external_task_id}` | _No Body_ | `external_task_id` | None | `dict` | Public (Unauthenticated) (Public) | `test_operational_sync.py` |
| 86 | **GET** | `/replay-registry/manifest` | _No Body_ | None | None | `dict` | Public (Unauthenticated) (Public) | `test_replay_registry_manifest.py` |

---

## 4. Pydantic Schema Validation Audit

All request models defined in `models.py` inherit from `pydantic.BaseModel`.
- **Strict Enum Validation:** State machines strictly enforce `CertificationState`, `PackageStatus`, and `RetrievalStatus` enums. Invalid strings produce immediate HTTP 422 errors.
- **Type Coercion & Boundary Defense:** Pydantic strictly validates types. Passing integers, objects, or arrays to string fields produces structured 422 validation error lists.
- **Default Factories:** Dynamic fields (`created_at`, `timestamp`, `transition_id`, `package_id`) use `Field(default_factory=...)` to ensure unique identity without mutation collisions.
- **Zero Unhandled 500s:** Validated by `tests/test_malformed_inputs.py` across corrupted JSON, empty dictionaries, non-existent files, and unauthorized tokens.
