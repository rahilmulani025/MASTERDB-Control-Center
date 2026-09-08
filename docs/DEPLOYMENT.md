# MASTERDB Control Center — Deployment Guide

---

## Overview

The MASTERDB Control Center is a static single-page application (SPA) built with Vite. It requires no server-side rendering. Deployment consists of:

1. Building the static frontend bundle
2. Serving `dist/` from a web server or CDN
3. Configuring a reverse proxy to forward API paths to the MASTERDB backend

---

## Environment Variable

The only deployment-relevant environment variable is:

```
VITE_MASTERDB_API_URL=
```

This variable is read **at build time** by Vite and compiled into the JavaScript bundle. It cannot be changed after the build without rebuilding.

### When to leave it blank

Leave `VITE_MASTERDB_API_URL` **empty** when:

- The frontend and backend are served from the **same origin** via a reverse proxy
- All API paths (e.g. `/health`, `/packages/*`) are forwarded to the backend by the web server

In this case, the `ApiClient` sends requests to relative paths like `/discovery/packages`, which the web server routes to the backend.

### When to set an explicit URL

Set `VITE_MASTERDB_API_URL=https://api.example.com` when:

- The frontend is served from a **different host** than the backend
- There is no reverse proxy co-locating the frontend and backend

In this case, the `ApiClient` sends requests to `https://api.example.com/discovery/packages` etc. The backend must allow cross-origin requests from the frontend origin.

---

## Development Topology

```
Browser
  │
  ▼  http://127.0.0.1:5173
Vite Dev Server
  │
  ├── / (static)     → serves React app
  │
  └── /health        ─┐
      /ready           │  Vite proxy (vite.config.ts)
      /discovery       │  forwards to:
      /packages        │
      /validate        ├─→ http://127.0.0.1:8000
      /status          │   (MASTERDB FastAPI backend)
      /report          │
      /certify         │
      /mdu             │
      /tantra          │
      /runtime         │
      /shared          │
      /parikshak       │
      /niyantran       │
      /replay-registry │
      /admin           │
      /auth           ─┘
```

**Running locally:**

```bash
# Start MASTERDB backend first (follow backend setup instructions)

# Start frontend
npm run dev
# → http://127.0.0.1:5173
```

The Vite proxy handles API routing. `VITE_MASTERDB_API_URL` can be left blank in `.env` for local development.

---

## Production Topology

```
Browser
  │
  ▼  https://control-center.yourhost.com
Web Server / Reverse Proxy  (nginx / Caddy / Traefik / etc.)
  │
  ├── Location /          → serve dist/ (static files)
  │
  └── Location /health, /ready, /discovery,
               /packages, /validate, /status,
               /report, /certify, /mdu, /tantra,
               /runtime, /shared, /parikshak,
               /niyantran, /replay-registry,
               /admin, /auth
                          → proxy_pass to MASTERDB FastAPI backend
```

**Build steps:**

```bash
npm run type-check   # must pass with 0 errors
npm run lint         # must pass with 0 errors
npm run build        # produces dist/
```

Serve the contents of `dist/` as static files. Configure the SPA fallback so that all unmatched paths return `index.html` (required for client-side routing).

---

## Nginx Configuration Sketch

> The deployment team must write the final configuration. The following is a reference sketch only — adapt to your environment.

```nginx
server {
    listen 443 ssl;
    server_name control-center.yourhost.com;

    root /var/www/masterdb-control-center/dist;
    index index.html;

    # SPA fallback — required for React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Forward all API paths to MASTERDB backend
    location ~ ^/(health|ready|discovery|packages|validate|status|report|certify|mdu|tantra|runtime|shared|parikshak|niyantran|replay-registry|admin|auth) {
        proxy_pass http://masterdb-backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Caddy Configuration Sketch

```caddy
control-center.yourhost.com {
    handle /health* { reverse_proxy masterdb-backend:8000 }
    handle /ready* { reverse_proxy masterdb-backend:8000 }
    handle /discovery* { reverse_proxy masterdb-backend:8000 }
    handle /packages* { reverse_proxy masterdb-backend:8000 }
    handle /validate* { reverse_proxy masterdb-backend:8000 }
    handle /status* { reverse_proxy masterdb-backend:8000 }
    handle /report* { reverse_proxy masterdb-backend:8000 }
    handle /certify* { reverse_proxy masterdb-backend:8000 }
    handle /mdu* { reverse_proxy masterdb-backend:8000 }
    handle /tantra* { reverse_proxy masterdb-backend:8000 }
    handle /runtime* { reverse_proxy masterdb-backend:8000 }
    handle /shared* { reverse_proxy masterdb-backend:8000 }
    handle /parikshak* { reverse_proxy masterdb-backend:8000 }
    handle /niyantran* { reverse_proxy masterdb-backend:8000 }
    handle /replay-registry* { reverse_proxy masterdb-backend:8000 }
    handle /admin* { reverse_proxy masterdb-backend:8000 }
    handle /auth* { reverse_proxy masterdb-backend:8000 }
    handle {
        root * /var/www/masterdb-control-center/dist
        try_files {path} /index.html
        file_server
    }
}
```

---

## Build Environment Checklist

Before building for production, verify:

- [ ] MASTERDB backend is tested and accessible at the target URL
- [ ] `VITE_MASTERDB_API_URL` is set correctly for the target environment (or left blank for reverse-proxy mode)
- [ ] `npm run type-check` passes with 0 errors
- [ ] `npm run lint` passes with 0 errors
- [ ] `npm run build` completes successfully
- [ ] `dist/` contents are deployed to the web server root
- [ ] SPA fallback (`try_files` / `try_files`) is configured so React Router works
- [ ] All API proxy paths are configured in the web server
- [ ] CORS is configured on the MASTERDB backend if the frontend is served from a different origin

---

## No Server-Side Rendering

This application does not use SSR. There is no Node.js process required at runtime. The `dist/` directory contains:

- `index.html`
- `assets/*.js` (bundled React application)
- `assets/*.css` (compiled styles)

Serve these as standard static files.
