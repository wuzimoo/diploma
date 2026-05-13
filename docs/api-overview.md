# API Overview

Base URL: `/api`

## Auth

- `POST /auth/login`
- `GET /auth/me`

## Core CRUD

- `/users`
- `/employees`
- `/objects`
- `/assignments`
- `/daily-reports`
- `/report-photos`
- `/materials`
- `/material-requests`
- `/material-request-items`
- `/expenses`

Most list endpoints support `skip`, `limit`, and relevant search/filter parameters. OpenAPI documentation is available at `/docs` when the backend is running.

## Status And Analytics

- `PATCH /daily-reports/{id}/status`
- `GET /dashboard/analytics`
- `GET /calendar/report-summary`

## Auth Header

```http
Authorization: Bearer <token>
```

