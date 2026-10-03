# MASTERDB Control Center — Frontend API Integration Architecture

> Architectural guide to the API integration layer in the MASTERDB Control Center.

---

## 1. Integration Principles

The integration layer bridges the React Single Page Application and the MASTERDB FastAPI backend under the following core rules:

1. **Centralized Client:** All network traffic flows exclusively through `ApiClient` (`src/api/client.ts`). No raw `fetch` calls are made within React components.
2. **Strict Type Safety:** Every request payload and response schema is typed in `src/types/masterdb.ts`, directly mirroring backend Pydantic models.
3. **Graceful Error Normalization:** Backend error formats (including nested `{ "error": { "message": "...", "type": "...", "path": "..." } }` and Pydantic validation error lists) are normalized into standard `APIError` objects.
4. **Token Security:** Bearer tokens are stored in volatile JavaScript memory (never in `localStorage` or browser storage) to prevent token leakage.
5. **No Direct Database Access:** The client interacts with storage engines exclusively via the MASTERDB REST gateway.

---

## 2. API Client Implementation

The `ApiClient` class provides robust HTTP request orchestration:

```typescript
// src/api/client.ts
export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path);
    const headers = new Headers(options.headers);

    if (this.token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10000);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw await this.parseError(response);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

---

## 3. Error Normalization Pipeline

FastAPI services can return errors in multiple structural variants:
- Plain string message: `{"detail": "Not found"}`
- Structured error envelope: `{"error": {"message": "Unauthorized", "type": "auth_error", "path": "/ingest"}}`
- Pydantic validation array: `{"detail": [{"loc": ["body", "dataset_id"], "msg": "field required"}]}`

`ApiClient.parseError` automatically parses and normalizes these into:

```typescript
export interface APIError {
  message: string;
  status: number;
  type?: string;
  path?: string;
  details?: unknown;
}
```

---

## 4. Binary Upload Transfer (`application/octet-stream`)

File content upload bypasses multipart form encoding to stream exact raw bytes directly to the backend:

```typescript
// src/api/upload.ts
export async function uploadFileContent(
  uploadId: string,
  content: Blob | ArrayBuffer
): Promise<UploadJobSummary> {
  return apiClient.request<UploadJobSummary>(`/upload/${uploadId}/content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    body: content,
    timeoutMs: 60000, // 60s timeout for large uploads
  });
}
```

---

## 5. Client-Side SHA-256 Checksum

Before initializing an upload session, the frontend calculates the file's SHA-256 checksum using the native Web Cryptography API:

```typescript
async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digestBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(digestBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

This hash is sent in `POST /upload` and compared byte-for-byte on the backend when `POST /upload/{id}/content` is received.

---

## 6. Dynamic Target Database Capability Matrix

The Control Center retrieves database engine metadata from `GET /databases`:

```typescript
export interface TargetDatabaseInfo {
  database_key: string;
  name: string;
  description: string;
  accepted_formats: string[];
  required_role: string;
}
```

When a user selects a file (e.g. `CSV`), the UI checks `accepted_formats.includes(fileFormat)`:
- Compatible targets (e.g. `RelationalDB`, `TimeSeriesDB`, `LedgerDB`, `ObjectStore`) are enabled.
- Incompatible targets (e.g. `VectorDB`) are disabled with an informative badge.

---

## 7. Ingestion Submission & Read-Back Verification

### Ingestion Dispatch
`POST /ingest` receives the validated parameters:
```json
{
  "upload_id": "upl-613917ce2612",
  "dataset_id": "masterdb_final_closure",
  "package_id": "pkg-masterdb_final_closure",
  "target_database": "RelationalDB",
  "metadata": { "pipeline": "controlled_ingestion" }
}
```

### Job Polling
The UI polls `GET /ingest/jobs/{job_id}` at 1-second intervals until reaching terminal state (`PERSISTED`, `PARTIAL_PERSISTENCE`, `FAILED`, `REJECTED`).

### Read-Back Verification
Upon reaching `PERSISTED`, the frontend immediately issues:
```
GET /databases/RelationalDB/records/masterdb_final_closure
```
The returned records are rendered directly in the **Verified Persistence Proof** card, proving database persistence over HTTP.

---

## 8. Development Proxy vs Production URLs

### Development (`vite.config.ts`)
The Vite development server proxies API requests to `http://127.0.0.1:8000`:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/health': 'http://127.0.0.1:8000',
      '/ready': 'http://127.0.0.1:8000',
      '/upload': 'http://127.0.0.1:8000',
      '/ingest': 'http://127.0.0.1:8000',
      '/databases': 'http://127.0.0.1:8000',
      '/discovery': 'http://127.0.0.1:8000',
      '/packages': 'http://127.0.0.1:8000',
      '/admin': 'http://127.0.0.1:8000',
      '/auth': 'http://127.0.0.1:8000',
    },
  },
});
```

### Production Deployment
- **Same-Origin / Reverse Proxy:** Set `VITE_MASTERDB_API_URL=""` (empty). Requests use relative paths (e.g. `/ingest`), forwarded to the backend by the reverse proxy.
- **Cross-Origin Deployment:** Set `VITE_MASTERDB_API_URL="https://api.masterdb.internal"`. Requests use absolute URLs, requiring backend CORS configuration.
