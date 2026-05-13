# Deployment

## Render Backend

The repository includes `render.yaml` for a Render Blueprint.

Render service:

- Runtime: Python
- Root directory: `backend`
- Build command: `pip install -r requirements.txt && alembic upgrade head`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Required env vars:

- `DATABASE_URL`
- `SECRET_KEY`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `CORS_ORIGINS`
- `ENVIRONMENT`

After the service is created, run the seed command once from a Render shell or one-off job:

```bash
python -m app.db.seed
```

## Vercel Frontend

Deploy the `frontend` directory.

- Build command: `npm run build`
- Output directory: `dist`
- Env var: `VITE_API_URL=https://<render-service-url>/api`

After Vercel deploys, update Render `CORS_ORIGINS` with the final Vercel URL.

