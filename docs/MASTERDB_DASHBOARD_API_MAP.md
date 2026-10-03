# MASTERDB Control Center — Authoritative API Contract Map

> Comprehensive reference of all backend API endpoints integrated into the MASTERDB Control Center.
> Documented strictly against the live, verified backend implementation.

---

## 1. Authentication

### `POST /auth/token`
- **Method:** `POST`
- **Path:** `/auth/token`
- **Purpose:** Issues a signed JWT Bearer token for authenticated session access and administrative operations.
- **Authentication:** None (Public login endpoint).
- **Authorization / RBAC:** Server-side role assignment based on `actor`. Client-supplied `roles` array is **ignored** by the backend.
  - `actor: "bhiv-admin"` → receives `["bhiv-admin", "operator", "admin"]`
  - `actor: "control-center-operator"` → receives `["operator", "viewer"]`
  - `actor: "control-center-viewer"` → receives `["viewer"]`
- **Request Body:**
  ```json
  {
    "actor": "bhiv-admin",
    "password": null,
    "roles": ["ignored"]
  }
  ```
- **Response:**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer",
    "actor": "bhiv-admin",
    "roles": ["bhiv-admin", "operator", "admin"],
    "expires_in": 3600
  }
  ```
- **Status Codes:** `200 OK`, `400 Bad Request`, `422 Unprocessable Entity`
- **Frontend Usage:** Invoked by `src/api/auth.ts` and `src/api/admin.ts`. Token is cached in-memory and automatically attached as `Authorization: Bearer <token>` for protected requests.
- **Operation Type:** Controlled Mutation (Session token creation).

---

## 2. Health & Runtime Observability

### `GET /health`
- **Method:** `GET`
- **Path:** `/health`
- **Purpose:** System liveness health check.
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-03T06:17:34.502Z",
    "version": "1.0.0"
  }
  ```
- **Status Codes:** `200 OK`
- **Frontend Usage:** Polled by `Dashboard` and `Observability` pages.
- **Operation Type:** Read-Only.

---

### `GET /ready`
- **Method:** `GET`
- **Path:** `/ready`
- **Purpose:** Subsystem readiness verification (storage, registry, certifier).
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "status": "ready",
    "checks": {
      "database": "ready",
      "storage": "ready",
      "certification_gate": "ready"
    }
  }
  ```
- **Status Codes:** `200 OK`, `503 Service Unavailable`
- **Frontend Usage:** Rendered in `Dashboard` health cards and `Observability` view.
- **Operation Type:** Read-Only.

---

### `GET /metrics`
- **Method:** `GET`
- **Path:** `/metrics`
- **Purpose:** Operational performance and throughput metrics.
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:** Plaintext Prometheus format or JSON metrics object.
- **Status Codes:** `200 OK`
- **Frontend Usage:** Monitored on `Observability` page.
- **Operation Type:** Read-Only.

---

### `GET /runtime/identity`
- **Method:** `GET`
- **Path:** `/runtime/identity`
- **Purpose:** Retrieves TANTRA runtime identity manifest and node execution context.
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "node_id": "masterdb-node-01",
    "environment": "production",
    "runtime_version": "2.4.0",
    "tantra_id": "tantra-prod-sg"
  }
  ```
- **Status Codes:** `200 OK`
- **Frontend Usage:** Displayed in `Observability` panel.
- **Operation Type:** Read-Only.

---

## 3. Package & Dataset Discovery

### `GET /discovery/packages`
- **Method:** `GET`
- **Path:** `/discovery/packages`
- **Purpose:** Enumerates all discoverable dataset packages registered in MASTERDB.
- **Authentication:** None.
- **Authorization / RBAC:** Public / Operator.
- **Request Body:** None.
- **Response:**
  ```json
  [
    {
      "package_id": "pkg-masterdb_final_closure",
      "dataset_id": "masterdb_final_closure",
      "state": "AVAILABLE",
      "created_at": "2026-10-03T06:17:34Z",
      "record_count": 2,
      "owner": "bhiv-admin"
    }
  ]
  ```
- **Status Codes:** `200 OK`
- **Frontend Usage:** Powers the Dataset Explorer (`/datasets`) table.
- **Operation Type:** Read-Only.

---

