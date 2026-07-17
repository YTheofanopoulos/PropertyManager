# Changelog

All notable changes to PropertyManager are documented in this file.

The format follows a release-oriented history. Baselines describe cohesive
product capabilities, while patch releases document incremental corrections
and usability improvements.

## [0.5.6.1] - 2026-07-17

### Fixed
- Cancel and the top-right close button now dismiss the reconciliation modal.
- Escape closes the modal while it is idle.
- Modal dismissal is blocked while reconciliation or ignore submission is active.
- Modal event handlers, temporary content, button state, body state, and orphaned backdrops are cleaned up after closing.
- Reopening reconciliation starts from a clean modal state.

### Changed
- Displayed version updated to 0.5.6.1 / Baseline 5.6.1.

## [0.5.6.0] - 2026-07-17

### Added
- In-queue reconciliation modal on the Bank Import page.
- Allocation card directly beneath the Bank Transaction card.
- Suggested units alongside the transaction and allocation workflow.
- In-modal progress indicators, control locking, and success toast.

### Changed
- Reconcile no longer navigates away from Bank Import.
- Completing or ignoring a transaction refreshes the active queue in place.
- DataTables state preserves search, sorting, page, and page length.
- Displayed version updated to 0.5.6.0 / Baseline 5.6.0.

## [0.5.5.9] - 2026-07-17

### Changed
- Successful reconciliation now returns to Import Bank Statement with the
  Needs Attention filter active.
- Ignoring a transaction now returns to the same Needs Attention queue.
- Removed automatic navigation into the next reconciliation detail screen.

### Result
- The user returns to the bank statement workflow after each action and can
  select the next transaction deliberately.
- Reconciled or ignored transactions no longer appear in Needs Attention.

### Changed
- Displayed application version updated to 0.5.5.9 / Baseline 5.5.9.

## [0.5.5.8] - 2026-07-17

### Fixed
- Busy overlay is dismissed before navigation after reconcile or ignore.
- Every route transition performs a safety reset of the busy overlay.
- `forceHide()` now clears the overlay directly and cannot be blocked by depth tracking.

### Changed
- Displayed version updated to 0.5.5.8 / Baseline 5.5.8.

## [0.5.5.7] - 2026-07-17

### Changed
- Confirm Reconciliation and Ignore Transaction actions now appear directly
  below the Bank Transaction details.
- The Bank Transaction card remains visible while scrolling on larger screens.
- Successful reconciliation or ignore operations advance to the next
  transaction needing attention.

### Added
- Reusable application busy overlay with spinner and status text.
- Immediate visual feedback while reconciliation and ignore operations run.
- Submission locking to prevent duplicate reconciliation requests.
- Inline validation and error messages on the reconciliation page.

### Rules
- All reconciliation controls are disabled while a write is in progress.
- The next transaction is selected from positive, unreconciled,
  non-ignored, non-duplicate bank transactions.
- When no work remains, the user returns to the Needs Attention queue.

### Changed
- Displayed application version updated to 0.5.5.7 / Baseline 5.5.7.

## [0.5.5.6] - 2026-07-17

### Added
- Redesigned main dashboard with live KPI cards, rent-status chart, recent
  payments, upcoming lease expirations, and an Application Date sidebar card.
- Current-period collection and outstanding-balance summaries.

### Changed
- Monthly Rent Collected now uses actual posted Payment.receivedDate values.
- All dashboard calculations use the centralized Application Clock.
- Voided payments are excluded.
- Displayed version updated to 0.5.5.6 / Baseline 5.5.6.

## [0.5.5.5] - 2026-07-17

### Changed
- Reconciliation suggestions now use ranking tiers rather than score alone.
- Exact outstanding-balance matches always rank ahead of non-exact candidates.
- Exact matches receive +100 and same target-period matches receive +40.
- Non-exact candidates receive a dollar-for-dollar amount-difference penalty.
- Supporting signals include building, unit, tenant, prior amount, memo/name,
  posting-day, and general reconciliation history.
- Candidate explanations now show every score contribution and the final score.
- Candidate labels are now Strong Candidate, Good Candidate, Possible Match,
  Ambiguous, and Manual Review.

