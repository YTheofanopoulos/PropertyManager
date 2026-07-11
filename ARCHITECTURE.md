# Architecture

## Overview

The application follows a modular architecture designed to maximize reuse while minimizing duplicated code.

The objective is to allow new modules to be added with very little custom code.

---

# Application Layers

```
Browser

↓

Bootstrap 4

↓

Flask Routes

↓

Service Layer

↓

SQLAlchemy Models

↓

MariaDB
```

Routes should contain almost no business logic.

Services perform validation and processing.

Models persist data.

---

# Directory Structure

```
PropertyManager/

app/

    common/

    dashboard/

    properties/

    units/

    tenants/

    leases/

    accounting/

    maintenance/

    reports/

    models/

    templates/

    static/
```

Each feature is isolated inside its own package.

---

# Common Package

The common package contains reusable infrastructure.

Examples include:

* CRUD framework
* DataTable adapter
* Form helpers
* Response helpers
* Authorization adapter
* Utility functions

No business logic should exist here.

---

# Services

Each module contains a service layer.

Example:

```
TenantService

LeaseService

PaymentService

MaintenanceService
```

Services:

* Validate input
* Perform calculations
* Execute transactions
* Return domain objects

---

# Models

Models contain:

* Relationships
* Validation helpers
* Convenience properties

Models should avoid complex business rules.

---

# Generic CRUD Framework

Most maintenance screens share the same workflow.

Instead of duplicating code:

* List
* Add
* Edit
* Delete

the project provides a generic CRUD engine.

Each module supplies only:

* Model
* Form
* Columns
* Permissions

Everything else is inherited.

---

# DataTables

All grids use server-side processing.

Every table supports:

* Paging
* Sorting
* Searching
* State saving
* CSV export
* Responsive layout

The DataTable adapter converts requests into SQLAlchemy queries.

---

# Forms

Forms are generated from metadata whenever practical.

A field definition contains:

* Label
* Type
* Validation
* Width
* Searchable
* Sortable
* Required

The same metadata drives:

* Forms
* Tables
* Exports

---

# Transactions

Business operations execute inside database transactions.

Examples:

* Posting rent
* Applying payments
* Closing maintenance requests

A transaction either succeeds completely or rolls back.

---

# Logging

Application events are written to rotating log files.

Unexpected exceptions include stack traces.

Business events are recorded in the Activity Log.

---

# Error Handling

User-facing errors should be understandable.

Detailed technical information belongs in the application logs.

Never expose stack traces to users.

---

# Frontend

Bootstrap 4 provides layout.

DataTables provides interactive grids.

JavaScript is limited to:

* DataTables
* AJAX
* Small UI helpers

Business logic remains on the server.

---

# Security

Authentication is delegated to the existing environment.

The application obtains the current user through an adapter interface.

Modules never communicate directly with the authentication mechanism.

---

# Extensibility

New modules should require minimal infrastructure.

A typical module consists of:

* Model
* Service
* Routes
* Templates
* DataTable configuration

The shared framework provides the remaining functionality.

---

# Guiding Principle

The codebase should optimize for readability, consistency, and maintainability over cleverness.

Reducing duplicated code is a primary architectural goal, but clarity should never be sacrificed in pursuit of abstraction.