### `GET /packages/{package_id}`
- **Method:** `GET`
- **Path:** `/packages/{package_id}`
- **Purpose:** Retrieves full metadata, state, checksum, and configuration for a package.
- **Authentication:** None.
- **Authorization / RBAC:** Public / Operator.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "package_id": "pkg-masterdb_final_closure",
    "dataset_id": "masterdb_final_closure",
    "version": "1.0.0",
    "state": "AVAILABLE",
    "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "created_at": "2026-10-03T06:17:34Z",
    "metadata": {
      "target_database": "RelationalDB",
      "record_count": 2
    }
  }
  ```
- **Status Codes:** `200 OK`, `404 Not Found`
- **Frontend Usage:** Core data source for Dataset Details view (`/datasets/:datasetId`).
- **Operation Type:** Read-Only.

---

### `GET /packages/{package_id}/history`
- **Method:** `GET`
- **Path:** `/packages/{package_id}/history`
- **Purpose:** Fetches chronological lifecycle transitions for a package.
- **Authentication:** None.
- **Authorization / RBAC:** Public / Operator.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "package_id": "pkg-masterdb_final_closure",
    "transitions": [
      {
        "from_state": "REGISTERED",
        "to_state": "VALIDATED",
        "timestamp": "2026-10-03T06:17:35Z",
        "actor": "system"
      },
      {
        "from_state": "VALIDATED",
        "to_state": "AVAILABLE",
        "timestamp": "2026-10-03T06:17:36Z",
        "actor": "bhiv-admin"
      }
    ]
  }
  ```
- **Status Codes:** `200 OK`, `404 Not Found`
- **Frontend Usage:** Rendered in the Lifecycle History timeline on Dataset Details.
- **Operation Type:** Read-Only.

---

### `GET /packages/{package_id}/lineage`
- **Method:** `GET`
- **Path:** `/packages/{package_id}/lineage`
- **Purpose:** Retrieves dataset lineage graph (ancestors, transformations, consumers).
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "package_id": "pkg-masterdb_final_closure",
    "ancestors": [],
    "descendants": [],
    "transformations": []
  }
  ```
- **Status Codes:** `200 OK`, `404 Not Found`
- **Frontend Usage:** Lineage card on Dataset Details.
- **Operation Type:** Read-Only.

---

### `GET /packages/{package_id}/retrieval`
- **Method:** `GET`
- **Path:** `/packages/{package_id}/retrieval`
- **Purpose:** Retrieves retrieval indices, latency profiles, and cache readiness metrics.
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "package_id": "pkg-masterdb_final_closure",
    "retrieval_ready": true,
    "index_status": "indexed",
    "target_storage": "RelationalDB"
  }
  ```
- **Status Codes:** `200 OK`, `404 Not Found`
- **Frontend Usage:** Retrieval Readiness panel on Dataset Details.
- **Operation Type:** Read-Only.

---

### `GET /packages/{package_id}/audit`
- **Method:** `GET`
- **Path:** `/packages/{package_id}/audit`
- **Purpose:** Verifies audit trail integrity and cryptographic completeness.
- **Authentication:** None.
- **Authorization / RBAC:** Public / Operator.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "package_id": "pkg-masterdb_final_closure",
    "audit_status": "complete",
    "hash_chain_verified": true,
    "events_count": 5
  }
  ```
- **Status Codes:** `200 OK`, `404 Not Found`
- **Frontend Usage:** Audit Verification panel on Dataset Details.
- **Operation Type:** Read-Only.

---

### `GET /packages/{package_id}/replay`
- **Method:** `GET`
- **Path:** `/packages/{package_id}/replay`
- **Purpose:** Verifies deterministic replay reproduction.
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "package_id": "pkg-masterdb_final_closure",
    "replay_match": true,
    "divergence_detected": false
  }
  ```
- **Status Codes:** `200 OK`, `404 Not Found`
- **Frontend Usage:** Replay Verification card on Dataset Details.
- **Operation Type:** Read-Only.

---

