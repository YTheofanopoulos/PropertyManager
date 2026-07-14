# PropertyManager — Milestone 4.4

Milestone 4.4 modernizes the frontend foundation without persistence or CRUD.

## Stack

- Bootstrap 5
- DataTables 2 with Bootstrap 5 styling
- TypeScript
- Vite
- Chart.js
- Font Awesome
- Flask static host for the production build

## Included

- TypeScript application shell
- Hash-based client-side routing
- Responsive Bootstrap 5 sidebar and top bar
- Dashboard using the agreed 41-apartment portfolio
- Units, Tenants, and Leases prototype tables
- DataTables page-size selector with 10, 25, and 50 rows
- Multiple leaseholders in sample data
- No jQuery in application code
- No IndexedDB, CRUD, API, or MariaDB yet

## Development

```bash
cd frontend
npm install
npm run dev
```

## Production-style local test

```bash
cd frontend
npm install
npm run build
cd ../backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```


## Full-package revision

This archive is a complete Milestone 4.4 package, not a delta.

It restores the full approved navigation. Features not yet implemented display
working placeholder pages and remain visible in the sidebar.

## IndexedDB testing
On first launch the app seeds the 41-apartment portfolio into IndexedDB. Later reloads reuse those records. Use **Reset Sample Data** to reseed and **Export JSON** to inspect or back up the data.

Browser developer tools: Chrome/Edge **Application → IndexedDB**, Firefox **Storage → Indexed DB**, Safari **Storage → Indexed Databases**.


## Milestone 4.4 testing

Try adding or editing a Location, Building, Unit, or Tenant. Refresh the browser:
the saved change should remain because it is stored in IndexedDB.

Deletion is intentionally restricted when related records exist:

- Locations with buildings cannot be deleted.
- Buildings with units cannot be deleted.
- Units with lease history cannot be deleted.
- Tenants attached to leases cannot be deleted; mark them inactive instead.

The lease table remains read-only in this increment.


## Milestone 4.4 lease testing

1. Open **Leases** and choose **Create Lease**.
2. Select a unit and one or more tenants.
3. Choose exactly one primary leaseholder.
4. Select a fixed or month-to-month term.
5. Enter apartment rent and optional parking, storage, or other charges.
6. Save the lease and confirm it appears in the table.
7. Refresh the browser and confirm the lease remains.
8. Attempt an overlapping lease for the same unit to verify validation.
9. Edit an existing lease and confirm the unit is locked.
10. Terminate a lease and confirm the historical record remains.


## Baseline 5.2 QFX testing

1. Reset Sample Data.
2. Open **Import Bank Statement**.
3. Preview and import `docs/test-data/Baseline5_2_Reconciliation_Test.qfx`.
4. Reconcile exact, partial, overpaid, and multi-month transactions.
5. Mark the unmatched deposit as Not Rent.
6. Import the same file again and confirm all entries are duplicates.
7. Import `Baseline5_2_Overlap_Reimport_Test.qfx` and confirm only its additional
   FITID is imported.
8. Void a reconciled payment and confirm the bank transaction returns to
   Unmatched and the rent becomes due again.


## Baseline 5.2.1 JSON restore testing

1. Export the current dataset from **Administration → Export JSON**.
2. Make a visible change, such as recording a payment.
3. Choose **Import JSON** and select the earlier export.
4. Confirm the replacement warning.
5. Verify the application reloads and the earlier dataset is fully restored.
6. Try an invalid or incomplete JSON file and confirm the current data remains unchanged.


## Baseline 5.3.1 testing

See `docs/test-data/baseline5_3_1/TEST_PLAN.md`. Reset sample data first, then import and reconcile the three monthly QFX files in order.
