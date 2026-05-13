# Roman's ERP Frontend

React + Vite frontend for Roman's ERP. The UI is based on the provided `Romans ERP - SCREEN DEMO` screens and connects to the FastAPI backend via REST.

## Local Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Default URL: `http://localhost:5173`.

Set `VITE_API_URL` to the deployed backend API URL, for example:

```env
VITE_API_URL=https://diploma-njc4.onrender.com/api
```

## E2E Tests

```bash
npm run test:e2e
npm run test:e2e:report
```

The Playwright suite mocks REST API responses in the browser and checks the actual React UI flows for worker and admin screens.