### Rules
- Amount alone never performs automatic reconciliation.
- Multiple comparable exact matches remain Ambiguous and require user choice.
- A late-month payment (day 25 or later) targets the following rent period.

### Fixed
- Historical memo/name evidence can no longer rank a non-exact amount above an
  exact outstanding rent balance.

### Changed
- Displayed application version updated to 0.5.5.5 / Baseline 5.5.5.

## [0.5.5.4] - 2026-07-16

### Fixed
- Main landing dashboard now uses the centralized Application Clock.
- Occupancy and active lease counts are evaluated as of the simulated date.
- Monthly contractual rent is calculated from recurring charges active on the
  simulated date rather than from static unit status.
- The six-month rent-collected chart ends at the simulated current month and
  uses stored Payment.receivedDate values.
- Dashboard headings now display the effective application date and period.

### Rules
- This fix applies to the main application dashboard.
- Stored payment dates, QFX dates, lease dates, and audit timestamps are not
  modified.

### Changed
- Displayed application version updated to 0.5.5.4 / Baseline 5.5.4.

## [0.5.5.3] - 2026-07-15

### Added
- Centralized Application Clock for business-date calculations.
- Settings controls for system date or a persistent simulated date.
- Persistent Historical Test Mode banner with a one-click return to system time.
- Historical testing support for outstanding rent, obligation generation,
  Rent Status, Rent Roll, reconciliation candidates, lease occupancy, and
  default report ranges.

### Sample Data
- All occupied sample leases now run from 2025-07-01 through 2026-06-30.
- Existing sample tenant names, participant relationships, unit assignments,
  vacancy assignments, and rent amounts are preserved.
- Reset Sample Data restores the historical 2025–2026 lease set.

### Rules
- The simulated clock changes only PropertyManager's concept of today.
- QFX dates, payment transaction dates, lease dates, imported records, and
  audit timestamps are never rewritten.
- Payment Receipts continues grouping by stored transaction date.

### Changed
- Displayed application version updated to 0.5.5.3 / Baseline 5.5.3.

## [0.5.5.2] - 2026-07-15

### Added
- Location filter for the Payment Receipts report.
- Location-aware building filter.
- Output option for one combined report or separate reports by location.
- Separate location reports include their own apartment matrix, monthly summary,
  totals, transaction counts, and voided-payment disclosure.
- Printing separate reports starts each location on a new page.

### Changed
- Payment Receipts report scope now follows the explicit
  Location → Building → Unit hierarchy.
- Building choices are limited to the selected location.
- Transaction-date accounting rules remain unchanged.
- Displayed application version updated to 0.5.5.2 / Baseline 5.5.2.

## [0.5.5.1] - 2026-07-15

### Added
- Payment Receipts report for accounting reconciliation.
- Apartment-by-month matrix covering a user-selected range of transaction months.
- Start month, end month, and building filters.
- Monthly totals for bank-imported payments, manual payments, transaction counts,
  and total receipts.
- Range grand total.
- Drill-down from any non-zero unit/month amount to the underlying transactions.
- Print-friendly report layout.

### Accounting Rules
- Payments are grouped by their actual transaction date.
- Imported payments use the QFX bank-posted date preserved on the payment.
- Manual payments use the entered received date.
- Rent-period allocations do not determine the accounting month.
- A July 30 payment allocated to August rent is reported in July.
- Voided payments are excluded from receipt totals and disclosed separately.

---

## [0.5.4.4] - 2026-07-15

### Fixed
- The dynamically generated Close button in the Rent Status monthly-detail
  dialog now reliably closes the modal.
- Monthly-detail modal closing uses one delegated handler for both the header X
  and footer Close button.
- Bootstrap and fallback modal paths use the same explicit close behavior.

---

## [0.5.4.3] - 2026-07-15

### Fixed
- Restored monthly Rent Status bubble clicks after the revised dashboard layout.
- Consolidated Unit and monthly-status clicks into one delegated table handler.
- Monthly bubbles open rent-period details.
- Unit labels open occupant details.
- Click behavior remains functional after paging, searching, and sorting.
- Close and X controls explicitly dismiss both Rent Status dialogs.

