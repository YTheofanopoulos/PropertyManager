# PropertyManager Baseline 6.0.0

Baseline 6.0.0 begins the migration from the browser-only IndexedDB architecture to Python, REST API v1, and MariaDB schema 1.

Included:

- Flask application factory and production WSGI entry point
- MariaDB connection pool
- route/service/repository separation
- API v1 system and health endpoints
- normalized InnoDB schema for all 5.8 entities
- separate runtime and migration database-account model
- repeatable SQL migration runner
- database verification utility
- transactional 5.x JSON importer with dry-run validation
- preserved 5.x identifiers and referential-integrity checks
- Gunicorn, systemd, and Apache deployment instructions
- existing Baseline 5.8.3.2 frontend for visual and workflow regression testing

Not yet included:

- replacement of IndexedDB repositories with REST repositories
- live MariaDB writes from every frontend workflow
- authentication integration
- renewal-lease creation and early-termination workflows
