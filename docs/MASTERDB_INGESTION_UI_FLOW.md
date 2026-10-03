# MASTERDB Controlled Ingestion — End-to-End User Flow & Lifecycle

> Architectural specification and visual workflow for the Controlled Data Ingestion subsystem in MASTERDB Control Center.

---

## 1. High-Level Ingestion Flow

The Controlled Ingestion pipeline guarantees data sovereign governance, cryptographic integrity verification, format enforcement, and storage isolation.

```
BROWSER (Control Center)
   │
   ├─► 1. Select File & Calculate Client-Side SHA-256
   ├─► 2. Initialize Session (POST /upload)
   ├─► 3. Transmit Raw Octet-Stream (POST /upload/{id}/content)
   ├─► 4. Trigger Pre-Ingest Validation (POST /upload/{id}/validate)
   ├─► 5. Select Dynamic Target Database (GET /databases)
   ├─► 6. Review Configuration & Target Capabilities
   └─► 7. Submit Controlled Ingestion (POST /ingest)
           │
           ▼
MASTERDB BACKEND (FastAPI Ingestion Engine)
   │
   ├─► 8. Server-Side RBAC & Session Ownership Verification
   ├─► 9. Format & Schema Compatibility Check
   ├─► 10. Automated Certification Gate Evaluation
   ├─► 11. Sovereign Storage Routing & Physical Record Persistence
   ├─► 12. Package Registration in Sovereign Catalogue
   └─► 13. State Transition to AVAILABLE & PERSISTED
           │
           ▼
READ-BACK VERIFICATION & AUDIT (Control Center)
   │
   ├─► 14. Poll Job State (GET /ingest/jobs/{job_id})
   ├─► 15. Query Live Persisted Records (GET /databases/{key}/records/{id})
   └─► 16. Render Cryptographic Evidence & Record Proofs
```

> **Critical Architecture Rule:** The browser client **never** connects or writes directly to target databases. All mutations pass strictly through the authenticated MASTERDB ingestion gateway.

---

## 2. Supported File Formats & System Constraints

### Supported Formats
The ingestion engine accepts 9 sovereign file types:
- **`JSON`** — Structured JSON documents, objects, or arrays of records.
- **`CSV`** — Comma-separated tabular dataset files.
- **`XLSX`** — Microsoft Excel spreadsheets and multi-sheet workbooks.
- **`PDF`** — Document corpora and unstructured text publications.
- **`TXT`** — Plain text files, log exports, and raw text chunks.
- **`PNG`** — Raster graphics and visual dataset artifacts.
- **`JPEG`** — Compressed image data and computer vision corpora.
- **`GIF`** — Animated or frame-sequence visual assets.
- **`ZIP`** — Bundled archives and multi-file packages.

### Constraints
- **Maximum Configured Upload Size:** `500 MiB` (`524,288,000 bytes`).
- **Binary Transfer Encoding:** `application/octet-stream` streamed via HTTP POST.
- **Checksum Verification:** SHA-256 computed on client and verified byte-for-byte by backend.

---

## 3. Dynamic Target Databases & Routing Rules

The Control Center queries `GET /databases` on mount to retrieve the active storage matrix:

| Database Key | Storage Engine | Accepted Formats | Required Role | Primary Use Case |
|---|---|---|---|---|
| **`RelationalDB`** | SQLite / PostgreSQL | `CSV`, `JSON`, `XLSX` | `operator` | Structured tabular records with SQL indexing |
| **`VectorDB`** | Vector Index / FAISS | `JSON`, `TXT`, `PDF` | `operator` | High-dimensional semantic embeddings & RAG |
| **`DocumentStore`** | Document Engine | `JSON`, `PDF`, `TXT` | `operator` | Semi-structured documents and nested JSON trees |
| **`GraphStore`** | Knowledge Graph | `JSON`, `CSV` | `operator` | Nodes, edges, and entity-relationship models |
| **`TimeSeriesDB`** | Temporal Store | `CSV`, `JSON` | `operator` | Timestamped telemetry and sensor logs |
| **`LedgerDB`** | Immutable Ledger | `JSON`, `CSV` | `operator` | Append-only cryptographically verifiable audit events |
| **`ObjectStore`** | Sovereign Blob Store | `PNG`, `JPEG`, `GIF`, `ZIP`, `PDF`, `TXT`, `CSV`, `JSON` | `operator` | Raw binary blobs and large archive assets |

---

## 4. Step-by-Step UI Execution Flow

