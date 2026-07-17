
# PropertyManager Roadmap

## 4.x Foundation and Core Records

- [x] **4.1** Bootstrap 5, TypeScript, Vite, DataTables 2
- [x] **4.2** IndexedDB, repositories, services, browser persistence
- [x] **4.3** CRUD for Locations, Buildings, Units, and Tenants
- [x] **4.4** Lease management, multiple leaseholders, recurring charges, occupancy
- [x] **4.5** Searchable leaseholder selection and ordered primary/secondary management

## 5.x Financial Operations

- [x] **5.1** Tenant and lease ledger with manual payment allocation
- [ ] **5.2** Bank statement import
- [ ] **5.3** Automatic payment matching and review
- [ ] **5.4** Outstanding balances and partial payments
- [ ] **5.5** Financial and rent-roll reporting

## 6.x Portfolio Operations

- [ ] **6.1** Portfolio onboarding
  - CSV import
  - Excel import
  - Downloadable templates
  - Row-level validation
  - Duplicate detection
  - Preview before import
  - Spreadsheet-style correction grid
  - Import history and rollback
- [ ] **6.2** Bulk editing
- [ ] **6.3** Portfolio reporting

## 7.x Asset Operations — Nice to Have

- [ ] **7.1** Maintenance and work orders
- [ ] **7.2** Contractors
- [ ] **7.3** Appliances and capital items
- [ ] **7.4** Documents and photos

## Future Platform Work

- [ ] Flask JSON API
- [ ] MariaDB repository implementation
- [ ] Existing authentication integration
- [ ] Expense application integration using the simplest reliable building/unit mapping

## Baseline 5.3 Assisted Reconciliation

- [x] **5.3.1** Historical learning, deterministic scoring, diagnostics, and controlled QFX fixtures
- [ ] **5.3.2** Reconciliation dashboard and queue classifications
- [ ] **5.3.3** User-defined suggestion rules
- [ ] **5.3.4** Reviewed bulk confirmation workflow

CSV financial import remains deferred.

## Baseline 5.3.2

- [x] Outstanding calculations use today's date
- [x] Preserve bank transaction dates for accounting
- [x] Zero-evidence candidates require Manual Review


## Baseline 5.3.3

- [x] Queue-focused reconciliation workflow
- [x] Hide reconciled transactions by default
- [x] Reconciliation filters and counts
- [x] Batch completion progress
- [x] Reopened voided transactions return to Needs Attention


## Baseline 5.3.4

- [x] Hash routing with query parameters
- [x] Reconciliation queue filters remain on Bank Import
- [x] Confirm Reconciliation returns to Needs Attention
- [x] Persistent version and About information


## Release Status

### Completed

- [x] **Baseline 5.0 — Rent Roll**
  - Monthly rent obligations and rent-period tracking
  - Current-period and cumulative arrears visibility

- [x] **Baseline 5.1 — Payment Management**
  - Manual payment entry and allocation
  - Partial and multi-period payments
  - Voiding with allocation reversal
  - Lease-authoritative effective rent

- [x] **Baseline 5.2 — Bank Import and Manual Reconciliation**
  - QFX/OFX import and preview
  - FITID duplicate detection
  - Import history and transaction queue
  - Manual reconciliation and multi-period allocation
  - JSON export and full-replacement JSON import
  - Realistic deterministic sample data

### In Progress

- [x] **Baseline 5.3 — Assisted Reconciliation**
  - [x] 5.3.1 deterministic matching diagnostics and controlled QFX fixtures
  - [x] 5.3.2 outstanding-balance date correction
  - [x] 5.3.3 reconciliation work queue
  - [x] 5.3.4 routing and version information
  - [x] 5.3.5 Import History usability polish

### Planned

- [ ] **Baseline 5.4 — Financial Reporting**
- [ ] **Baseline 6.x — Portfolio Operations and Bulk Onboarding**
- [ ] **Baseline 7.x — Maintenance and Expense Integration**


## Baseline 5.4 — Property Management Reporting

- [x] **5.4.0 Rent Status command center**
  - Rolling four-month default window
  - Two prior months, current month, and one future month
  - Adjustable 4, 6, 9, or 12 month view
  - Earlier, Later, and Today navigation
  - Paid, Partial, Unpaid, Paid Ahead, Not Yet Due, and Vacant indicators
  - Monthly portfolio collection rates
  - Clickable monthly detail with payment allocations
  - Outstanding balance based on today
- [ ] Tenant / lease ledger
- [ ] Vacancy report
- [ ] Lease expiration report
- [ ] Portfolio summary reporting
- [ ] Table spacing and financial-column alignment standardization


### Baseline 5.4.1

- [x] Rent Status dashboard usability
- [x] Read-only dashboard separation from Rent Roll
- [x] Solid status bubbles matching the legend
- [x] Pagination and live apartment/tenant filtering
- [x] Outstanding and vacant row emphasis


### Baseline 5.4.2 Revised

