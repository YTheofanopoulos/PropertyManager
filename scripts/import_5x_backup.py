#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from collections import Counter
from decimal import Decimal
from pathlib import Path
from typing import Any

import mariadb
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / "backend" / ".env")

COLLECTIONS = [
    "locations", "buildings", "units", "tenants", "leases", "leaseParticipants",
    "recurringCharges", "leaseConcessions", "rentObligations", "payments",
    "paymentAllocations", "bankImportBatches", "bankTransactions", "reconciliationHistory",
]

INSERT_ORDER = COLLECTIONS
DELETE_ORDER = list(reversed(COLLECTIONS))
TABLE_MAP = {
    "locations": "locations", "buildings": "buildings", "units": "units", "tenants": "tenants",
    "leases": "leases", "leaseParticipants": "lease_participants",
    "recurringCharges": "recurring_charges", "leaseConcessions": "lease_concessions",
    "rentObligations": "rent_obligations", "payments": "payments",
    "paymentAllocations": "payment_allocations", "bankImportBatches": "bank_import_batches",
    "bankTransactions": "bank_transactions", "reconciliationHistory": "reconciliation_history",
}


def load_backup(path: Path) -> tuple[dict[str, list[dict[str, Any]]], dict[str, Any]]:
    parsed = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(parsed, dict):
        raise ValueError("Backup root must be a JSON object")
    if parsed.get("format") == "PropertyManagerBackup":
        database = parsed.get("database")
        metadata = parsed
        checksum = parsed.get("checksum") or {}
        if checksum.get("value"):
            actual = hashlib.sha256(json.dumps(database, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
            # Browser JSON.stringify has compact separators and insertion order.
            if actual != checksum["value"]:
                raise ValueError("Backup checksum verification failed")
    else:
        database = parsed
        metadata = {"applicationVersion": "Legacy 5.x", "schemaVersion": 7}
        database.setdefault("leaseConcessions", [])
    if not isinstance(database, dict):
        raise ValueError("Backup does not contain a database object")
    result: dict[str, list[dict[str, Any]]] = {}
    for name in COLLECTIONS:
        rows = database.get(name)
        if not isinstance(rows, list):
            raise ValueError(f"Backup collection {name} is missing or invalid")
        if not all(isinstance(row, dict) for row in rows):
            raise ValueError(f"Backup collection {name} contains a non-object row")
        result[name] = rows
    return result, metadata


def ids(rows: list[dict[str, Any]], name: str) -> set[int]:
    values = [row.get("id") for row in rows]
    if any(not isinstance(value, int) or value <= 0 for value in values):
        raise ValueError(f"Every {name} record must have a positive integer id")
    duplicates = [value for value, count in Counter(values).items() if count > 1]
    if duplicates:
        raise ValueError(f"Duplicate IDs in {name}: {duplicates[:10]}")
    return set(values)


def validate(data: dict[str, list[dict[str, Any]]]) -> None:
    keysets = {name: ids(rows, name) for name, rows in data.items()}
    references = [
        ("buildings", "locationId", "locations"), ("units", "buildingId", "buildings"),
        ("leases", "unitId", "units"), ("leaseParticipants", "leaseId", "leases"),
        ("leaseParticipants", "tenantId", "tenants"), ("recurringCharges", "leaseId", "leases"),
        ("leaseConcessions", "leaseId", "leases"), ("rentObligations", "leaseId", "leases"),
        ("payments", "leaseId", "leases"), ("paymentAllocations", "paymentId", "payments"),
        ("paymentAllocations", "obligationId", "rentObligations"),
        ("bankTransactions", "importBatchId", "bankImportBatches"),
        ("reconciliationHistory", "bankTransactionId", "bankTransactions"),
        ("reconciliationHistory", "paymentId", "payments"),
        ("reconciliationHistory", "leaseId", "leases"),
    ]
    for child, field, parent in references:
        for row in data[child]:
            value = row.get(field)
            if value not in keysets[parent]:
                raise ValueError(f"{child} id={row.get('id')} references missing {parent} id={value}")
    for row in data["payments"]:
        tenant_id = row.get("tenantId")
        if tenant_id is not None and tenant_id not in keysets["tenants"]:
            raise ValueError(f"payments id={row.get('id')} references missing tenant id={tenant_id}")
    for row in data["bankTransactions"]:
        payment_id = row.get("matchedPaymentId")
        if payment_id is not None and payment_id not in keysets["payments"]:
            raise ValueError(f"bankTransactions id={row.get('id')} references missing payment id={payment_id}")


def value(row: dict[str, Any], key: str, default: Any = "") -> Any:
    result = row.get(key, default)
    return default if result is None and default is not None else result


def insert_rows(cursor: mariadb.Cursor, name: str, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    specs: dict[str, tuple[str, list[str], Any]] = {
        "locations": ("INSERT INTO locations(id,name,city) VALUES (?,?,?)", ["id","name","city"], None),
        "buildings": ("INSERT INTO buildings(id,location_id,civic_address,city,state_province,postal_code) VALUES (?,?,?,?,?,?)", ["id","locationId","civicAddress","city","stateProvince","postalCode"], None),
        "units": ("INSERT INTO units(id,building_id,apartment_number,bedrooms,bathrooms,monthly_rent,status,active) VALUES (?,?,?,?,?,?,?,?)", ["id","buildingId","apartmentNumber","bedrooms","bathrooms","monthlyRent","status","active"], None),
        "tenants": ("INSERT INTO tenants(id,first_name,last_name,email,phone,active) VALUES (?,?,?,?,?,?)", ["id","firstName","lastName","email","phone","active"], None),
        "leases": ("INSERT INTO leases(id,unit_id,start_date,end_date,term_type,status,renewal_status,renewal_letter_sent_date,renewal_response_date,renewal_notes,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)", ["id","unitId","startDate","endDate","termType","status","renewalStatus","renewalLetterSentDate","renewalResponseDate","renewalNotes","notes"], None),
        "leaseParticipants": ("INSERT INTO lease_participants(id,lease_id,tenant_id,is_primary,sort_order) VALUES (?,?,?,?,?)", ["id","leaseId","tenantId","primary","sortOrder"], None),
        "recurringCharges": ("INSERT INTO recurring_charges(id,lease_id,charge_type,description,amount,frequency,start_date,end_date) VALUES (?,?,?,?,?,?,?,?)", ["id","leaseId","chargeType","description","amount","frequency","startDate","endDate"], None),
        "leaseConcessions": ("INSERT INTO lease_concessions(id,lease_id,description,amount,start_period,end_period,comment) VALUES (?,?,?,?,?,?,?)", ["id","leaseId","description","amount","startPeriod","endPeriod","comment"], None),
        "rentObligations": ("INSERT INTO rent_obligations(id,lease_id,rent_period,expected_amount,status,created_at) VALUES (?,?,?,?,?,?)", ["id","leaseId","rentPeriod","expectedAmount","status","createdAt"], None),
        "payments": ("INSERT INTO payments(id,lease_id,tenant_id,received_date,amount,payment_method,reference,notes,source,status,voided_at,void_reason,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", ["id","leaseId","tenantId","receivedDate","amount","paymentMethod","reference","notes","source","status","voidedAt","voidReason","createdAt"], None),
        "paymentAllocations": ("INSERT INTO payment_allocations(id,payment_id,obligation_id,amount) VALUES (?,?,?,?)", ["id","paymentId","obligationId","amount"], None),
        "bankImportBatches": ("INSERT INTO bank_import_batches(id,filename,imported_at,account_last_four,currency,statement_start,statement_end,transaction_count,total_credits,total_debits,new_transaction_count,duplicate_count,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", ["id","filename","importedAt","accountLastFour","currency","statementStart","statementEnd","transactionCount","totalCredits","totalDebits","newTransactionCount","duplicateCount","status"], None),
        "bankTransactions": ("INSERT INTO bank_transactions(id,import_batch_id,external_id,account_last_four,posted_date,amount,transaction_type,name,memo,status,matched_payment_id,ignored_reason,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", ["id","importBatchId","externalId","accountLastFour","postedDate","amount","transactionType","name","memo","status","matchedPaymentId","ignoredReason","createdAt"], None),
        "reconciliationHistory": ("INSERT INTO reconciliation_history(id,bank_transaction_id,payment_id,lease_id,amount,posted_date,posted_day,normalized_name,normalized_memo,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", ["id","bankTransactionId","paymentId","leaseId","amount","postedDate","postedDay","normalizedName","normalizedMemo","createdAt"], None),
    }
    sql, fields, _ = specs[name]
    converted = []
    nullable = {"renewalLetterSentDate", "renewalResponseDate", "tenantId", "voidedAt", "voidReason", "matchedPaymentId", "ignoredReason"}
    defaults = {
        "termType":"Fixed", "renewalStatus":"Not Started", "renewalNotes":"", "notes":"", "sortOrder":0,
        "comment":"", "status":"Posted", "paymentMethod":"Other", "active":True, "city":"",
        "stateProvince":"", "postalCode":"", "email":"", "phone":"",
    }
    for row in rows:
        vals = []
        for field in fields:
            raw = row.get(field, defaults.get(field, ""))
            if field in nullable and raw in ("", None):
                raw = None
            if field in {"amount","monthlyRent","expectedAmount","totalCredits","totalDebits"} and raw != "":
                raw = Decimal(str(raw))
            vals.append(raw)
        converted.append(tuple(vals))
    cursor.executemany(sql, converted)


def connect() -> mariadb.Connection:
    return mariadb.connect(
        host=os.getenv("PM_DB_HOST", "localhost"), port=int(os.getenv("PM_DB_PORT", "3306")),
        user=os.environ["PM_DB_USER"], password=os.environ["PM_DB_PASSWORD"],
        database=os.getenv("PM_DB_NAME", "property_manager"), autocommit=False,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Import a PropertyManager 5.x JSON backup into MariaDB")
    parser.add_argument("backup", type=Path)
    parser.add_argument("--dry-run", action="store_true", help="Validate and report without changing MariaDB")
    parser.add_argument("--replace", action="store_true", help="Delete current application data before importing")
    args = parser.parse_args()
    data, metadata = load_backup(args.backup)
    validate(data)
    print(f"Backup application: {metadata.get('applicationVersion', 'Unknown')}")
    print(f"Backup schema:      {metadata.get('schemaVersion', 'Unknown')}")
    print("Record counts:")
    for name in COLLECTIONS:
        print(f"  {name:24} {len(data[name]):8}")
    print(f"  {'TOTAL':24} {sum(map(len, data.values())):8}")
    if args.dry_run:
        print("Dry run complete. No database changes were made.")
        return 0
    connection = connect()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT MAX(version) FROM schema_migrations")
        if cursor.fetchone()[0] != 1:
            raise RuntimeError("Database schema 1 is required")
        cursor.execute("SELECT COUNT(*) FROM locations")
        populated = cursor.fetchone()[0] > 0
        if populated and not args.replace:
            raise RuntimeError("Database is not empty. Re-run with --replace only after taking a backup.")
        if args.replace:
            cursor.execute("SET FOREIGN_KEY_CHECKS=0")
            for name in DELETE_ORDER:
                cursor.execute(f"DELETE FROM `{TABLE_MAP[name]}`")
            cursor.execute("SET FOREIGN_KEY_CHECKS=1")
        for name in INSERT_ORDER:
            insert_rows(cursor, name, data[name])
        connection.commit()
        print("Import committed successfully.")
    except Exception:
        connection.rollback()
        print("Import failed. Transaction rolled back; no partial import was retained.", file=sys.stderr)
        raise
    finally:
        connection.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
