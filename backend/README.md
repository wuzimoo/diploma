# BauPilot Backend

FastAPI-Backend fuer die BauPilot-Demo: Benutzer, Rollen, Mitarbeiter, Projekte, Tagesberichte, Medien, Materialanfragen, Kosten, Kalender und Lohnabrechnung.

## Lokales Setup

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

## Render

Das Projekt nutzt `render.yaml` im Repo-Root. Render startet den Service mit:

```bash
pip install -r requirements.txt
alembic upgrade head && python -m app.db.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Demo-Zugaenge

- `admin@baupilot.demo` / `Admin12345`
- `foreman@baupilot.demo` / `Foreman12345`
- `worker@baupilot.demo` / `Worker12345`