### `POST /packages/{package_id}/knowledge-object`
- **Method:** `POST`
- **Path:** `/packages/{package_id}/knowledge-object`
- **Purpose:** Registers a certified package as a sovereign Knowledge Object.
- **Authentication:** Bearer Token.
- **Authorization / RBAC:** `operator` or `admin`.
- **Request Body:**
  ```json
  {
    "object_type": "DATASET_CORPUS",
    "metadata": {
      "domain": "governance",
      "access_tier": "tier-1"
    },
    "tags": ["masterdb", "e2e-verified"]
  }
  ```
- **Response:**
  ```json
  {
    "knowledge_object_id": "ko-89123847",
    "package_id": "pkg-masterdb_final_closure",
    "status": "REGISTERED"
  }
  ```
- **Status Codes:** `200 OK`, `201 Created`, `401 Unauthorized`, `403 Forbidden`
- **Frontend Usage:** Knowledge Object registration dialog on Dataset Details.
- **Operation Type:** Controlled Mutation.

---

## 4. Validation & Certification

### `POST /validate`
- **Method:** `POST`
- **Path:** `/validate`
- **Purpose:** Triggers on-demand validation evaluation for a registered dataset.
- **Authentication:** None or Bearer Token.
- **Authorization / RBAC:** Public / Operator.
- **Request Body:**
  ```json
  {
    "dataset_id": "masterdb_final_closure",
    "strict_mode": false
  }
  ```
- **Response:**
  ```json
  {
    "dataset_id": "masterdb_final_closure",
    "valid": true,
    "errors": [],
    "warnings": [],
    "summary": "Validation successful. 2 records conform to schema."
  }
  ```
- **Status Codes:** `200 OK`, `400 Bad Request`, `422 Unprocessable Entity`
- **Frontend Usage:** "Run Validation" button on Dataset Details.
- **Operation Type:** Controlled Mutation.

---

### `GET /status/{dataset_id}`
- **Method:** `GET`
- **Path:** `/status/{dataset_id}`
- **Purpose:** Retrieves compact validation status summary.
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "dataset_id": "masterdb_final_closure",
    "status": "VALIDATED",
    "last_validated": "2026-10-03T06:17:35Z"
  }
  ```
- **Status Codes:** `200 OK`, `404 Not Found`
- **Frontend Usage:** Validation status badge on Dataset Details.
- **Operation Type:** Read-Only.

---

### `GET /report/{dataset_id}`
- **Method:** `GET`
- **Path:** `/report/{dataset_id}`
- **Purpose:** Retrieves full validation report including individual rule evaluation items.
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "dataset_id": "masterdb_final_closure",
    "rules_evaluated": 12,
    "rules_passed": 12,
    "rules_failed": 0,
    "details": []
  }
  ```
- **Status Codes:** `200 OK`, `404 Not Found`
- **Frontend Usage:** Full Validation Report table on Dataset Details.
- **Operation Type:** Read-Only.

---

### `POST /certify`
- **Method:** `POST`
- **Path:** `/certify`
- **Purpose:** Submits a dataset for MASTERDB official certification.
- **Authentication:** Bearer Token.
- **Authorization / RBAC:** `operator` or `admin`.
- **Request Body:**
  ```json
  {
    "dataset_id": "masterdb_final_closure",
    "certification_type": "MASTERDB_STANDARD"
  }
  ```
- **Response:**
  ```json
  {
    "dataset_id": "masterdb_final_closure",
    "certified": true,
    "certificate_id": "cert-998811",
    "timestamp": "2026-10-03T06:17:35Z"
  }
  ```
- **Status Codes:** `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`
- **Frontend Usage:** "Request Certification" action on Dataset Details.
- **Operation Type:** Controlled Mutation.

---

