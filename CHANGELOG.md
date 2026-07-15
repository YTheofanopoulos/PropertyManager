
# Changelog

## [0.5.1.4] - 2026-07-14

### Changed
- Units now display an effective Rent value.
- A currently applicable lease supplies the authoritative Apartment Rent.
- Units without a lease applicable today display Market Rent.
- The unit editor labels the stored amount as Market Rent.
- The Units table identifies the displayed rent source.

### Business Rules
- Expired and Terminated leases do not determine current unit rent.
- Future leases do not replace today's rent before their start date.
- Editing Market Rent does not change an existing lease.
- Editing lease rent does not overwrite Market Rent.
- New leases continue to use Market Rent as the initial suggested apartment rent.

## [0.5.1.3] - 2026-07-14

### Added
- Void action for posted payments.
- Required reason, void timestamp, and retained voided-payment history.
- IndexedDB migration that marks existing payments as Posted.

### Changed
- Voiding a payment removes all of its allocations in the same transaction.
- Affected rent obligations and Rent Roll balances are recalculated immediately.
- Voided payments remain visible with a Voided status and no active allocated amount.
- Ledger calculations ignore voided payments and their allocations.

### Business Rules
- Voided payments cannot be voided again.
- A void reason is required.
- The original payment amount, received date, reference, and notes are retained.
- Rent becomes outstanding again when its supporting payment is voided.

## [0.5.1.2] - 2026-07-14

### Changed
- Payment entry launched from Rent Roll automatically allocates the entered amount to the selected rent period, up to that period's remaining balance.
- Users can still manually change the allocation after the default is applied.

### Fixed
- Rent Roll payments can no longer be silently saved with no allocation.
- Entering a payment from a unit's Rent Roll row now updates that unit's selected monthly obligation.

## [0.5.1.1] - 2026-07-14

### Changed
- Payment entry identifies accounts by unit and address rather than internal lease numbers.
- Lease selectors no longer include tenant names.
- Leaseholders are shown only as secondary reference information.
- Manual payments are recorded against the lease account, not an individual tenant.
- Back and Save return to the originating screen.
- Rent Roll preserves the selected period when entering and leaving payment entry.

### Fixed
- Removed the user-visible disconnect between Rent Roll units and internal lease identifiers.

## [0.5.1] - 2026-07-14

### Added
- Monthly rent obligations generated from recurring charges.
- Rent Roll showing current month, prior arrears, total outstanding, oldest unpaid period, and months behind.
- Manual payment entry and explicit allocation to rent periods.
- Partial payments, split payments, multi-month payments, and unapplied credit.
- IndexedDB tables for obligations, payments, and allocations.



All notable changes to PropertyManager are documented here.

## [Unreleased]

## [0.4.5] - 2026-07-14

### Added
- Searchable **Add Existing Tenant** modal in the lease create/edit form.
- Prominent leaseholder cards showing name, email, phone, and Primary/Secondary status.
- Change and Remove actions for each selected leaseholder.
- Ordered lease participants with IndexedDB schema version 3 migration.

### Changed
- Replaced the long embedded tenant checklist with a filtered modal workflow.
- The first leaseholder in the ordered list is always the primary tenant.
- Removing the primary automatically promotes the first secondary tenant.
- Newly created tenants are appended to the current lease as secondary unless they are the first leaseholder.

### Preserved
- Milestone 4.4 unit and tenant overlap validation, including status-transition behavior.


### Added
- Create a tenant directly from the lease editor using a Bootstrap modal.
- Automatically add the new tenant to the in-progress lease.
- Optionally make the new tenant the primary leaseholder.

### Changed
- Replaced the inline tenant-entry panel with a focused modal workflow.
- Lease validation now rejects overlapping date ranges for any selected leaseholder.
- Overlap validation now runs only when the unit, dates, term type, or leaseholder list changes.

