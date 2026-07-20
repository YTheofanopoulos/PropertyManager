# Baseline 6 Architecture

## Version boundaries

- Application: 6.4.0
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

## Baseline 6.1.0 vertical slice

Units are the first complete REST-backed domain. The Units page selects `ApiUnitRepository`, which calls API v1. Flask routes delegate validation and operations to `UnitService`; SQL and row projections remain in `UnitRepository`; MariaDB is authoritative for Units.

All other domain repositories remain unchanged and continue using IndexedDB. This deliberate mixed mode lets each domain be migrated and verified independently. Frontend repository selection is centralized in `repositoryConfiguration.ts` so the boundary is visible and testable.

## Baseline 6.2.0 vertical slice

Locations and Buildings join Units as REST-backed domains. Their API list projections calculate relationship counts in MariaDB, and referential deletion checks execute transactionally in the backend. The Units editor now obtains its location/building choices from these API repositories so the connected screens share one authoritative data source.

All remaining domains continue using IndexedDB.

## Baseline 6.3.0 vertical slice

Tenants and Leases use API v1 and MariaDB. Lease saves are transactional across leases, participants, recurring charges, concessions, rent obligations, allocations validation, and unit occupancy. The existing editor contract is preserved.

Payments, credits, rent-ledger generation, bank import, reconciliation, dashboard calculations, and reports still use IndexedDB. They must be migrated before newly created MariaDB leases can participate in those screens.

## Baseline 6.4.0 financial vertical slice

Payments, allocations, credits, rent-obligation generation, Rent Roll, and Rent Status now use API v1 and MariaDB transactions. Bank Import, Reconciliation, Dashboard calculations, Payment Receipt reports, and other reports remain IndexedDB-backed.

## Security principles

- The application never connects as MariaDB root.
- Runtime and migration users are separate.
- Database credentials stay outside source control.
- MariaDB remains bound to localhost when the backend is on the same host.
- Apache terminates HTTPS and proxies to Gunicorn on loopback.
- Every multi-table financial operation must execute in one transaction.
