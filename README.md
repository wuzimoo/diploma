# Roman's ERP

Інформаційна система управління діяльністю будівельної компанії. MVP включає мобільний інтерфейс для працівника/виконроба та веб-інтерфейс для бригадира, керівника компанії й адміністратора.

## Stack

- Backend: Python, FastAPI, SQLAlchemy, Alembic, Pydantic, JWT
- Database: PostgreSQL
- Frontend: React, Vite, React Router, Axios, TypeScript
- Deploy: Render для backend, Vercel для frontend

## Architecture

Monorepo:

```text
backend/   FastAPI REST API, SQLAlchemy models, Alembic migrations, seed data
frontend/  React/Vite UI for worker mobile flow and foreman/admin web flow
docs/      architecture, modules, API, database and deployment documentation
render.yaml Render Blueprint for API + PostgreSQL
```

## Local PostgreSQL

```bash
createdb romans_erp
```

Or with Docker:

```bash
docker run --name romans-erp-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=romans_erp -p 5432:5432 -d postgres:16
```

## Backend

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

API docs: `http://localhost:8000/docs`.

## Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend URL: `http://localhost:5173`.

## Tests And CI

Frontend e2e tests cover login, worker mobile flow, daily report creation, calendar, logout, admin dashboard, report filters, report approval, employees and objects pages:

```bash
cd frontend
npm run test:e2e
```

CI is configured in `.github/workflows/ci.yml`:

- backend job installs dependencies, runs Alembic migrations on a smoke database, seeds demo data and imports the FastAPI app;
- frontend job runs `npm ci`, `npm run build`, installs Playwright Chromium and uploads HTML reports/traces on failures.

## Demo Logins

- Admin: `admin@romans-erp.demo` / `Admin12345`
- Foreman: `foreman@romans-erp.demo` / `Foreman12345`
- Worker: `worker@romans-erp.demo` / `Worker12345`

## Deployment

Render hosts the backend API and PostgreSQL. The repository includes `render.yaml` for repeatable Blueprint deploys.

- Root Directory: `backend`
- Runtime: Python 3
- Region: Frankfurt
- Build command: `pip install -r requirements.txt`
- Pre-deploy command: `alembic upgrade head`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/api/health`

Add a Render PostgreSQL database in the same region and use its Internal Database URL as `DATABASE_URL`.

Required Render backend variables:

```env
DATABASE_URL=<Render Internal Database URL>
SECRET_KEY=<secure-random-secret>
PYTHON_VERSION=3.11.9
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=https://frontend-pv2bfge8f-daniils-projects-5bff5a67.vercel.app,https://frontend-three-kappa-60.vercel.app,http://localhost:5173
ENVIRONMENT=production
```

Seed Render demo data once after the database is attached and migrations have run:

```bash
python -m app.db.seed
```

Vercel deploys `frontend` with:

- Build command: `npm run build`
- Output directory: `dist`
- Env var: `VITE_API_URL=https://diploma-njc4.onrender.com/api`

After Render deploys the backend, update Vercel `VITE_API_URL` and redeploy the frontend.

## Links

- GitHub: https://github.com/wuzimoo/diploma.git
- Vercel: https://frontend-pv2bfge8f-daniils-projects-5bff5a67.vercel.app
- Vercel alias: https://frontend-three-kappa-60.vercel.app
- Render backend: https://diploma-njc4.onrender.com