### `GET /certify/{dataset_id}/status`
- **Method:** `GET`
- **Path:** `/certify/{dataset_id}/status`
- **Purpose:** Inspects standing certification certificate and expiration.
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "dataset_id": "masterdb_final_closure",
    "is_certified": true,
    "certificate_id": "cert-998811"
  }
  ```
- **Status Codes:** `200 OK`, `404 Not Found`
- **Frontend Usage:** Certification badge on Dataset Details.
- **Operation Type:** Read-Only.

---

## 5. Master Data Unit (MDU)

### `GET /mdu/provenance/{dataset_id}`
- **Method:** `GET`
- **Path:** `/mdu/provenance/{dataset_id}`
- **Purpose:** Fetches MDU provenance events and origin records.
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:**
  ```json
  [
    {
      "event_id": "mdu-evt-001",
      "dataset_id": "masterdb_final_closure",
      "action": "INGEST_RECORDED",
      "timestamp": "2026-10-03T06:17:34Z"
    }
  ]
  ```
- **Status Codes:** `200 OK`, `404 Not Found`, `502 Bad Gateway` (if MDU external service offline)
- **Frontend Usage:** MDU Provenance table on Dataset Details.
- **Operation Type:** Read-Only.

---

### `GET /mdu/schema/{dataset_id}`
- **Method:** `GET`
- **Path:** `/mdu/schema/{dataset_id}`
- **Purpose:** Retrieves canonical Master Data Unit schema definition.
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "dataset_id": "masterdb_final_closure",
    "schema_version": "1.2.0",
    "fields": [
      {"name": "id", "type": "string", "required": true},
      {"name": "status", "type": "string", "required": true}
    ]
  }
  ```
- **Status Codes:** `200 OK`, `404 Not Found`
- **Frontend Usage:** MDU Schema Viewer on Dataset Details.
- **Operation Type:** Read-Only.

---

### `GET /mdu/schema-compatibility/{dataset_id}`
- **Method:** `GET`
- **Path:** `/mdu/schema-compatibility/{dataset_id}`
- **Purpose:** Evaluates schema compatibility across versions.
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "dataset_id": "masterdb_final_closure",
    "compatible": true,
    "breaking_changes": []
  }
  ```
- **Status Codes:** `200 OK`
- **Frontend Usage:** Schema Compatibility card on Dataset Details.
- **Operation Type:** Read-Only.

---

## 6. TANTRA Sovereign Integration

### `GET /tantra/certification/{dataset_id}`
- **Method:** `GET`
- **Path:** `/tantra/certification/{dataset_id}`
- **Purpose:** Verifies TANTRA cryptographic certification standing.
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "dataset_id": "masterdb_final_closure",
    "tantra_certified": true,
    "level": "LEVEL_3_SOVEREIGN"
  }
  ```
- **Status Codes:** `200 OK`, `404 Not Found`
- **Frontend Usage:** TANTRA Certification badge on Dataset Details.
- **Operation Type:** Read-Only.

---

### `GET /tantra/packages/{package_id}/retrieval-readiness`
- **Method:** `GET`
- **Path:** `/tantra/packages/{package_id}/retrieval-readiness`
- **Purpose:** Evaluates package readiness for TANTRA retrieval cluster.
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "package_id": "pkg-masterdb_final_closure",
    "ready": true,
    "latency_sla_ms": 15
  }
  ```
- **Status Codes:** `200 OK`
- **Frontend Usage:** TANTRA Readiness panel on Dataset Details.
- **Operation Type:** Read-Only.

---

### `GET /tantra/packages/{package_id}/runtime`
- **Method:** `GET`
- **Path:** `/tantra/packages/{package_id}/runtime`
- **Purpose:** Fetches bundled runtime state and execution profile for a package.
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "package_id": "pkg-masterdb_final_closure",
    "runtime_environment": "tantra-v2",
    "active_instances": 1
  }
  ```
- **Status Codes:** `200 OK`
- **Frontend Usage:** TANTRA Runtime card on Dataset Details.
- **Operation Type:** Read-Only.

---

## 7. Controlled Ingestion Engine

