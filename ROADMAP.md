
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