### Added
- Unit occupant popup now shows tenant email addresses and phone numbers.
- Primary and additional tenant roles are identified.
- Email and phone values are directly actionable.
- Missing contact information is identified in place.

---

## [0.5.4.2] - 2026-07-15

### Changed
- Unit labels use a single-line operational format such as
  `383-1 Edouard Charles`.
- Removed the Tenant column from the Rent Status matrix.
- Unit labels remain black and are clickable for occupant details.
- Restored the compact status legend with colors applied only to its dots.
- Removed late-payment row tinting.
- Removed redundant months-behind text from the table.
- Positive outstanding balances display in red.
- Future month headers display `Future`.
- Current-month collection percentages are identified as through today.

### Added
- Read-only unit occupant dialog.
- Sticky Rent Status table headers.

---

## [0.5.4.1] - 2026-07-15

### Changed
- Rent Status became a read-only management dashboard.
- Removed payment-entry actions and the Action column from Rent Status.
- Replaced progress-ring indicators with solid status bubbles matching the
  dashboard legend.
- Added pagination with 10 rows by default and options for 10, 25, and 50.
- Added live filtering by apartment, address, and tenant.
- Centered status indicators and right-aligned outstanding balances.
- Monthly details remain available through a read-only dialog.

---

## [0.5.4.0] - 2026-07-15

### Added
- Rent Status command center under Reports.
- Rolling four-month default window showing two prior months, the current month,
  and one future month.
- Adjustable 4, 6, 9, and 12 month windows.
- Earlier, Later, and Today navigation.
- Paid, Partial, Unpaid, Paid Ahead, Partial Prepayment, Not Yet Due, and
  No Lease/Vacant states.
- Monthly portfolio collection percentages.
- Current-month expected, collected, outstanding, and collection-rate summaries.
- Clickable monthly details showing expected rent, allocated payments, and
  remaining balances.

### Accounting Rules
- Outstanding Today includes only obligations due through the current month.
- A visible future month supports early payments but does not create arrears.
- Payment transaction dates remain unchanged.
- Rent Status is operational and rent-period based, not an accounting-date report.

---

## [0.5.3.5] - 2026-07-15

### Changed
- Import History defaults to five rows.
- Import History page-size options are 5, 10, 25, and 50.
- Reordered Import History columns to prioritize Statement, Status, and Remaining.
- Added Imported, In Progress, and Complete batch lifecycle statuses.
- Reorganized ROADMAP.md into Completed, In Progress, and Planned sections.

---

## [0.5.3.4] - 2026-07-15

### Fixed
- Bank Import filters no longer route to Dashboard.
- Confirm Reconciliation returns to the Needs Attention queue.
- Router now separates route paths from hash query parameters.
- Active navigation correctly recognizes filtered Bank Import routes.

### Added
- Persistent application version display.
- About PropertyManager dialog showing application version, baseline, database
  schema, sample-data version, and build date.

---

## [0.5.3.3] - 2026-07-15

### Added
- Queue-focused Import Bank Statement workflow.
- Needs Attention default view.
- Suggested, Ambiguous, Manual Review, Ignored, Reconciled, and All filters.
- Queue summary counts.
- Import-batch progress and completion status.
- Reconciliation success feedback.

### Changed
- Reconciled transactions are hidden from the default working queue.
- Payments is the primary location for completed reconciliations.
- Voiding an imported payment reopens the source transaction and returns it to
  Needs Attention.

---

## [0.5.3.2] - 2026-07-15

### Fixed
- Assisted reconciliation no longer generates future rent obligations from the
  bank transaction date.
- Candidate outstanding balances are calculated only through today's rent period.
- Future-dated test transactions retain their accounting date without creating
  future arrears.
- Zero-evidence candidates are classified as Manual Review instead of Ambiguous.

### Accounting Rules
- Bank transaction dates are preserved unchanged for accounting and audit.
- Transaction dates do not determine current rent outstanding.
- Outstanding rent is based on unpaid obligations through today's month.
- Ambiguous is reserved for candidates with actual competing evidence.

---

## [0.5.3.1] - 2026-07-15

