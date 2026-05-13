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
- Pre-deploy command: `alembic upgrade head`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Healthcheck path: `/api/health`

Add PostgreSQL in the same Render workspace and region. Use the database's Internal Database URL for `DATABASE_URL`.

Required API variables:

```env
DATABASE_URL=<Render Internal Database URL>
SECRET_KEY=<secure-random-secret>
PYTHON_VERSION=3.11.9
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=https://frontend-pv2bfge8f-daniils-projects-5bff5a67.vercel.app,https://frontend-three-kappa-60.vercel.app,http://localhost:5173
ENVIRONMENT=production
```

Seed demo data once after the first successful migration:

```bash
python -m app.db.seed
```

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

- https://frontend-pv2bfge8f-daniils-projects-5bff5a67.vercel.app
- Alias: https://frontend-three-kappa-60.vercel.app
