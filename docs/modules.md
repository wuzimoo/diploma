# Modules

## Auth

Supports login, current user lookup and JWT access tokens. Roles are `admin`, `foreman` and `worker`.

## Users And Employees

Users are authentication records. Employees represent construction company staff and may be linked to users when the employee has system access.

Admin can:

- create employee profiles with access email and temporary password;
- assign `worker`, `foreman` or `admin` role;
- disable or restore access;
- change passwords from the employee card.

## Construction Objects

Objects store construction sites in Berlin, Brandenburg and Potsdam with status, client, address, dates and budget.

## Daily Reports

Daily reports capture employee work per object: date, start/end time, break, calculated hours, status, description and photo metadata.

Statuses:

- `draft` - чернетка
- `submitted` - на перевірці у бригадира
- `foreman_approved` - погоджено бригадиром
- `admin_approved` - фінально погоджено
- `change_requested` - потрібні зміни
- `rejected` - відхилено

Only `admin_approved` reports are counted in payroll.

Reports also include:

- foreman review metadata;
- admin review metadata;
- comment thread between worker, foreman and admin.

## Materials And Requests

Materials are catalog items. Material requests belong to construction objects and contain request items with quantities and estimated prices.

## Expenses

Expenses are object-level financial records for material, logistics and equipment costs.

## Analytics And Calendar

Dashboard analytics aggregate report statuses, total hours, active objects, active employees, expenses and hours by object.

Calendar supports:

- month switching for worker and admin views;
- compact mobile indicators instead of overflowing text labels;
- daily status severity based on report approval stage.

## Payroll

Payroll is calculated dynamically from final reports without a separate storage table.

Features:

- monthly range;
- payroll range `21-20`;
- custom date range;
- employee totals by approved hours and hourly rate;
- CSV export.
