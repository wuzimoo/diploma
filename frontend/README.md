# BauPilot Frontend

React- und Vite-Frontend fuer die BauPilot-Demo. Die Anwendung verbindet sich mit dem FastAPI-Backend ueber REST und bildet Mitarbeiter-, Polier- und Admin-Flows ab.

## Lokales Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Standard-URL: `http://localhost:5173`

Beispiel fuer die API-Konfiguration:

```env
VITE_API_URL=http://localhost:8000/api
```

## E2E-Tests

```bash
npm run test:e2e
npm run test:e2e:report
```

Die Playwright-Suite mockt die API im Browser und prueft die relevanten Demo-Flows der React-Oberflaeche.