### Step 1: File Selection & Integrity Hashing
1. User drags and drops or browses for a dataset file in `ControlledIngestion.tsx`.
2. The browser FileReader computes the SHA-256 hash client-side.
3. System verifies file size is within the 500 MiB ceiling.
4. Auto-detects format from extension and assigns initial dataset identifier.

### Step 2: Session Initialization (`POST /upload`)
- Sends metadata payload:
  ```json
  {
    "filename": "dataset.json",
    "size_bytes": 284,
    "file_format": "JSON",
    "sha256": "f5f590b1faae8be114e918b958dc1800109ae49b77dbd4ec8ab0b4c8031d2797",
    "metadata": { "dataset_id": "masterdb_final_closure" }
  }
  ```
- Backend returns `upload_id: "upl-613917ce2612"` and `trace_id`.
- Upload state enters: `RECEIVED`.

### Step 3: Binary Transfer (`POST /upload/{upload_id}/content`)
- Browser streams raw binary bytes with `Content-Type: application/octet-stream`.
- Backend verifies byte length and validates SHA-256 against session initialization.
- Backend writes the artifact into temporary session storage.

### Step 4: Pre-Ingestion Format Validation (`POST /upload/{upload_id}/validate`)
- Triggers backend structural check on the uploaded file.
- Upload state transitions: `VALIDATING` → `VALIDATED`.
- Reports `records_detected`, validation errors, or warnings.

### Step 5: Target Database Selection & Role Check
- UI dynamically filters target database cards based on uploaded format compatibility.
- Incompatible databases are visually disabled with explanatory tooltips.
- UI checks user's active token roles against `required_role`.

### Step 6: Review & Final Confirmation
- Displays summary card:
  - Dataset ID & Package ID
  - Target Database Engine
  - File format & File size
  - SHA-256 checksum & Trace ID
- User confirms execution.

### Step 7: Submission (`POST /ingest`)
- Frontend issues authenticated ingestion command:
  ```json
  {
    "upload_id": "upl-613917ce2612",
    "dataset_id": "masterdb_final_closure",
    "package_id": "pkg-masterdb_final_closure",
    "target_database": "RelationalDB",
    "metadata": { "pipeline": "controlled_ingestion" }
  }
  ```
- Backend returns `job_id: "ingest-26afcc5fcae7"` and initial status.

---

## 5. Upload & Ingestion State Lifecycles

### Upload Session Lifecycle
```
[UPLOAD_INITIATED]
       │
       ▼
   [RECEIVED] ───────────────► (Error / SHA mismatch) ──► [REJECTED]
       │
       ▼
  [VALIDATING]
       │
       ▼
  [VALIDATED] ───────────────► (Structural Failure)   ──► [REJECTED]
       │
       ▼
  [REGISTERED]
       │
       ▼
   [INGESTED]
       │
       ▼
  [AVAILABLE]  (Terminal Success State)
```

### Ingestion Job States
- **`PENDING`**: Ingestion task enqueued in backend scheduler.
- **`PROCESSING`**: Records being transformed and written to target storage engine.
- **`PERSISTED`**: All records successfully written to target database and verified.
- **`PARTIAL_PERSISTENCE`**: Subset of records written, with detailed error summary.
- **`FAILED`**: Ingestion rejected due to fatal format, schema, or storage error.
- **`REJECTED`**: Ingestion blocked by RBAC, certification gate, or explicit cancellation.

---

## 6. Real-Time Read-Back Verification

Upon reaching `PERSISTED` state:
1. Control Center automatically dispatches:
   `GET /databases/{target_database}/records/{dataset_id}`
2. Displays the **Verified Persistence Proof** card:
   - Persisted Record Count
   - Target Database Key
   - Interactive JSON record inspector
   - Trace ID and timestamp
3. Directly demonstrates to operators that the data physically exists in the target storage tier.

---

## 7. Rejection & Failure Handling

| Failure Point | Backend Response | UI Behavior |
|---|---|---|
| **Unauthenticated Request** | `401 Unauthorized` | Prompts user to refresh token or re-authenticate |
| **Viewer role attempting ingest** | `403 Forbidden` | Disables submit button; shows role permission warning |
| **Checksum mismatch on upload** | `400 Bad Request` | Flags file corruption; prompts immediate re-upload |
| **Incompatible format for DB** | Blocked client-side + `422 Unprocessable` | Explains format incompatibility; disables selection |
| **Database write failure** | `500 Internal Error` / `FAILED` job status | Displays error trace and link to backend logs |
