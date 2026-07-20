# PropertyManager REST API v1

Base path:

```text
/api/v1
```

## System endpoints

### GET `/api/v1`

Returns the API name and contract version.

### GET `/api/v1/system/health`

Checks Python and MariaDB connectivity and returns application, API, and schema version details.

### GET `/api/v1/system/info`

Currently equivalent to the health endpoint.

Locations, Buildings, and Units are implemented as connected vertical slices. Other entity and workflow endpoints remain deferred so they can be migrated and tested independently.

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
