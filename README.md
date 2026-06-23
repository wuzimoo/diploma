# BauPilot

BauPilot ist eine deutschsprachige Demo fuer Bauunternehmen. Das Monorepo enthaelt ein FastAPI-Backend, ein React/Vite-Frontend und ein Render-Blueprint fuer API plus PostgreSQL.

## Stack

- Backend: FastAPI, SQLAlchemy, Alembic, Pydantic, JWT
- Frontend: React, Vite, TypeScript, React Router, Axios
- Datenbank: PostgreSQL
- Deployment: Render fuer Backend und Datenbank, Vercel fuer das Frontend

## Struktur

```text
backend/   REST API, Modelle, Migrationen, Seed-Daten
frontend/  Web- und Mobile-optimiertes Demo-Frontend
render.yaml Render Blueprint fuer API + PostgreSQL
```

## Lokaler Start

### PostgreSQL

```bash
createdb baupilot
```

Oder mit Docker:

```bash
docker run --name baupilot-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=baupilot -p 5432:5432 -d postgres:16
```

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload
```

API-Dokumentation: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend-URL: `http://localhost:5173`

## Demo-Zugaenge

- Admin: `admin@baupilot.demo` / `Admin12345`
- Polier: `foreman@baupilot.demo` / `Foreman12345`
- Mitarbeiter: `worker@baupilot.demo` / `Worker12345`

## Freigabe-Workflow

- `draft`: Entwurf oder lokal gespeicherter Bericht
- `submitted`: vom Mitarbeiter eingereicht, wartet auf Polierfreigabe
- `foreman_approved`: vom Polier freigegeben, wartet auf finale Freigabe
- `admin_approved`: final freigegeben und fuer Lohnabrechnung beruecksichtigt
- `change_requested`: Nacharbeit angefordert
- `rejected`: abgelehnt

## Tests

```bash
cd frontend
npm run test:e2e
```

Die Playwright-Suite deckt Login, Berichtserstellung, Freigaben, Kommentare, Mitarbeiterverwaltung und CSV-Export ab.

## Deployment

### Render

- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `alembic upgrade head && python -m app.db.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health Check: `/api/health`

Wichtige Variablen:

```env
DATABASE_URL=<Render Internal Database URL>
SECRET_KEY=<secure-random-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173
ENVIRONMENT=production
PYTHON_VERSION=3.11.9
```

Hinweis: `backend/app/core/config.py` erlaubt zusaetzlich Preview-Origin-URLs ueber `https://.*.vercel.app`.

### Vercel

- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Env Var: `VITE_API_URL=<Render Backend URL>/api`
