# PropertyManager — Milestone 4.2

Milestone 4.2 modernizes the frontend foundation without persistence or CRUD.

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

This archive is a complete Milestone 4.2 package, not a delta.

It restores the full approved navigation. Features not yet implemented display
working placeholder pages and remain visible in the sidebar.

## IndexedDB testing
On first launch the app seeds the 41-apartment portfolio into IndexedDB. Later reloads reuse those records. Use **Reset Sample Data** to reseed and **Export JSON** to inspect or back up the data.

Browser developer tools: Chrome/Edge **Application → IndexedDB**, Firefox **Storage → Indexed DB**, Safari **Storage → Indexed Databases**.
