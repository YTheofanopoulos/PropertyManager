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

Entity and workflow endpoints are intentionally deferred to the frontend-integration milestone so their contracts can be implemented and tested as complete vertical slices.
