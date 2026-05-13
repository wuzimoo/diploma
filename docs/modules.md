# Modules

## Auth

Supports login, current user lookup and JWT access tokens. Roles are `admin`, `foreman` and `worker`.

## Users And Employees

Users are authentication records. Employees represent construction company staff and may be linked to users when the employee has system access.

## Construction Objects

Objects store construction sites in Berlin, Brandenburg and Potsdam with status, client, address, dates and budget.

## Daily Reports

Daily reports capture employee work per object: date, start/end time, break, calculated hours, status, description and photo metadata.

Statuses:

- `open` - відкрито
- `review` - на перевірці
- `approved` - погоджено
- `rejected` - відхилено

## Materials And Requests

Materials are catalog items. Material requests belong to construction objects and contain request items with quantities and estimated prices.

## Expenses

Expenses are object-level financial records for material, logistics and equipment costs.

## Analytics And Calendar

Dashboard analytics aggregate report statuses, total hours, active objects, active employees, expenses and hours by object. Calendar summary groups reports by date and status.

