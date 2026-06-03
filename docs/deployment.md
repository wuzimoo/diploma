# Deployment

## Render Backend

The backend is deployed to Render as the API service.

Render monorepo service settings:

- Source: `https://github.com/wuzimoo/diploma.git`
- Root Directory: `backend`
- Runtime: Python 3
- Region: Frankfurt
- Instance Type: Free
- Build command: `pip install -r requirements.txt`
- Start command: `alembic upgrade head && python -m app.db.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Healthcheck path: `/api/health`

Add PostgreSQL in the same Render workspace and region. Use the database's Internal Database URL for `DATABASE_URL`.

Required API variables:

```env
DATABASE_URL=<Render Internal Database URL>
SECRET_KEY=<secure-random-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=https://diploma-ochre.vercel.app,https://diploma-mu6e1osvh-daniils-projects-5bff5a67.vercel.app,http://localhost:5173
ENVIRONMENT=production
PYTHON_VERSION=3.11.9
```

Render Free does not execute `preDeployCommand`, so migrations and idempotent seed are intentionally part of the backend `startCommand`.

Current Render API URL:

```text
https://diploma-njc4.onrender.com/api
```

## Vercel Frontend

Deploy the `frontend` directory.

- Build command: `npm run build`
- Output directory: `dist`
- Env var: `VITE_API_URL=https://diploma-njc4.onrender.com/api`

Current Vercel deployment:

- https://diploma-mu6e1osvh-daniils-projects-5bff5a67.vercel.app
- Alias: https://diploma-ochre.vercel.app

## Deployment Notes For New Features

After deploying backend changes that affect the report workflow:

- run `alembic upgrade head`;
- rerun `python -m app.db.seed` to refresh demo comments and updated report statuses in a clean environment;
- ensure Vercel uses the same backend API URL after redeploy.

No additional third-party storage is required for comments or payroll export in the current MVP.