### Added
- Deterministic assisted-reconciliation scoring.
- Explainable score reasons for each candidate.
- Reconciliation-history matching.
- Suggested, Ambiguous, Manual Review, and High Confidence classifications.
- Controlled three-month QFX fixture set targeting 383 Edouard Charles.
- Split-payment fixture for unit 383-3.
- Companion expected-result files and test plan.

### Rules
- Amount alone cannot produce High Confidence.
- Identical or closely competing candidates remain Ambiguous.
- Reconciliation is always confirmed by the user.
- Vacant units are excluded from legitimate rent candidates.

---

## [0.5.2.0] - 2026-07-15

### Added
- Realistic sample leases running from July 2026 through June 2027.
- Multiple-tenant lease samples.
- Corrected vacancy data for the controlled portfolio.
- QFX/OFX bank-statement parsing and preview.
- FITID-based duplicate detection.
- Manual bank-transaction reconciliation.
- Multi-period and partial-payment allocation.
- JSON data import that replaces the current IndexedDB dataset.
- Existing JSON export retained.

### Changed
- QFX established as the preferred bank-import format.
- CSV import deferred because it omits accounting metadata needed for reliable
  reconciliation.

### Data Consistency
- Controlled Edouard Charles rents:
  - 383-1: $636.00
  - 383-2: $1,045.00
  - 383-3: $1,081.00
  - 383-4: vacant

---

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

## [0.5.5.1] - 2026-07-15

### Added
- Payment Receipts by Transaction Month report for accounting and bank-statement reconciliation.
- Apartment-by-month matrix based on the payment transaction/received date.
- Month-range and building filters.
- Monthly totals and range grand total.
- Monthly accounting summary separating bank-imported and manually entered payments.
- Transaction drill-down showing date, source, method, reference, notes, and amount.
- Print-friendly report layout.
- Voided payments are excluded from receipt totals and identified separately.

### Accounting Rules
- Report columns use `Payment.receivedDate`, which preserves the QFX posted date for imported payments.
- Rent-period allocations do not determine the report month.
- A payment received early for the next rent period remains in the month in which the bank processed it.
- Full payment amounts are reported by apartment, including any temporarily unapplied portion.

### Changed
- Reports navigation now opens Payment Receipts.
- Baseline 5.4 Rent Status is marked complete in ROADMAP.md.
- Displayed version updated to 0.5.5.1 / Baseline 5.5.1.

## [0.5.4.4] - 2026-07-15

### Fixed
- The dynamically generated Close button in the Rent Status monthly-detail dialog now reliably closes the modal.
- The monthly-detail modal now uses one delegated close handler on the modal container.
- Both the header X and footer Close button use the same explicit modal-hide path.
- The fallback modal path also removes modal state and backdrops correctly.

### Changed
- Displayed application version updated to 0.5.4.4 / Baseline 5.4.4.

## [0.5.4.3] - 2026-07-15

### Fixed
- Restored monthly Rent Status bubble clicks after the revised 5.4.2 layout.
- Consolidated Unit and monthly-status clicks into one delegated table handler.
- Monthly bubbles open only rent-period details.
- Unit labels open only occupant details.
- Clicks remain functional after DataTables paging, searching, and sorting.
- Close and X buttons explicitly dismiss both Rent Status dialogs.

### Added
- Unit occupant popup now shows tenant email addresses and phone numbers.
- Tenant roles are identified as Primary Tenant or Additional Tenant.
- Email and phone values are directly actionable through mail and telephone links.
- Missing contact information is identified in the popup without requiring navigation.

### Changed
- Displayed application version updated to 0.5.4.3 / Baseline 5.4.3.

## [0.5.4.2] - 2026-07-15

### Changed
- Rent Status Unit labels now use the single-line format `383-1 Edouard Charles`.
- Removed the Tenant(s) column from the Rent Status dashboard.
- Unit labels remain black and become clickable for occupant details.
- Restored the compact legend with color applied only to the small dots.
- Removed row background highlighting and redundant months-behind text.
- Positive outstanding balances display in red.
- Future month headers display Future; current-month values identify collection through today.

### Added
- Read-only unit occupant dialog launched from the Unit label.
- Occupant dialog displays primary and additional tenant names.
- Sticky Rent Status table headers.

