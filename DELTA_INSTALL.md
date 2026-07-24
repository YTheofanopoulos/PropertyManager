# Baseline 6.7.3 Delta Installation

This archive is rooted at the PropertyManager project directory. It does **not** contain an enclosing `PropertyManager/` folder.

Apply it from inside a Baseline 6.7.2 project directory:

```bash
cd /path/to/your/PropertyManager6.7.2
unzip -o /path/to/PropertyManager-6.7.3-Delta.zip
```

No dependency or database changes are required. If you run the frontend
through Vite, restart it after applying the delta:

```bash
npm --prefix frontend run dev
```

The included Vite configuration proxies `/PropertyManager/api/...` to the
Flask backend and removes the `/PropertyManager` prefix before forwarding.

Sign in at the server main page, then open PropertyManager from the portal.
Confirm in the browser Network tab that
`/PropertyManager/api/v1/auth/session` returns HTTP 200.

For a production Apache deployment, place the API proxy before the frontend
alias or fallback rules:

```apache
ProxyPass        /PropertyManager/api/ http://127.0.0.1:5001/api/
ProxyPassReverse /PropertyManager/api/ http://127.0.0.1:5001/api/
```

This delta requires Baseline 6.7.2. REST API v1 and MariaDB Schema 2 are
unchanged; no database migration is required.
