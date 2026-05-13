# Roman's ERP Backend

FastAPI REST API for construction company operations: users, roles, employees, construction objects, daily reports, report photos, material requests, expenses, analytics and calendar summary.

## Local Setup

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

## Demo Users

- `admin@romans-erp.demo` / `Admin12345`
- `foreman@romans-erp.demo` / `Foreman12345`
- `worker@romans-erp.demo` / `Worker12345`