### Fixed
- Both Close and X buttons reliably dismiss Rent Status dialogs.
- Status indicators reliably open read-only monthly details.
- Tooltips no longer promise an action.

## [0.5.4.1] - 2026-07-15

### Changed
- Rent Status is now a read-only dashboard; payment-entry actions and the Action column were removed.
- Rent-status cells now use solid colored bubbles matching the legend.
- Collection percentages and allocation detail remain available in the read-only monthly dialog.
- Rent Status now uses DataTables with a default of 10 rows and options for 10, 25, and 50.
- Added live filtering across unit addresses and tenant names.
- Outstanding currency is right-aligned and monthly indicators are centered.
- Rows with outstanding rent receive a subtle warning tint; vacant rows receive a neutral tint.
- Displayed application version updated to 0.5.4.1 / Baseline 5.4.1.

### Usability
- Indicator tooltips summarize status, expected rent, collected rent, and remaining balance.
- Pagination and search remain available for larger portfolios.

## [0.5.4.0] - 2026-07-15

### Added
- Rent Status command center under Reports.
- Rolling four-month default view showing two prior months, the current month, and one future month.
- Adjustable 4, 6, 9, and 12 month windows with Earlier, Later, and Today navigation.
- Compact visual rent indicators for Paid, Partial, Unpaid, Paid Ahead, Not Yet Due, and No Lease/Vacant.
- Monthly portfolio collection-rate headers.
- Current-month expected, collected, outstanding, and collection-rate summary cards.
- Clickable monthly status details showing expected rent, allocated payments, and remaining balance.
- Direct Record Payment action from a monthly status detail.

### Accounting Rules
- Outstanding Today includes only obligations due through the current month.
- The future month is visible for prepayments but is never treated as overdue.
- Payment transaction dates remain unchanged.
- Future rent is created for display/allocation only when it falls within the selected Rent Status window.

### Changed
- Baseline 5.3 is marked complete in ROADMAP.md.
- Displayed application version updated to 0.5.4.0 / Baseline 5.4.0.

## [0.5.3.5] - 2026-07-15

### Changed
- Import History now displays five rows by default.
- Import History page-size options are 5, 10, 25, and 50.
- Import History columns are ordered for faster scanning: Imported Date, Statement, Status, Remaining, Reconciled, Ignored, Period, Account, and Transactions.
- Import batches with no processed transactions display Imported; partially processed batches display In Progress; completed batches display Complete.
- Displayed application version updated to 0.5.3.5 / Baseline 5.3.5.

### Documentation
- ROADMAP.md now explicitly marks Baseline 5.2 as complete.
- Added release-oriented Completed, In Progress, and Planned roadmap sections.

## [0.5.3.4] - 2026-07-15

### Fixed
- Reconciliation queue filters now remain on Import Bank Statement instead of falling through to Dashboard.
- Confirm Reconciliation now returns to the Needs Attention queue after saving.
- Active navigation correctly recognizes bank-import routes that include query parameters.
- The router now separates the route path from its query string before matching pages.

### Added
- Persistent application version button in the sidebar.
- About PropertyManager dialog showing application version, baseline, database schema, sample-data version, and build date.
- Top bar now displays both the product name and running baseline/schema information.

### Changed
- Displayed application version updated to 0.5.3.4 / Baseline 5.3.4.

## [0.5.3.3] - 2026-07-15

### Added
- Queue-focused Import Bank Statement page.
- Default Needs Attention filter.
- Suggested, Ambiguous, Manual Review, Ignored, Reconciled, and All filters.
- Summary counts for outstanding reconciliation work.
- Batch progress showing imported, reconciled, ignored, remaining, and completion status.
- Success feedback after reconciliation.

### Changed
- Reconciled transactions are hidden from the default queue and remain accessible through the Reconciled and All filters.
- Queue ordering prioritizes Suggested, Ambiguous, Manual Review, and then oldest transactions.
- Import batches display Complete when no actionable transactions remain.
- Voiding an imported payment returns its source transaction to Needs Attention and moves its batch back to In Progress.

### Workflow
- Import Bank Statement is now a work queue rather than a transaction-history screen.
- Payments remains the primary location for reviewing completed reconciliations.

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
