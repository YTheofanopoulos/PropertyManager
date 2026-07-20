# Baseline 6 Architecture

## Version boundaries

- Application: 6.0.0
- REST API: v1
- MariaDB schema: 1

These versions evolve independently. A later application release can retain API v1 while applying a new schema migration.

## Runtime structure

```text
Browser
  |
  | HTTPS / JSON
  v
Apache reverse proxy
  |
  v
Gunicorn + Flask API v1
  |
  v
Service layer
  |
  v
Repository layer
  |
  v
MariaDB / InnoDB
```

## Layer responsibilities

Routes parse HTTP input and format HTTP responses. They do not contain SQL or business rules.

Services implement business transactions and validation. They coordinate repositories and own commit/rollback boundaries.

Repositories contain SQL and map rows to domain data. They do not decide whether a business operation is allowed.

MariaDB is the future authoritative data store. InnoDB foreign keys, unique indexes, and transactions protect structural integrity.

## Baseline 6.0.0 boundary

6.0.0 establishes the server, schema, migration framework, system API, and 5.x importer. The 5.8 frontend remains included for regression comparison and continues using IndexedDB until the REST repository conversion milestone.

## Security principles

- The application never connects as MariaDB root.
- Runtime and migration users are separate.
- Database credentials stay outside source control.
- MariaDB remains bound to localhost when the backend is on the same host.
- Apache terminates HTTPS and proxies to Gunicorn on loopback.
- Every multi-table financial operation must execute in one transaction.
