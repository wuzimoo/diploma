# Deployment

## Railway Backend

The backend is deployed to Railway as the API service.

Railway monorepo service settings:

- Source: `https://github.com/wuzimoo/diploma.git`
- Root Directory: `/backend`
- Config file path: `/backend/railway.json`
- Builder: Railpack
- Build command: `pip install -r requirements.txt`
- Pre-deploy command: `alembic upgrade head`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Healthcheck path: `/api/health`

Add PostgreSQL in the same Railway project. Railway's PostgreSQL service exposes `DATABASE_URL`, which the FastAPI service uses directly.

Required API variables:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
SECRET_KEY=<secure-random-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=https://frontend-41zkeu9x3-daniils-projects-5bff5a67.vercel.app,https://frontend-three-kappa-60.vercel.app,http://localhost:5173
ENVIRONMENT=production
```

Seed demo data once after the first successful migration:

```bash
cd backend
railway run python -m app.db.seed
```

Public API URL after Railway domain generation:

```text
https://<railway-backend-domain>/api
```

## Vercel Frontend

Deploy the `frontend` directory.

- Build command: `npm run build`
- Output directory: `dist`
- Env var: `VITE_API_URL=https://<railway-backend-domain>/api`

Current Vercel deployment:

- https://frontend-41zkeu9x3-daniils-projects-5bff5a67.vercel.app
- Alias: https://frontend-three-kappa-60.vercel.app
