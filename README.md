# PropertyManager MVP — Milestone 3

Milestone 3 introduces the reusable UI framework and realistic fake-data pages.

## Included

- Flask application factory
- Feature blueprints
- Bootstrap 4 application shell
- Responsive/collapsible sidebar
- Top navigation and search placeholder
- Reusable Jinja components
- Dashboard KPI cards and Chart.js charts
- DataTables wrapper with CSV export
- Fake data for 6 properties and 50 units
- Properties, Units, Tenants, Leases, Payments, Maintenance, and Reports pages
- Apache `wsgi.py` entry point
- No authentication implementation

## Run locally

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

Open `http://127.0.0.1:5000`.

## Notes

The data is generated deterministically for UI testing. A future milestone will replace
the fake-data service with SQLAlchemy-backed services without changing the templates.
