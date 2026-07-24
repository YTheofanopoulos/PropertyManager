# Baseline 6.7.2 Delta Installation

This archive is rooted at the PropertyManager project directory. It does **not** contain an enclosing `PropertyManager/` folder.

Apply it from inside a Baseline 6.7.1 project directory:

```bash
cd /path/to/your/PropertyManager6.7.1
unzip -o /path/to/PropertyManager_Baseline6_7_2_Delta.zip
```

No dependency or database changes are required. If you run the frontend
through Vite, restart it after applying the delta:

```bash
npm --prefix frontend run dev
```

The included Vite configuration uses `/PropertyManager/` as its public base
and does not require `@vitejs/plugin-react`.

Sign in at the server main page, then open PropertyManager from the portal.
PropertyManager now reads the portal's separate `sessionStorage` entries
(`username` and `hash`) and validates them through the backend. Confirm that no
second login screen appears and that `/api/v1/auth/session` returns HTTP 200 in
the browser Network tab.

This delta requires Baseline 6.7.1. REST API v1 and MariaDB Schema 2 are
unchanged; no database migration is required.
