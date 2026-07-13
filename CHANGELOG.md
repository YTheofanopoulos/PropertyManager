
# Changelog

## [0.4.3] - 2026-07-13

### Added
- Add, edit, and delete workflows for Locations.
- Add, edit, and delete workflows for Buildings.
- Add, edit, and delete workflows for Units.
- Add, edit, deactivate, and delete workflows for Tenants.
- Bootstrap modal editors and toast notifications.
- Service-layer validation and relationship-aware deletion checks.
- Immediate DataTable refresh after successful saves.

### Changed
- Locations and Buildings are now functional instead of placeholders.
- Units and Tenants are now editable.
- All changes persist in IndexedDB across browser reloads.

### Deferred
- Lease creation and editing remains read-only until the multi-participant workflow is designed.

### Notes
- Full package.
- `package-lock.json` is intentionally omitted. Generate it on the standard VM.
