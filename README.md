# Vehicle Inspection Platform

A production-ready, **white-label** AI vehicle inspection web application. Users capture 11 walk-around images of a vehicle, the platform sends them to the **CamCom AI** engine, receives a damage assessment via webhook, and surfaces everything on a clean dashboard — all under **your** brand.

> This project builds the **frontend, backend, integration, dashboard, webhook receiver, database, and image upload flow**. The AI damage detection itself is performed by CamCom.

---

## Architecture

```
+----------+      +--------------+      +-----------+
| Next.js  | ---> |   FastAPI    | ---> |  CamCom   |
| (UI)     | <--- |   (Backend)  | <--- |  (AI API) |
+----------+      +--------------+      +-----------+
                       |   ^
                       v   |
                  +----------+        (HMAC-signed webhook callback)
                  | Postgres |
                  +----------+
```

- **Frontend** — Next.js 14, TypeScript, Tailwind CSS, ShadCN-style components, React Hook Form, Axios
- **Backend** — FastAPI (async), SQLAlchemy 2, Alembic, JWT auth, Pillow validation, httpx CamCom client
- **DB** — PostgreSQL 16
- **Storage** — Local filesystem (S3-ready via abstraction in `app/services/storage.py`)
- **Reverse proxy** — Nginx, terminating one origin for both UI and API
- **Containerised** — Docker + docker-compose

---

## Project layout

```
vehicle-inspection-platform/
├── backend/                   FastAPI service
│   ├── app/
│   │   ├── api/               Route handlers (auth, inspections, dashboard, webhook, users)
│   │   ├── core/              config + security helpers
│   │   ├── db/                async SQLAlchemy session + base
│   │   ├── models/            ORM models (users, inspections, uploaded_images, roi_images,
│   │   │                      assessments, webhook_logs)
│   │   ├── schemas/           Pydantic v2 schemas
│   │   ├── services/          CamCom client + storage backend
│   │   ├── utils/             Image validation
│   │   └── main.py            FastAPI app entry-point
│   ├── alembic/               Migrations (initial schema included)
│   ├── uploads/               Local image store (mounted as volume)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── alembic.ini
│   └── .env.example
├── frontend/                  Next.js 14 app router
│   ├── src/
│   │   ├── app/               Pages: /, /login, /dashboard, /inspections, /inspections/create,
│   │   │                      /inspections/[id], /inspections/[id]/upload, /settings
│   │   ├── components/        ui/ (button, card, input, etc.), layout/, inspection/
│   │   ├── hooks/             useAuth (React context)
│   │   ├── lib/               api client + utils
│   │   └── types/             Shared TS interfaces
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── .env.example
├── nginx/nginx.conf           Reverse proxy
├── docker-compose.yml         One-command orchestration
└── README.md                  This file
```

---

## Quick start (Docker)

1. Copy environment files:
   ```bash
   cp backend/.env.example  backend/.env
   cp frontend/.env.example frontend/.env
   cp .env.example          .env
   ```
2. Edit `backend/.env`:
   - `CAMCOM_EMAIL`, `CAMCOM_PASSWORD` — your CamCom credentials
   - `CAMCOM_BASE_URL` — the CamCom API base URL
   - `CAMCOM_WEBHOOK_SECRET` — shared HMAC secret used to verify callbacks
   - `SECRET_KEY` — long random string for JWT signing
   - `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` — first admin account (seeded on first run)
3. Boot everything:
   ```bash
   docker compose up --build
   ```
4. Open the app: <http://localhost:3000>
   - Sign in with the bootstrap admin credentials.
5. Open API docs: <http://localhost:8000/api/docs>

Nginx is also exposed on port 80 (`http://localhost`) and serves both frontend and `/api/*` / `/webhook/*` / `/uploads/*` from a single origin — useful behind a reverse proxy or load balancer.

---

