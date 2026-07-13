
# ADR 0002: IndexedDB and repository layer
## Decision
Milestone 4.2 stores prototype records in IndexedDB through Dexie. Pages obtain data through repositories or services so the storage provider can later be replaced by JSON API repositories backed by MariaDB.
## Consequences
- Data survives refreshes and browser restarts.
- Data remains local to the browser profile and device.
- Reset and JSON export support testing.
- CRUD follows in Milestone 4.3.
