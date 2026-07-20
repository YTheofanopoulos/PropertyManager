#!/usr/bin/env python3
from __future__ import annotations

import os
from pathlib import Path

import mariadb
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / "backend" / ".env")

TABLES = [
    "locations", "buildings", "units", "tenants", "leases", "lease_participants",
    "recurring_charges", "lease_concessions", "rent_obligations", "payments",
    "payment_allocations", "bank_import_batches", "bank_transactions", "reconciliation_history",
]


def main() -> int:
    connection = mariadb.connect(
        host=os.getenv("PM_DB_HOST", "localhost"), port=int(os.getenv("PM_DB_PORT", "3306")),
        user=os.environ["PM_DB_USER"], password=os.environ["PM_DB_PASSWORD"],
        database=os.getenv("PM_DB_NAME", "property_manager"),
    )
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT MAX(version) FROM schema_migrations")
        print(f"Schema version: {cursor.fetchone()[0]}")
        total_records = 0
        for table in TABLES:
            cursor.execute(f"SELECT COUNT(*) FROM `{table}`")
            count = cursor.fetchone()[0]
            total_records += count
            print(f"{table:26} {count:8}")
        print(f"{'-' * 26} {'-' * 8}")
        print(f"{'TOTAL IMPORTED RECORDS':26} {total_records:8}")
        cursor.close()
    finally:
        connection.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
