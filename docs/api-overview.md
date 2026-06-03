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
- `GET /calendar/detailed?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

## Report Workflow

- `POST /daily-reports`
- `PATCH /daily-reports/{id}`
- `GET /daily-reports/{id}`
- `PATCH /daily-reports/{id}/status`

Statuses:

- `draft`
- `submitted`
- `foreman_approved`
- `admin_approved`
- `change_requested`
- `rejected`

## Report Comments

- `GET /reports/{id}/comments`
- `POST /reports/{id}/comments`

## Payroll

- `GET /payroll/summary?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- `GET /payroll/export.csv?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`

## Auth Header

```http
Authorization: Bearer <token>
```
