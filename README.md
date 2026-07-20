# PropertyManager Baseline 6.0.0

PropertyManager is transitioning from the Baseline 5 browser-only application to a Python/MariaDB client-server architecture.

Version identifiers:

- Application: **6.0.0**
- REST API: **v1**
- Database schema: **1**

Baseline 6.0.0 is the infrastructure release. It includes the complete 5.8.3.2 frontend, a Flask/Gunicorn backend foundation, the normalized MariaDB schema, migration tools, and a transactional importer for the real JSON data exported by Baseline 5.8.

Start with [docs/INSTALL.md](docs/INSTALL.md).

Important: the 6.0.0 frontend still uses its established IndexedDB repositories. MariaDB-backed UI repositories will be introduced in the next 6.0.x integration milestone. This allows the database foundation and real-data migration to be verified independently before changing all user workflows.