### `GET /databases`
- **Method:** `GET`
- **Path:** `/databases`
- **Purpose:** Returns the dynamic registry of all supported target databases, their accepted formats, descriptions, and required authorization roles.
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:**
  ```json
  [
    {
      "database_key": "RelationalDB",
      "name": "Relational Database",
      "description": "Structured tabular data storage (SQLite / Postgres)",
      "accepted_formats": ["CSV", "JSON", "XLSX"],
      "required_role": "operator"
    },
    {
      "database_key": "VectorDB",
      "name": "Vector Database",
      "description": "High-dimensional embedding storage",
      "accepted_formats": ["JSON", "TXT", "PDF"],
      "required_role": "operator"
    },
    {
      "database_key": "DocumentStore",
      "name": "Document Store",
      "description": "Semi-structured document storage",
      "accepted_formats": ["JSON", "PDF", "TXT"],
      "required_role": "operator"
    },
    {
      "database_key": "GraphStore",
      "name": "Graph Database",
      "description": "Knowledge graph and relationship store",
      "accepted_formats": ["JSON", "CSV"],
      "required_role": "operator"
    },
    {
      "database_key": "TimeSeriesDB",
      "name": "Time Series Database",
      "description": "Temporal metric and telemetry storage",
      "accepted_formats": ["CSV", "JSON"],
      "required_role": "operator"
    },
    {
      "database_key": "LedgerDB",
      "name": "Ledger Database",
      "description": "Immutable audit and transaction ledger",
      "accepted_formats": ["JSON", "CSV"],
      "required_role": "operator"
    },
    {
      "database_key": "ObjectStore",
      "name": "Object Storage",
      "description": "Unstructured binary and blob storage",
      "accepted_formats": ["PNG", "JPEG", "GIF", "ZIP", "PDF", "TXT", "CSV", "JSON"],
      "required_role": "operator"
    }
  ]
  ```
- **Status Codes:** `200 OK`
- **Frontend Usage:** Populates the target database selection grid and dynamic format validation rules in `ControlledIngestion.tsx`.
- **Operation Type:** Read-Only.

---

### `GET /databases/{database_key}`
- **Method:** `GET`
- **Path:** `/databases/{database_key}`
- **Purpose:** Retrieves capability details for a specific database.
- **Authentication:** None.
- **Authorization / RBAC:** Public.
- **Request Body:** None.
- **Response:** Returns single `TargetDatabaseInfo` object.
- **Status Codes:** `200 OK`, `404 Not Found`
- **Frontend Usage:** Ingestion target validation.
- **Operation Type:** Read-Only.

---

### `POST /upload`
- **Method:** `POST`
- **Path:** `/upload`
- **Purpose:** Initializes an upload session, declaring metadata, expected file format, size, and client-side calculated SHA-256 checksum.
- **Authentication:** Bearer Token.
- **Authorization / RBAC:** `operator` or `admin` or `bhiv-admin`.
- **Request Body:**
  ```json
  {
    "filename": "masterdb_final_closure.json",
    "size_bytes": 284,
    "file_format": "JSON",
    "sha256": "f5f590b1faae8be114e918b958dc1800109ae49b77dbd4ec8ab0b4c8031d2797",
    "metadata": {
      "dataset_id": "masterdb_final_closure"
    }
  }
  ```
- **Response:**
  ```json
  {
    "upload_id": "upl-613917ce2612",
    "status": "RECEIVED",
    "message": "Upload session initialized",
    "trace_id": "trace-ed44e00e5182"
  }
  ```
- **Status Codes:** `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`
- **Frontend Usage:** Step 1 in Controlled Ingestion upload workflow.
- **Operation Type:** Controlled Mutation.

---

### `POST /upload/{upload_id}/content`
- **Method:** `POST`
- **Path:** `/upload/{upload_id}/content`
- **Purpose:** Streams the raw binary payload of the file into the upload session.
- **Authentication:** Bearer Token.
- **Authorization / RBAC:** `operator`, `admin`, `bhiv-admin` (session owner).
- **Headers:** `Content-Type: application/octet-stream`
- **Request Body:** Raw binary bytes of the file.
- **Response:**
  ```json
  {
    "upload_id": "upl-613917ce2612",
    "status": "RECEIVED",
    "bytes_received": 284,
    "sha256_verified": true,
    "trace_id": "trace-ed44e00e5182"
  }
  ```
- **Status Codes:** `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`
- **Frontend Usage:** Step 2 in Controlled Ingestion file transfer.
- **Operation Type:** Controlled Mutation.

---

### `POST /upload/{upload_id}/validate`
- **Method:** `POST`
- **Path:** `/upload/{upload_id}/validate`
- **Purpose:** Executes structural and format validation on the uploaded file prior to ingestion dispatch.
- **Authentication:** Bearer Token.
- **Authorization / RBAC:** `operator`, `admin`, `bhiv-admin`.
- **Request Body:** None (or empty JSON `{}`).
- **Response:**
  ```json
  {
    "upload_id": "upl-613917ce2612",
    "status": "VALIDATED",
    "valid": true,
    "records_detected": 2,
    "errors": [],
    "trace_id": "trace-ed44e00e5182"
  }
  ```
