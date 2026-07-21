# PropertyManager REST API v1

Base path:

```text
/api/v1
```

## Financial endpoints (Baseline 6.4.0)

- `GET /payments`
- `POST /payments`
- `POST /payments/{id}/void`
- `GET /credits`
- `POST /credits/{paymentId}/apply`
- `POST /rent-ledger/ensure`
- `GET /rent-ledger/leases/{leaseId}/outstanding`
- `GET /rent-ledger/rent-roll?period=YYYY-MM`
- `POST /rent-ledger/rent-status`

Payment, allocation, credit, and obligation mutations execute transactionally. Validation failures return 400, missing records return 404, and balance or state conflicts return 409.

## Reporting and bank endpoints (Baseline 6.5.0)

- `GET /financial/context?throughPeriod=YYYY-MM`
- `GET /bank/batches`
- `GET /bank/transactions`
- `GET /bank/transactions/{id}`
- `POST /bank/preview`
- `POST /bank/imports`
- `POST /bank/transactions/{id}/ignore`
- `POST /bank/transactions/{id}/reconcile`

The financial context provides one consistent MariaDB snapshot for Dashboard, Payment Receipts, and reconciliation scoring. Import and reconciliation writes are transactional and repeat duplicate checks at commit time.

## System endpoints

### GET `/api/v1`

Returns the API name and contract version.

### GET `/api/v1/system/health`

Checks Python and MariaDB connectivity and returns application, API, and schema version details.

### GET `/api/v1/system/info`

Currently equivalent to the health endpoint.

Locations, Buildings, Units, Tenants, and Leases are implemented as connected vertical slices. Other entity and workflow endpoints remain deferred so they can be migrated and tested independently.

## Tenants endpoints

`GET /api/v1/tenants` returns tenant list projections; `GET /api/v1/tenants/{id}` returns one tenant. `POST`, `PUT`, and `DELETE` maintain tenants. Duplicate email addresses and deletion of leaseholders return `409`.

## Leases endpoints

`GET /api/v1/leases` returns the lease list projection. `GET /api/v1/leases/{id}` returns one lease. Related editor collections are available at `/participants`, `/charges`, and `/concessions`. `POST /api/v1/leases` creates a complete lease; `PUT /api/v1/leases/{id}` updates it transactionally; `POST /api/v1/leases/{id}/terminate` terminates it and refreshes occupancy.

`GET /api/v1/leases/{id}/renewal-draft` returns an editable successor draft for an accepted renewal. It carries forward the unit, participants and roles, recurring charges, shifted concessions, and notes; uses the proposed renewal rent when present; and suggests the next contiguous term. `POST /api/v1/leases/{id}/renewal` validates and creates the linked successor transactionally. `GET /api/v1/leases/{id}/history` returns the unit's chronological lease history.

Lease write failures return `400` for invalid input, `404` for missing records, and `409` for overlaps or financial conflicts. A failed multi-table operation is rolled back.

## Locations endpoints

`GET /api/v1/locations` returns locations with `buildingCount` and `unitCount`. `GET /api/v1/locations/{id}` returns one location. `POST`, `PUT`, and `DELETE` maintain locations. Duplicate names and deletion of locations that still contain buildings return `409`.

## Buildings endpoints

`GET /api/v1/buildings` returns buildings with their location name and unit count. `GET /api/v1/buildings/{id}` returns one building. `POST`, `PUT`, and `DELETE` maintain buildings. Duplicate civic addresses within a location and deletion of buildings that still contain units return `409`.

## Units endpoints

### GET `/api/v1/units`

Returns all units from MariaDB with the building/location labels and the effective rent used by the existing Units table. Effective rent comes from the current apartment-rent charge when one applies; otherwise it is the unit's market rent.

### GET `/api/v1/units/{id}`

Returns one unit or `404` when it does not exist.

### POST `/api/v1/units`

Creates a unit. The existing Units editor sends camel-case JSON fields. Returns the new unit with status `201`.

### PUT `/api/v1/units/{id}`

Replaces the editable values for a unit. Duplicate apartment numbers in one building return `409`.

### DELETE `/api/v1/units/{id}`

Deletes a unit with no lease history and returns `204`. Units referenced by leases return `409`.

Errors use a stable JSON shape:

```json
{"error": "A user-readable explanation."}
```