## Quick start (local without Docker)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit DATABASE_URL to point at your Postgres
alembic upgrade head   # (or rely on the auto create_all in dev)
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev            # http://localhost:3000
```

---

## End-to-end user flow

1. **User signs in** at `/login` (JWT issued by `/api/auth/login`).
2. **Create inspection** at `/inspections/create` — supplies `ref_num`, vehicle number, model, customer.
3. **Capture / upload** the 11 angles at `/inspections/{id}/upload`. Each image is validated client-side (landscape, ≥1920×1080, JPG/PNG) and again server-side, then stored locally.
4. **Submit** — backend calls CamCom:
   - `POST /client_login` → JWT (cached in-memory)
   - `POST /gen-trinetra-url` with `{ "ref_num": ... }` → inspection URL
   - Each image is then POSTed to the returned upload endpoint
5. **Status** transitions to `INITIATED` (or `FAILED` on upload error).
6. **CamCom processes** the images asynchronously.
7. **Webhook** — CamCom POSTs the result to `POST /webhook/camcom`. The handler:
   - verifies `X-CamCom-Signature` (HMAC-SHA256 of body using `CAMCOM_WEBHOOK_SECRET`)
   - persists the full payload to `webhook_logs`
   - maps the callback to ORM tables: `roi_images`, `assessments`, and updates `inspections.status` (`1→initiated`, `2→in_progress`, `3→completed`, `6→failed`)
8. **Dashboard** — `/inspections/{id}` shows the timeline, uploaded images, ROI overlays, and per-part damage cards. The status poll auto-refreshes while processing.

---

## API reference (high-level)

| Method | Path                                          | Description                                     |
|--------|-----------------------------------------------|-------------------------------------------------|
| POST   | `/api/auth/login`                             | Email + password → JWT                          |
| POST   | `/api/auth/register`                          | Create a new user                               |
| GET    | `/api/auth/me`                                | Current user                                    |
| PUT    | `/api/users/me`                               | Update profile / password                       |
| POST   | `/api/inspections`                            | Create inspection (DRAFT)                       |
| GET    | `/api/inspections`                            | Paginated list with `status` and `search`       |
| GET    | `/api/inspections/{id}`                       | Detail including images, ROI, assessments       |
| PUT    | `/api/inspections/{id}`                       | Update draft / failed inspection                |
| DELETE | `/api/inspections/{id}`                       | Remove inspection + cascade                     |
| POST   | `/api/inspections/{id}/images`                | Upload one angle (multipart form: `angle`,`file`) |
| DELETE | `/api/inspections/{id}/images/{image_id}`     | Remove a single image                           |
| POST   | `/api/inspections/{id}/submit`                | Push to CamCom (gen-url + image upload)         |
| GET    | `/api/inspections/meta/angles`                | Canonical list of the 11 angle slugs            |
| GET    | `/api/dashboard/stats`                        | Counts + recent inspections                     |
| POST   | `/webhook/camcom`                             | CamCom callback receiver (HMAC verified)        |
| GET    | `/api/health`                                 | Liveness                                        |

OpenAPI: <http://localhost:8000/api/docs>

---

## CamCom integration notes

The integration is encapsulated in `backend/app/services/camcom.py`:

- Token is **cached in-memory** and refreshed once per hour or on 401.
- All three call paths are configurable via env: `CAMCOM_LOGIN_PATH`, `CAMCOM_GEN_URL_PATH`, `CAMCOM_UPLOAD_PATH`.
- The image upload step is run in a **FastAPI background task** so the HTTP submit returns quickly.
- The webhook receiver is **tolerant** of multiple payload shapes (`ref_num` at top-level, under `data`, or `assessment_report`).

### Webhook signature

Calculate `hex(HMAC-SHA256(secret, raw_body))`, place it in the `X-CamCom-Signature` header. The receiver accepts both `<hex>` and `sha256=<hex>` formats.

If `CAMCOM_WEBHOOK_SECRET` is empty (default `.env.example` has a placeholder), the receiver allows any payload — useful for local dev only.

### Required image angles (slugs)

`front`, `front_left`, `front_right`, `left`, `rear`, `rear_left`, `rear_right`, `right`, `windshield`, `chassis_vin`, `odometer`

---

## White-labelling

- Brand name + tagline: `NEXT_PUBLIC_BRAND_NAME` and `NEXT_PUBLIC_BRAND_TAGLINE` (frontend `.env`)
- Logo: `frontend/src/components/layout/Brand.tsx` (replace the inline SVG)
- Palette: `frontend/src/app/globals.css` — HSL CSS variables at the top of the file
- Favicon: `frontend/public/favicon.svg`

No CamCom branding appears anywhere in the UI.

---

## Database

Tables (all defined in `backend/app/models/`):

- `users`
- `inspections` — `ref_num`, `vehicle_*`, `status` (enum), CamCom URL/session, error, timestamps
- `uploaded_images` — one row per angle per inspection
- `roi_images` — return crops from CamCom
- `assessments` — `part_name`, `action`, `dam_type`, `intensity`, `pictures` (JSON), `raw` (full segment)
- `webhook_logs` — raw payload + signature validity for audit

Run migrations:

```bash
cd backend
alembic upgrade head
```

To create a new migration after changing a model:

```bash
alembic revision --autogenerate -m "your message"
```

---

## Storage

The default backend (`LocalStorage`) writes to `backend/uploads/<ref_num>/<angle>_<id>.<ext>` and serves the files at `/uploads/...`. Switch to S3 by setting `USE_S3=true` and the `AWS_*` variables — the `S3Storage` class in `services/storage.py` is wired and ready.

---

## Security checklist for production

- Replace `SECRET_KEY` and all default passwords.
- Put the stack behind HTTPS (terminate TLS at Nginx or an upstream load balancer).
- Set `DEBUG=false` and lock `CORS_ORIGINS` to your domain.
- Require a non-empty `CAMCOM_WEBHOOK_SECRET`.
- Rotate the bootstrap admin password immediately after first login.
- Enable database backups (Postgres volume).

---

## Scripts

```bash
# Frontend
npm run dev          # dev server
npm run build        # production build
npm run start        # serve the build
npm run type-check   # tsc --noEmit
npm run lint         # next lint

# Backend
uvicorn app.main:app --reload     # dev server
alembic upgrade head              # migrate
alembic revision --autogenerate   # new migration
```

---

## License

Internal / proprietary — adapt as needed for your deployment.