# Database

PostgreSQL is the target database. Alembic migration `0001_initial_schema` creates the initial schema from SQLAlchemy metadata.

Migration `0002_crews_planner_object_details` extends the project with crews, object detail fields and work planning.

Migration `0003_report_flow_comments_payroll` adds two-step report approval metadata and report comments.

## Tables

- `roles`
- `users`
- `employees`
- `construction_objects`
- `object_assignments`
- `daily_reports`
- `report_comments`
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
- `daily_reports -> report_comments`
- `users -> report_comments`
- `material_requests -> material_request_items`
- `material_request_items -> materials`

## Report Approval Fields

`daily_reports` now also stores:

- `foreman_reviewed_by_user_id`
- `foreman_reviewed_at`
- `admin_reviewed_by_user_id`
- `admin_reviewed_at`

This allows the UI to show who checked the report and at which stage it currently is.

## Payroll

Payroll is calculated dynamically from `daily_reports` with final status `admin_approved`. No separate payroll table is required for the current MVP.

## Seed

Run:

```bash
cd backend
python -m app.db.seed
```

The seed inserts roles, demo users, employees, construction objects in Berlin/Brandenburg/Potsdam, assignments, daily reports, photo metadata, materials, material requests and expenses.
