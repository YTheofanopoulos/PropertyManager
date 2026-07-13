# PropertyManager MVP — Milestone 3 Updated

This package updates the Milestone 3 fake dataset to the agreed 41-apartment portfolio.

## Portfolio

- Edouard-Charles: 25 apartments
- Jeanne Mance: 10 apartments
- Clermont: 6 apartments

Run with:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```


## Revision 2 changes

- The Units page now displays a complete apartment identifier, such as
  `383 1`, `5213 A`, or `116`, rather than relying on an ambiguous unit number.
- The dashboard detail tables beneath the charts were removed.
- The dashboard now focuses on KPI cards and the two summary charts.


## Revision 3 changes

- Corrected the Units route so it actually displays the new apartment fields.
- Units now show Street, Civic Address, Apartment Number, and Full Apartment.
- Added an Import Bank Statement navigation option and prototype workflow.
- Bank import currently previews sample matches only and does not post payments.


## Revision 4 changes

- Added a DataTables page-length selector with 10, 25, and 50 row options.
- Removed the redundant Full Apartment column from the Units page.
- Added several sample leases with two or three leaseholders.
- The Leases table now shows combined leaseholder names and a people count.


## Revision 5 corrections

- Removed Full Apartment from the actual Units route.
- Every person named on a sample lease is now also a row in the Tenants dataset.
- The Tenants table identifies the primary tenant for each lease.
- Secondary leaseholders have their own contact records and share the apartment and lease.
