# DEVELOPMENT.md

# Development Standards

This document defines the development standards for the Property Manager project.

These standards exist to maximize maintainability, readability, consistency, and long-term stability.

If a proposed implementation conflicts with this document, this document takes precedence unless explicitly revised.

---

# General Philosophy

The application is intended to remain maintainable for many years.

Favor:

* Readability
* Simplicity
* Consistency
* Explicit code
* Small reusable components

Avoid:

* Clever code
* Premature optimization
* Hidden side effects
* Duplicate business logic
* Large monolithic classes

---

# Python Version

Python 3.13 or newer.

---

# Code Formatting

Use:

* Black
* isort

Maximum line length:

88 characters.

---

# Naming Standards

## Variables

Use descriptive names.

Good:

```python
monthly_rent
tenant_balance
lease_end_date
```

Bad:

```python
mr
bal
x
```

---

## Classes

PascalCase

Example

```python
TenantService
Lease
PropertyCRUD
```

---

## Functions

snake_case

```python
generate_monthly_charges()

calculate_balance()

close_work_order()
```

---

## Constants

UPPER_CASE

```python
MAX_UPLOAD_SIZE

DEFAULT_PAGE_SIZE
```

---

# Directory Organization

Each module contains:

```text
module/

    routes.py

    services.py

    forms.py

    datatable.py

    templates/

    static/
```

Business logic belongs in services.

Routes remain small.

---

# Route Handlers

Routes should:

* Validate request
* Call service
* Return response

Routes should not:

* Perform calculations
* Execute business rules
* Construct SQL
* Update multiple tables

---

# Service Layer

Services contain business logic.

Examples

```text
LeaseService

PaymentService

MaintenanceService

ExpenseService
```

A service may call multiple repositories/models.

---

# Database Access

Use SQLAlchemy exclusively.

Never write inline SQL unless:

* Performance requires it
* The ORM cannot express the query clearly

Raw SQL should be isolated and documented.

---

# Transactions

Business operations execute inside transactions.

Examples:

* Generate monthly rent
* Record payment
* Close maintenance request

If any step fails:

Rollback the transaction.

---

# Models

Models should contain:

Relationships

Convenience properties

Small validation helpers

Models should not contain:

Large business rules

Application workflows

External API calls

---

# Forms

Forms use Flask-WTF.

Validation belongs in forms whenever possible.

Business validation belongs in services.

---

# Templates

Templates contain presentation only.

Avoid business logic inside Jinja.

Small conditionals are acceptable.

Complex calculations are not.

---

# JavaScript

JavaScript should remain minimal.

Preferred order:

1. HTML

2. Bootstrap

3. HTMX (future)

4. Small jQuery helpers

5. Custom JavaScript

Avoid SPA complexity.

---

# DataTables

Every table uses the shared wrapper.

Never instantiate DataTables directly.

Preferred:

```javascript
PM.table("#tenantTable")
```

Not:

```javascript
$("#tenantTable").DataTable(...)
```

---

# CSS

Bootstrap first.

Custom CSS second.

Avoid inline styles.

---

# Logging

Use Python logging.

Levels:

DEBUG

INFO

WARNING

ERROR

CRITICAL

Business events should also be written to the Activity Log table.

---

# Error Messages

Users should receive understandable messages.

Example

Good:

"The lease has already expired."

Bad:

"IntegrityError"

Technical details belong only in log files.

---

# Migrations

Every schema change requires:

Alembic migration

Migration review

Migration testing

Never edit production tables manually.

---

# Git Workflow

Primary branch:

main

Development branch:

develop

Feature branches:

feature/<feature-name>

Bug fixes:

bugfix/<issue>

Hot fixes:

hotfix/<issue>

---

# Commit Messages

Use present tense.

Examples

```
Add tenant CRUD

Implement payment service

Fix lease renewal calculation
```

Avoid

```
Stuff

Updates

Changes
```

---

# Documentation

Every module should include:

Purpose

Dependencies

Important assumptions

Public interfaces

Complex algorithms should include comments explaining *why*, not *what*.

---

# Configuration

No secrets are committed.

Use:

* Environment variables
* Configuration classes

---

# Testing

Business logic should be testable independently of Flask.

Service classes should not depend on HTTP requests.

---

# Performance

Optimize only after measuring.

Readability is preferred over micro-optimizations.

---

# Security

Authentication is provided by the hosting environment.

The application consumes identity information through an adapter.

Never hard-code authentication logic into business modules.

---

# UI Standards

All maintenance screens should follow a consistent layout:

1. Page title
2. Toolbar
3. Filters
4. DataTable
5. Pagination
6. Status bar

Buttons should appear in a consistent order:

* New
* Edit
* Delete
* Refresh
* Export

---

# Dashboard

Dashboard widgets should present actionable information.

Avoid decorative graphics.

Every widget should help answer an operational question.

---

# Reports

Reports should be generated from reusable service classes.

The same report should support:

* HTML
* CSV
* PDF (future)

without duplicating business logic.

---

# Guiding Principle

Every new module should look as though it was written by the same developer, following the same conventions, using the same architecture, and providing a consistent user experience.


