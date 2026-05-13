# Architecture

Roman's ERP is a pragmatic monorepo MVP with a single FastAPI backend, one PostgreSQL database and one React frontend.

## Backend

The backend exposes a REST API under `/api`. It uses SQLAlchemy ORM models, Pydantic schemas for validation and serialization, JWT authentication and role-based guards for admin/foreman actions.

Important layers:

- `app/main.py` configures FastAPI, CORS and routers.
- `app/core` stores settings and security helpers.
- `app/db` owns database session setup and demo seed data.
- `app/models` contains SQLAlchemy entities.
- `app/schemas` contains Pydantic contracts.
- `app/api` contains auth dependencies and route handlers.
- `app/services` contains reusable CRUD helpers.

## Frontend

The frontend uses React Router with two role-oriented areas:

- `/worker` for mobile/adaptive employee workflows.
- `/admin` for foreman/company manager workflows.

JWT is stored in localStorage for MVP simplicity. Axios attaches the bearer token to API requests.

## Deployment

Render hosts the API and PostgreSQL. Vercel hosts the static React build. CORS is controlled by backend `CORS_ORIGINS`.

