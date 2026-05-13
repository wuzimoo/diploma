# Database

PostgreSQL is the target database. Alembic migration `0001_initial_schema` creates the initial schema from SQLAlchemy metadata.

## Tables

- `roles`
- `users`
- `employees`
- `construction_objects`
- `object_assignments`
- `daily_reports`
- `report_photos`
- `materials`
- `material_requests`
- `material_request_items`
- `expenses`

## Main Relations

- `roles -> users`
- `users -> employees`
- `construction_objects -> object_assignments`
- `construction_objects -> daily_reports`
- `construction_objects -> material_requests`
- `construction_objects -> expenses`
- `daily_reports -> report_photos`
- `material_requests -> material_request_items`
- `material_request_items -> materials`

## Seed

Run:

```bash
cd backend
python -m app.db.seed
```

The seed inserts roles, demo users, employees, construction objects in Berlin/Brandenburg/Potsdam, assignments, daily reports, photo metadata, materials, material requests and expenses.

