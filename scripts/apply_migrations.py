#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
from pathlib import Path

import mariadb
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / "backend" / ".env")


def connect() -> mariadb.Connection:
    return mariadb.connect(
        host=os.getenv("PM_DB_HOST", "localhost"),
        port=int(os.getenv("PM_DB_PORT", "3306")),
        user=os.environ["PM_DB_USER"],
        password=os.environ["PM_DB_PASSWORD"],
        database=os.getenv("PM_DB_NAME", "property_manager"),
        autocommit=False,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply PropertyManager SQL migrations")
    parser.add_argument("--migration-dir", type=Path, default=ROOT / "database" / "migrations")
    args = parser.parse_args()
    files = sorted(args.migration_dir.glob("*.sql"))
    if not files:
        raise SystemExit("No migration files found")
    connection = connect()
    try:
        cursor = connection.cursor()
        for path in files:
            version = int(path.name.split("_", 1)[0])
            try:
                cursor.execute("SELECT 1 FROM schema_migrations WHERE version=?", (version,))
                if cursor.fetchone():
                    print(f"Skipping migration {path.name} (already applied)")
                    continue
            except mariadb.Error:
                pass
            print(f"Applying migration {path.name}")
            statements = [s.strip() for s in path.read_text(encoding="utf-8").split(";") if s.strip()]
            for statement in statements:
                cursor.execute(statement)
            connection.commit()
        cursor.close()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
