# MASTERDB Control Center — Production Deployment Guide

> Operational deployment and hosting guide for the MASTERDB Control Center Single Page Application.

---

## 1. Deployment Overview

The MASTERDB Control Center is a static Single Page Application (SPA) built with React and Vite. It compiles down to pure HTML, CSS, and JavaScript files in the `dist/` folder, which can be served by any high-performance static web server or CDN.

```
Client Browser
     │
     ▼
Static Web Server / CDN (Nginx / Caddy / Cloudflare / Vercel)
     │
     ├── /assets/*, index.html  ──> Serve static bundle from dist/
     │
     └── /health, /ingest, ...  ──> Reverse-proxy to MASTERDB FastAPI Backend
```

---

## 2. Environment Variables

| Variable | Scope | Purpose | Example Value |
|---|---|---|---|
| `VITE_MASTERDB_API_URL` | Build-time | Base URL for MASTERDB API calls. If empty, relative paths are used. | `https://api.masterdb.domain` or `""` |

> ⚠️ **Security Warning:** Any variable prefixed with `VITE_` is compiled into the client-side JavaScript bundle and is publicly visible to anyone inspecting network traffic. **Never** put database credentials, private keys, or JWT secrets in `.env` files.

---

## 3. Build & Verification Pipeline

Run the complete build pipeline to ensure zero type errors, clean linting, and optimized bundle emission:

```bash
# 1. Verify strict TypeScript compliance (must return 0 errors)
npm run type-check

# 2. Verify ESLint code standards (must return 0 errors, 0 warnings)
npm run lint

# 3. Compile optimized production assets
npm run build
```

The resulting `dist/` directory contains:
- `index.html` — Application entry point
- `assets/index-[hash].css` — Production CSS stylesheet
- `assets/index-[hash].js` — Minified, treeshaken JavaScript application bundle

---

## 4. Production Hosting Topologies

### Topology A: Reverse-Proxy (Recommended)
In this setup, a reverse proxy (e.g. Nginx, Caddy) serves the static frontend and proxies API paths to the FastAPI backend under the same hostname.

#### Nginx Configuration Example (`nginx.conf`):
```nginx
server {
    listen 80;
    server_name masterdb.domain.com;
    root /var/www/masterdb-control-center/dist;
    index index.html;

    # SPA Client Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend service
    location ~ ^/(health|ready|metrics|discovery|packages|validate|status|report|certify|mdu|tantra|runtime|shared|parikshak|niyantran|replay-registry|admin|auth|databases|upload|ingest) {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 500M;
    }
}
```

### Topology B: Standalone Static CDN + Cross-Origin API
If the frontend is hosted on a static CDN (e.g. Vercel, Cloudflare Pages, S3/CloudFront) and the backend is on a separate domain (e.g. `api.masterdb.domain.com`):

1. Set `VITE_MASTERDB_API_URL=https://api.masterdb.domain.com` in your build environment.
2. Ensure the MASTERDB backend is configured with production CORS:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://controlcenter.masterdb.domain.com"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```
3. Ensure client upload body size allows up to 500 MiB on the backend gateway.

---

## 5. Backend Operational Prerequisites

For the Control Center to function properly, the MASTERDB backend service must be running with:
1. **Health Endpoints Active:** `GET /health` and `GET /ready` responding.
2. **Auth Mode Configured:** `POST /auth/token` issuing valid signed JWT tokens.
3. **Database Registry Initialized:** `GET /databases` returning active target engines.
4. **Storage Permissions:** File storage directories configured with write permissions for uploads up to 500 MiB.
5. **CORS Configured:** Production origins permitted for cross-origin requests.

---

## 6. Pre-Flight Deployment Checklist

- [x] All TypeScript checks pass (`npm run type-check`).
- [x] All ESLint rules pass (`npm run lint`).
- [x] Production build generated cleanly (`npm run build`).
- [x] Zero hardcoded machine paths or localhost URLs in source files.
- [x] Zero secrets, tokens, or passwords in repository or build assets.
- [x] Maximum request body size configured to at least 500 MiB on reverse proxy.
- [x] SPA fallback routing (`try_files $uri /index.html`) configured on web server.