- [x] Single-line unit identifiers
- [x] Tenant column removed from Rent Status
- [x] Clickable black unit label with occupant popup
- [x] Compact legend and reliable modal close behavior


### Baseline 5.4.3

- [x] Rent Status interaction and contact details
- [x] Monthly bubble click regression fixed
- [x] Unit popup includes tenant email and phone
- [x] Reliable dialog Close and X behavior


### Baseline 5.4.4

- [x] Delegated monthly-modal close handling
- [x] Dynamic footer Close button reliably dismisses dialog
- [x] Header X and footer Close share one close path


## Baseline 5.5 — Reports

- [x] **5.5.1 Payment Receipts by Transaction Month**
  - Apartment-by-month accounting matrix
  - Grouping by payment transaction date
  - Monthly and range totals
  - Bank Import vs Manual summary
  - Building and month-range filters
  - Transaction drill-down
  - Voided-payment exclusion and disclosure
  - Print-friendly output

### Baseline 5.4 Completion

- [x] Rent Status command center complete
- [x] Rolling month visibility and future prepayment status
- [x] Read-only monthly details
- [x] Occupant contact popup
- [x] Search, paging, legend, and modal stabilization

## Documentation Status

- [x] CHANGELOG.md reconstructed through Baseline 5.5.1
- [x] Baseline 5.4 Rent Status marked complete
- [x] Baseline 5.5.1 Payment Receipts report documented
- [x] Architectural decisions consolidated in `docs/ARCHITECTURAL_DECISIONS.md`

## Baseline Status

### Completed
- [x] Baseline 5.2 — QFX Import and Manual Reconciliation
- [x] Baseline 5.3 — Assisted Reconciliation
- [x] Baseline 5.4 — Rent Status Dashboard
- [x] Baseline 5.5.1 — Payment Receipts by Transaction Month

### Deferred Reports
- [ ] Outstanding Rent Report
- [ ] Lease Expiration Report
- [ ] Vacancy Report
- [ ] General Payment History Report
- [ ] Owner and portfolio summary reports


### Baseline 5.5.2 — Location-based Payment Receipts

- [x] Location filter
- [x] Location-aware building filter
- [x] Combined report output
- [x] Separate report per location
- [x] Print page break between locations


### Baseline 5.5.3 — Historical Test Clock

- [x] Centralized business-date service
- [x] System and simulated date modes
- [x] Persistent Historical Test Mode banner
- [x] Business calculations use the application date
- [x] Sample leases cover July 2025 through June 2026
- [x] Stored accounting and audit dates remain unchanged


### Baseline 5.5.4 — Main Dashboard Clock Fix

- [x] Main dashboard uses the centralized Application Clock
- [x] Occupancy and active leases are evaluated as of the application date
- [x] Monthly rent reflects active recurring lease charges
- [x] Collection chart ends at the simulated current month
- [x] Dashboard displays the effective application date


### Baseline 5.5.5 — Explainable Reconciliation Ranking

- [x] Exact outstanding balances rank above all non-exact candidates
- [x] Exact amount receives dominant scoring weight
- [x] Non-exact amounts receive a dollar-difference penalty
- [x] Same target rent period receives additional weight
- [x] Building, unit, tenant, and history evidence remain tie-breakers
- [x] Full score explanation is shown for every candidate
- [x] Multiple exact candidates remain ambiguous

### Baseline 5.5.6 — Main Dashboard Redesign

- [x] Live KPI cards
- [x] Actual collection trend
- [x] Rent-status breakdown
- [x] Recent payments
- [x] Upcoming lease expirations
- [x] Application Clock context


### Baseline 5.5.7 — Reconciliation Workflow Polish

- [x] Reconciliation actions moved below the Bank Transaction card
- [x] Sticky transaction/action card on desktop
- [x] Reusable busy overlay and progress spinner
- [x] Duplicate submission prevention
- [x] Inline reconciliation errors
- [x] Automatic advance to the next transaction

### Baseline 5.5.8 — Busy Overlay Navigation Fix

- [x] Hide overlay before navigation
- [x] Route-level safety reset
- [x] Depth-independent force-hide


### Baseline 5.5.9 — Reconciliation Return-to-Queue Fix

- [x] Return to Needs Attention after reconciliation
- [x] Return to Needs Attention after ignoring a transaction
- [x] Remove automatic advance to the next detail screen

### Baseline 5.6.0 — In-Queue Reconciliation Workflow

- [x] Reconciliation modal without route navigation
- [x] Preserve queue table state
- [x] Allocation beneath Bank Transaction
- [x] Suggested Units beside reconciliation workflow
- [x] In-modal progress and duplicate-submit protection
- [x] Refresh queue and show success toast


### Baseline 5.6.1 — Reconciliation Modal Dismissal Fix

- [x] Cancel and X close reconciliation modal
- [x] Escape closes modal while idle
- [x] Prevent dismissal during active submission
- [x] Clean modal state and backdrop on close
- [ ] Restore focus to originating queue row (deferred)
