# ComplyGeM AI

AI-powered bid compliance verification for [Government e-Marketplace (GeM)](https://gem.gov.in) procurement. Procurement officers score bidder packets against Udyam/MSME, GSTN, PAN, MCA21, EPFO/ESIC, DigiLocker, NSIC and Startup India. Bidders upload artefacts and track their own compliance status.

This is a local development monorepo. The AI module in `backend/app/services/ai_verification.py` is a **deterministic OCR + rule stub**. Each check is marked with a `TODO` for the live portal API.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| Backend | FastAPI, SQLAlchemy 2, Alembic, JWT (HS256) |
| Database | PostgreSQL 16 |

## Quick start (Docker)

```bash
docker compose up --build
```

- App: http://localhost:8080
- API docs: http://localhost:8000/docs
- Postgres: `localhost:5432` (user/password/db: `complygem`)

The backend runs `alembic upgrade head` and `python seed.py` on startup. Seeding is skipped if users already exist.

## Demo accounts

Password for every seeded account: `Gem@2026!`

| Role | Email |
| --- | --- |
| Procurement Officer | priya.nair@gem.gov.in |
| Procurement Officer | arjun.mehta@gem.gov.in |
| Bidder (Bharat Precision) | ravi.shinde@bharatprecision.in |
| Bidder (Kaveri MedTech) | ananya.rao@kaverimedtech.in |
| Bidder (Ganga Mart) | suresh.gupta@gangamart.in |
| Bidder (Sahyadri Cloud) | meera.joshi@sahyadricloud.in |
| Bidder (Eastern Electricals) | amit.banerjee@easternelectricals.in |

## Local development without Docker

### PostgreSQL

Create a database matching `backend/.env.example`:

```text
DATABASE_URL=postgresql+psycopg://complygem:complygem@localhost:5432/complygem
```

# Recommended: Python 3.12 (matches Docker). Python 3.14 may need newer wheels for pydantic-core.

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env   # or cp .env.example .env
alembic upgrade head
python seed.py
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:8000`. Open http://localhost:5173.

## HTTP API (prefix `/api`)

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | public | Create officer or bidder account |
| POST | `/auth/login` | public | JWT login |
| GET | `/auth/me` | auth | Current user |
| POST | `/documents` | auth | Multipart upload (`document_type`, optional `tender_id`, `file`) |
| GET | `/documents` | auth | List uploaded documents |
| GET | `/bids` | auth | List bids (`q`, `status`, `risk`). Officers see all; bidders see own |
| GET | `/bids/{id}` | auth | Packet, checklist, latest score |
| POST | `/bids/{id}/verify` | auth | Run stubbed AI verification |
| GET | `/bids/{id}/compliance` | auth | Latest score / risk / recommendation |
| POST | `/bids/{id}/decision` | officer | Approve or reject with notes |
| GET | `/audit-logs` | auth | Searchable audit trail |

Errors use `{ "error": { "code", "message", "details?" } }`.

## Project layout

```text
frontend/     React SPA
backend/      FastAPI app, Alembic, seed.py
  app/core    settings, JWT, DB session, error handlers
  app/models  Users, Bidders, Tenders, Documents, ComplianceChecks, AuditLogs
  app/routers auth, documents, bids, audit
  app/services/ai_verification.py
docker-compose.yml
```

## Swapping in live government APIs

Edit `backend/app/services/ai_verification.py`. Keep the finding schema (`document_type`, `score`, `status`, `notes`, `extracted_fields`) so the officer UI does not change. Suggested replacements:

- Udyam registration API
- GSTN / GSP search
- NSDL PAN verification
- MCA21 master data
- EPFO ECR and ESIC coverage
- DigiLocker issued-document verify
- NSIC SPRS and Startup India DPIIT