- **Status Codes:** `200 OK`, `400 Bad Request`, `401 Unauthorized`, `404 Not Found`
- **Frontend Usage:** Step 3 pre-ingestion validation check in `ControlledIngestion.tsx`.
- **Operation Type:** Controlled Mutation.

---

### `GET /upload/jobs`
- **Method:** `GET`
- **Path:** `/upload/jobs`
- **Purpose:** Lists recent upload jobs across all sessions.
- **Authentication:** None or Bearer Token.
- **Authorization / RBAC:** Public / Operator.
- **Request Body:** None.
- **Response:** Array of `UploadJobSummary` objects.
- **Status Codes:** `200 OK`
- **Frontend Usage:** Ingestion Jobs history table.
- **Operation Type:** Read-Only.

---

### `GET /upload/jobs/{upload_id}`
- **Method:** `GET`
- **Path:** `/upload/jobs/{upload_id}`
- **Purpose:** Inspects current upload lifecycle state (`RECEIVED`, `VALIDATING`, `VALIDATED`, `REGISTERED`, `INGESTED`, `AVAILABLE`, `REJECTED`).
- **Authentication:** None or Bearer Token.
- **Authorization / RBAC:** Public / Operator.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "upload_id": "upl-613917ce2612",
    "status": "AVAILABLE",
    "filename": "masterdb_final_closure.json",
    "file_format": "JSON",
    "size_bytes": 284,
    "trace_id": "trace-ed44e00e5182"
  }
  ```
- **Status Codes:** `200 OK`, `404 Not Found`
- **Frontend Usage:** Polled during upload lifecycle progression.
- **Operation Type:** Read-Only.

---

### `DELETE /upload/jobs/{upload_id}`
- **Method:** `DELETE`
- **Path:** `/upload/jobs/{upload_id}`
- **Purpose:** Cancels an active upload session. Transitions upload state to `REJECTED`.
- **Authentication:** Bearer Token.
- **Authorization / RBAC:** `operator`, `admin`, `bhiv-admin`.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "upload_id": "upl-613917ce2612",
    "status": "REJECTED",
    "message": "Upload session cancelled by user"
  }
  ```
- **Status Codes:** `200 OK`, `401 Unauthorized`, `404 Not Found`
- **Frontend Usage:** "Cancel Upload" action.
- **Operation Type:** Controlled Mutation.

---

### `POST /ingest`
- **Method:** `POST`
- **Path:** `/ingest`
- **Purpose:** Authoritatively submits a validated upload for sovereign ingestion and database routing.
- **Authentication:** Bearer Token.
- **Authorization / RBAC:** `operator` or `admin` or `bhiv-admin`.
- **Request Body:**
  ```json
  {
    "upload_id": "upl-613917ce2612",
    "dataset_id": "masterdb_final_closure",
    "package_id": "pkg-masterdb_final_closure",
    "target_database": "RelationalDB",
    "metadata": {
      "pipeline": "controlled_ingestion"
    }
  }
  ```
- **Response:**
  ```json
  {
    "job_id": "ingest-26afcc5fcae7",
    "status": "PERSISTED",
    "dataset_id": "masterdb_final_closure",
    "package_id": "pkg-masterdb_final_closure",
    "target_database": "RelationalDB",
    "records_persisted": 2,
    "trace_id": "trace-ed44e00e5182"
  }
  ```
- **Status Codes:** `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `422 Unprocessable Entity`
- **Frontend Usage:** Final "Submit Ingestion" action in `ControlledIngestion.tsx`.
- **Operation Type:** Controlled Mutation.

---

### `GET /ingest/jobs`
- **Method:** `GET`
- **Path:** `/ingest/jobs`
- **Purpose:** Returns the catalogue of all ingestion execution jobs.
- **Authentication:** None or Bearer Token.
- **Authorization / RBAC:** Public / Operator.
- **Request Body:** None.
- **Response:** Array of `IngestionJob` records.
- **Status Codes:** `200 OK`
- **Frontend Usage:** Ingestion Jobs monitor table (`/ingestion/jobs`).
- **Operation Type:** Read-Only.

---

### `GET /ingest/jobs/{job_id}`
- **Method:** `GET`
- **Path:** `/ingest/jobs/{job_id}`
- **Purpose:** Fetches detailed state and execution summary for a specific ingestion job (`PENDING`, `PROCESSING`, `PERSISTED`, `PARTIAL_PERSISTENCE`, `FAILED`, `REJECTED`).
- **Authentication:** None or Bearer Token.
- **Authorization / RBAC:** Public / Operator.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "job_id": "ingest-26afcc5fcae7",
    "status": "PERSISTED",
    "dataset_id": "masterdb_final_closure",
    "package_id": "pkg-masterdb_final_closure",
    "target_database": "RelationalDB",
    "records_persisted": 2,
    "records_failed": 0,
    "trace_id": "trace-ed44e00e5182"
  }
  ```
