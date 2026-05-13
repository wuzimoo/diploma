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
VITE_API_URL=https://romans-erp-api.onrender.com/api
```
