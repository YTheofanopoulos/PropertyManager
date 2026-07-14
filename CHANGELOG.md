
# Changelog

All notable changes to PropertyManager are documented here.

## [Unreleased]

### Added
- Create a tenant directly from the lease editor using a Bootstrap modal.
- Automatically add the new tenant to the in-progress lease.
- Optionally make the new tenant the primary leaseholder.

### Changed
- Replaced the inline tenant-entry panel with a focused modal workflow.
- Lease validation now rejects overlapping date ranges for any selected leaseholder.

### Added
- Tenant overlap validation across primary and additional leaseholders.
- Support for the same tenant on multiple leases when the lease dates do not overlap.

### Planned
- Payment ledger and bank-statement workflows.
- Bulk portfolio onboarding in Milestone 6.x.
- Maintenance deferred to Milestone 7.x or later.
- Future integration with the existing MongoDB expense application.

## [0.4.4] - 2026-07-13

### Added
- Dedicated create/edit lease page.
- Fixed and month-to-month lease terms.
- Multiple leaseholders with exactly one primary participant.
- Creation of a new tenant during lease setup.
- Recurring charge foundation for apartment rent, parking, storage, and other charges.
- Lease overlap validation.
- Lease termination that preserves history.
- Review summary with unit, term, participant count, and monthly total.
- IndexedDB schema version 2 and migration support.

### Changed
- Existing lease units are locked after creation.
- Unit occupancy is refreshed from lease activity when leases are saved or terminated.
- Lease table now shows term type and total monthly recurring charges.
- JSON export now includes recurring charges.

### Deferred
- Lease renewals.
- Lease documents and signatures.
- Lease event timeline.
- Payment allocation and balances.

## [0.4.3] - 2026-07-13

### Added
- CRUD workflows for Locations, Buildings, Units, and Tenants.
- Bootstrap modal editors and toast notifications.
- Relationship-aware deletion checks.
- Immediate DataTable refresh after saving.

### Changed
- Locations and Buildings became functional pages.
- Units and Tenants became editable and persistent.

## [0.4.2] - 2026-07-13

### Added
- Dexie and IndexedDB.
- Typed domain models with stable IDs.
- Repository and service layers.
- Deterministic portfolio seeding.
- JSON export and reset-to-sample-data tools.

### Changed
- Dashboard, Units, Tenants, and Leases began reading from IndexedDB.

## [0.4.1] - 2026-07-13

### Added
- Bootstrap 5.
- TypeScript and Vite.
- DataTables 2.
- Client-side routing and responsive application shell.
- Complete application navigation with placeholders for future features.