- **Status Codes:** `200 OK`, `404 Not Found`
- **Frontend Usage:** Job status polling and details modal.
- **Operation Type:** Read-Only.

---

### `GET /databases/{database_key}/records/{dataset_id}`
- **Method:** `GET`
- **Path:** `/databases/{database_key}/records/{dataset_id}`
- **Purpose:** Reads back actual persisted records directly from the target database engine for verification and evidence display.
- **Authentication:** None or Bearer Token.
- **Authorization / RBAC:** Public / Operator.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "database_key": "RelationalDB",
    "dataset_id": "masterdb_final_closure",
    "record_count": 2,
    "records": [
      {
        "id": "MASTERDB-FINAL-E2E-001",
        "dataset": "masterdb_final_closure",
        "status": "VERIFIED_PERSISTED",
        "value": 100
      },
      {
        "id": "MASTERDB-FINAL-E2E-002",
        "dataset": "masterdb_final_closure",
        "status": "VERIFIED_PERSISTED",
        "value": 200
      }
    ]
  }
  ```
- **Status Codes:** `200 OK`, `404 Not Found`
- **Frontend Usage:** Real-time persistence proof card and evidence viewer in `ControlledIngestion.tsx` and `IngestionJobs.tsx`.
- **Operation Type:** Read-Only.

---

## 8. System Administration

### `GET /admin/configuration`
- **Method:** `GET`
- **Path:** `/admin/configuration`
- **Purpose:** Generates a configuration audit report of active runtime parameters (sanitized, zero secrets).
- **Authentication:** Bearer Token.
- **Authorization / RBAC:** `bhiv-admin` or `admin`.
- **Request Body:** None.
- **Response:**
  ```json
  {
    "status": "COMPLIANT",
    "environment": "production",
    "storage_backend": "sqlite",
    "auth_mode": "jwt_bearer",
    "cors_origins": ["*"]
  }
  ```
- **Status Codes:** `200 OK`, `401 Unauthorized`, `403 Forbidden`
- **Frontend Usage:** Admin configuration viewer (`/admin`).
- **Operation Type:** Read-Only.

---

### `GET /admin/backup`
- **Method:** `GET`
- **Path:** `/admin/backup`
- **Purpose:** Exports a non-destructive JSON snapshot of the full system state.
- **Authentication:** Bearer Token.
- **Authorization / RBAC:** `bhiv-admin` or `admin`.
- **Request Body:** None.
- **Response:** Complete JSON snapshot including packages, registry, and audit log entries.
- **Status Codes:** `200 OK`, `401 Unauthorized`, `403 Forbidden`
- **Frontend Usage:** "Generate Backup" button on `/admin`.
- **Operation Type:** Controlled Read / Export.

---

### `POST /admin/restore`
- **Method:** `POST`
- **Path:** `/admin/restore`
- **Purpose:** Restores system state from a validated backup snapshot.
- **Authentication:** Bearer Token.
- **Authorization / RBAC:** `bhiv-admin`.
- **Request Body:**
  ```json
  {
    "snapshot": { ... },
    "acknowledge_destructive": true
  }
  ```
- **Response:**
  ```json
  {
    "status": "RESTORED",
    "records_restored": 42,
    "timestamp": "2026-10-03T06:17:35Z"
  }
  ```
- **Status Codes:** `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`
- **Frontend Usage:** Protected restore wizard requiring confirmation modal and checkbox.
- **Operation Type:** Destructive Controlled Mutation.
