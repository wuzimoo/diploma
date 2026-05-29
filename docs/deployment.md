# Deployment

## Railway Backend

The backend target is Railway as the API service.

Railway backend settings:

- Source: `https://github.com/wuzimoo/diploma.git`
- Root: repository root with `railway.json`
- Runtime: Python 3.11
- Build command: `cd backend && pip install -r requirements.txt`
- Start command: `cd backend && alembic upgrade head && python -m app.db.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Healthcheck path: `/api/health`

Add PostgreSQL in the same Railway project. Use Railway's provided `DATABASE_URL`.

Required API variables:

```env
DATABASE_URL=<Railway PostgreSQL URL>
SECRET_KEY=<secure-random-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=https://frontend-pv2bfge8f-daniils-projects-5bff5a67.vercel.app,https://frontend-three-kappa-60.vercel.app,http://localhost:5173
ENVIRONMENT=production
```

The start command already runs migrations and idempotent demo seeding.

## Vercel Frontend

Deploy the `frontend` directory.

- Build command: `npm run build`
- Output directory: `dist`
- Env var: `VITE_API_URL=<Railway backend URL>/api`

Current Vercel deployment:

- https://frontend-pv2bfge8f-daniils-projects-5bff5a67.vercel.app
- Alias: https://frontend-three-kappa-60.vercel.app