### Fixed
- Status-only edits, including moving a lease to Expired or Terminated, are no longer blocked by overlap validation.
- Reactivating an Expired or Terminated lease now reruns unit and tenant overlap validation.
- Expired and Terminated leases no longer block active or future occupancy; only Active and Future leases reserve a unit or tenant timeframe.

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

## [0.5.2.1] - 2026-07-14

### Added
- JSON backup import from the Administration menu.
- Structural validation for every PropertyManager data collection.
- Transactional full-database replacement preserving exported record IDs and relationships.
- Explicit confirmation warning before current browser data is replaced.

### Changed
- JSON exports now include a backup format version.
- Failed validation or database writes roll back the entire import, leaving current data unchanged.
- Successful imports reload the application so every screen reflects the restored dataset.

### Business Rules
- JSON import replaces all portfolio, lease, financial, and bank-import data.
- Partial imports and merging are not supported.
- Users should export the current dataset before importing when rollback may be needed.

## [0.5.3.2] - 2026-07-15

### Fixed
- Assisted reconciliation no longer generates future rent obligations from a bank transaction's posted date.
- Candidate outstanding balances are calculated only through today's rent period.
- Future-dated test transactions retain their bank posting date without making future rent appear due.
- Zero-evidence candidates are classified as Manual Review instead of Ambiguous.

### Changed
- The reconciliation screen labels the bank date as Transaction Date.
- Candidate cards explicitly display Outstanding as of today.
- Ambiguous is reserved for multiple candidates with actual comparable evidence.
- Allocation suggestions include only obligations due through the current month.

### Accounting Rules
- The bank transaction date is preserved unchanged for accounting and audit purposes.
- The transaction date does not determine the current outstanding balance.
- Outstanding rent is based on unpaid obligations through today's month.

## [0.5.3.1] - 2026-07-14

### Added
- Deterministic reconciliation-history records.
- Explainable candidate scoring with visible point-by-point diagnostics.
- High Confidence, Suggested, Ambiguous, and Manual Review classifications.
- Hard safeguards preventing amount-only high-confidence matches.
- Tie and small-margin ambiguity detection.
- Three controlled monthly QFX fixtures for 383 Edouard-Charles.
- Expected-results CSV files and a repeatable test plan.

### Changed
- Corrected 383-1, 383-2, and 383-3 rents to $636, $1,045, and $1,081.
- Voiding an imported payment also removes its learning-history record.
- JSON backup/restore includes reconciliation history.

### Financial Integrity
- Suggestions never reconcile automatically.
- Vacant units and units without outstanding obligations are excluded.
- Amount equality alone is evidence, not proof.

## [0.5.2] - 2026-07-14

### Added
- Browser-based QFX/OFX SGML parser.
- Statement preview with account, date range, credits, new entries, and duplicates.
- Import batches and import history.
- FITID-based duplicate detection scoped to the bank account.
- Imported bank transaction queue with Unmatched, Reconciled, and Ignored states.
- Amount-based unit suggestions for reconciliation.
- Manual multi-period allocation during reconciliation.
- Atomic creation of Payment, Payment Allocations, and bank-transaction linkage.
- Synthetic QFX test statements covering exact, partial, overpaid, multi-month, unmatched, duplicate, and debit cases.

### Changed
- Voiding a bank-imported payment reopens its source bank transaction for reconciliation.
- Reset Sample Data clears bank import batches and bank transactions.
- JSON export includes financial and bank import records.

### Deferred
- CSV statement support.
- Description-based payer matching.
- Reconciliation undo without voiding the payment.
- Finalized accounting periods.

## [0.5.2-data.1] - 2026-07-14

### Fixed
- Corrected the Baseline 5.2 vacancies to 116 Clermont, 383-4 Edouard-Charles, and 387-1 Edouard-Charles.
- All other units now receive active leases for July 1, 2026 through June 30, 2027.
- Updated the normalized test-data reference file and documentation.

