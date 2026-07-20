from __future__ import annotations

from ..database import read_connection


class SystemRepository:
    def ping(self) -> dict[str, str | int | None]:
        with read_connection() as connection:
            cursor = connection.cursor()
            cursor.execute("SELECT DATABASE(), CURRENT_USER(), VERSION()")
            database, user, version = cursor.fetchone()
            cursor.execute("SELECT MAX(version) FROM schema_migrations")
            row = cursor.fetchone()
            schema_version = row[0] if row else None
            cursor.close()
        return {
            "database": database,
            "databaseUser": user,
            "databaseVersion": version,
            "schemaVersion": schema_version,
        }
