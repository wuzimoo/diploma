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

## Demo Logins

- Admin: `admin@romans-erp.demo` / `Admin12345`
- Foreman: `foreman@romans-erp.demo` / `Foreman12345`
- Worker: `worker@romans-erp.demo` / `Worker12345`

## Deployment

Render uses `render.yaml` and provisions:

- `romans-erp-api` Python web service
- `romans-erp-db` PostgreSQL database

Vercel deploys `frontend` with:

- Build command: `npm run build`
- Output directory: `dist`
- Env var: `VITE_API_URL=https://<render-service>/api`

After deploying frontend, update Render `CORS_ORIGINS` to include the Vercel URL.

## Links

- GitHub: https://github.com/wuzimoo/diploma.git
- Vercel: https://frontend-41zkeu9x3-daniils-projects-5bff5a67.vercel.app
- Vercel alias: https://frontend-three-kappa-60.vercel.app
- Render: pending account/API access. Blueprint is ready in `render.yaml`; expected API URL after service creation is `https://romans-erp-api.onrender.com/api`.
