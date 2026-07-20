#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from collections import Counter
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Callable

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

JSON_PRIMITIVES = (str, int, float, bool, type(None))


class ImportValueError(ValueError):
    """A backup value cannot be converted to its MariaDB column type."""

    def __init__(
        self,
        collection: str,
        row_number: int,
        column_number: int,
        column_name: str,
        value: Any,
        reason: str,
    ) -> None:
        self.collection = collection
        self.row_number = row_number
        self.column_number = column_number
        self.column_name = column_name
        self.value = value
        self.reason = reason
        super().__init__(self.diagnostic())

    def diagnostic(self) -> str:
        rendered = repr(self.value)
        if len(rendered) > 500:
            rendered = rendered[:497] + "..."
        return (
            "Backup parameter conversion failed\n"
            f"  Collection:  {self.collection}\n"
            f"  Row:         {self.row_number}\n"
            f"  Column:      {self.column_number} ({self.column_name})\n"
            f"  Python type: {type(self.value).__name__}\n"
            f"  Value:       {rendered}\n"
            f"  Reason:      {self.reason}"
        )


class ImportExecutionError(RuntimeError):
    """MariaDB rejected a converted row during import."""


Converter = Callable[[Any], Any]


@dataclass(frozen=True)
class Column:
    json_name: str
    converter: Converter
    default: Any = ""
    nullable: bool = False


@dataclass(frozen=True)
class CollectionSpec:
    sql: str
    columns: tuple[Column, ...]


def as_string(raw: Any) -> str:
    if isinstance(raw, str):
        return raw
    if isinstance(raw, (int, float, Decimal)) and not isinstance(raw, bool):
        return str(raw)
    raise TypeError("expected text or a scalar value convertible to text")


def as_integer(raw: Any) -> int:
    if isinstance(raw, bool):
        raise TypeError("boolean is not a valid integer")
    if isinstance(raw, int):
        return raw
    if isinstance(raw, float):
        if not raw.is_integer():
            raise TypeError("fractional number cannot be converted to an integer")
        return int(raw)
    if isinstance(raw, str):
        value = raw.strip()
        if not value:
            raise TypeError("empty text is not a valid integer")
        return int(value)
    raise TypeError("expected an integer or numeric text")


def as_decimal(raw: Any) -> Decimal:
    if isinstance(raw, bool):
        raise TypeError("boolean is not a valid decimal")
    if not isinstance(raw, (str, int, float, Decimal)):
        raise TypeError("expected a number or numeric text")
    try:
        value = Decimal(str(raw))
    except (InvalidOperation, ValueError) as exc:
        raise TypeError("value is not a valid decimal") from exc
    if not value.is_finite():
        raise TypeError("NaN and infinite decimal values are not supported")
    return value


def as_boolean(raw: Any) -> int:
    if isinstance(raw, bool):
        return int(raw)
    if isinstance(raw, int) and raw in (0, 1):
        return raw
    if isinstance(raw, str):
        value = raw.strip().lower()
        if value in {"true", "1", "yes"}:
            return 1
        if value in {"false", "0", "no"}:
            return 0
    raise TypeError("expected a boolean, 0/1, or true/false text")


def text(name: str, default: str = "", nullable: bool = False) -> Column:
    return Column(name, as_string, default, nullable)


def integer(name: str, default: Any = "", nullable: bool = False) -> Column:
    return Column(name, as_integer, default, nullable)


def decimal(name: str, default: Any = "") -> Column:
    return Column(name, as_decimal, default)


def boolean(name: str, default: bool = False) -> Column:
    return Column(name, as_boolean, default)


SPECS: dict[str, CollectionSpec] = {
    "locations": CollectionSpec(
        "INSERT INTO locations(id,name,city) VALUES (?,?,?)",
        (integer("id"), text("name"), text("city")),
    ),
    "buildings": CollectionSpec(
        "INSERT INTO buildings(id,location_id,civic_address,city,state_province,postal_code) VALUES (?,?,?,?,?,?)",
        (integer("id"), integer("locationId"), text("civicAddress"), text("city"), text("stateProvince"), text("postalCode")),
    ),
    "units": CollectionSpec(
        "INSERT INTO units(id,building_id,apartment_number,bedrooms,bathrooms,monthly_rent,status,active) VALUES (?,?,?,?,?,?,?,?)",
        (integer("id"), integer("buildingId"), text("apartmentNumber"), decimal("bedrooms", 0), decimal("bathrooms", 0), decimal("monthlyRent", 0), text("status"), boolean("active", True)),
    ),
    "tenants": CollectionSpec(
        "INSERT INTO tenants(id,first_name,last_name,email,phone,active) VALUES (?,?,?,?,?,?)",
        (integer("id"), text("firstName"), text("lastName"), text("email"), text("phone"), boolean("active", True)),
    ),
    "leases": CollectionSpec(
        "INSERT INTO leases(id,unit_id,start_date,end_date,term_type,status,renewal_status,renewal_letter_sent_date,renewal_response_date,renewal_notes,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (integer("id"), integer("unitId"), text("startDate"), text("endDate"), text("termType", "Fixed"), text("status"), text("renewalStatus", "Not Started"), text("renewalLetterSentDate", nullable=True), text("renewalResponseDate", nullable=True), text("renewalNotes"), text("notes")),
    ),
    "leaseParticipants": CollectionSpec(
        "INSERT INTO lease_participants(id,lease_id,tenant_id,is_primary,sort_order) VALUES (?,?,?,?,?)",
        (integer("id"), integer("leaseId"), integer("tenantId"), boolean("primary"), integer("sortOrder", 0)),
    ),
    "recurringCharges": CollectionSpec(
        "INSERT INTO recurring_charges(id,lease_id,charge_type,description,amount,frequency,start_date,end_date) VALUES (?,?,?,?,?,?,?,?)",
        (integer("id"), integer("leaseId"), text("chargeType"), text("description"), decimal("amount"), text("frequency"), text("startDate"), text("endDate")),
    ),
    "leaseConcessions": CollectionSpec(
        "INSERT INTO lease_concessions(id,lease_id,description,amount,start_period,end_period,comment) VALUES (?,?,?,?,?,?,?)",
        (integer("id"), integer("leaseId"), text("description"), decimal("amount"), text("startPeriod"), text("endPeriod"), text("comment")),
    ),
    "rentObligations": CollectionSpec(
        "INSERT INTO rent_obligations(id,lease_id,rent_period,expected_amount,status,created_at) VALUES (?,?,?,?,?,?)",
        (integer("id"), integer("leaseId"), text("rentPeriod"), decimal("expectedAmount"), text("status"), text("createdAt")),
    ),
    "payments": CollectionSpec(
        "INSERT INTO payments(id,lease_id,tenant_id,received_date,amount,payment_method,reference,notes,source,status,voided_at,void_reason,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (integer("id"), integer("leaseId"), integer("tenantId", nullable=True), text("receivedDate"), decimal("amount"), text("paymentMethod", "Other"), text("reference"), text("notes"), text("source"), text("status", "Posted"), text("voidedAt", nullable=True), text("voidReason", nullable=True), text("createdAt")),
    ),
    "paymentAllocations": CollectionSpec(
        "INSERT INTO payment_allocations(id,payment_id,obligation_id,amount) VALUES (?,?,?,?)",
        (integer("id"), integer("paymentId"), integer("obligationId"), decimal("amount")),
    ),
    "bankImportBatches": CollectionSpec(
        "INSERT INTO bank_import_batches(id,filename,imported_at,account_last_four,currency,statement_start,statement_end,transaction_count,total_credits,total_debits,new_transaction_count,duplicate_count,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (integer("id"), text("filename"), text("importedAt"), text("accountLastFour"), text("currency"), text("statementStart"), text("statementEnd"), integer("transactionCount"), decimal("totalCredits", 0), decimal("totalDebits", 0), integer("newTransactionCount", 0), integer("duplicateCount", 0), text("status")),
    ),
    "bankTransactions": CollectionSpec(
        "INSERT INTO bank_transactions(id,import_batch_id,external_id,account_last_four,posted_date,amount,transaction_type,name,memo,status,matched_payment_id,ignored_reason,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (integer("id"), integer("importBatchId"), text("externalId"), text("accountLastFour"), text("postedDate"), decimal("amount"), text("transactionType"), text("name"), text("memo"), text("status"), integer("matchedPaymentId", nullable=True), text("ignoredReason", nullable=True), text("createdAt")),
    ),
    "reconciliationHistory": CollectionSpec(
        "INSERT INTO reconciliation_history(id,bank_transaction_id,payment_id,lease_id,amount,posted_date,posted_day,normalized_name,normalized_memo,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (integer("id"), integer("bankTransactionId"), integer("paymentId"), integer("leaseId"), decimal("amount"), text("postedDate"), integer("postedDay"), text("normalizedName"), text("normalizedMemo"), text("createdAt")),
    ),
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


def convert_rows(name: str, rows: list[dict[str, Any]]) -> list[tuple[Any, ...]]:
    spec = SPECS[name]
    converted: list[tuple[Any, ...]] = []
    for row_number, row in enumerate(rows, start=1):
        values: list[Any] = []
        for column_number, column in enumerate(spec.columns, start=1):
            raw = row.get(column.json_name, column.default)
            if not isinstance(raw, JSON_PRIMITIVES):
                raise ImportValueError(
                    name, row_number, column_number, column.json_name, raw,
                    "nested objects and arrays cannot be bound to this MariaDB column",
                )
            if column.nullable and raw in ("", None):
                values.append(None)
                continue
            if raw is None:
                raise ImportValueError(
                    name, row_number, column_number, column.json_name, raw,
                    "null is not allowed for this field",
                )
            try:
                converted_value = column.converter(raw)
            except (TypeError, ValueError, InvalidOperation) as exc:
                raise ImportValueError(
                    name, row_number, column_number, column.json_name, raw, str(exc),
                ) from exc
            if not isinstance(converted_value, (str, int, float, Decimal, bool, type(None))):
                raise ImportValueError(
                    name, row_number, column_number, column.json_name, converted_value,
                    "converter produced a non-bindable Python value",
                )
            values.append(converted_value)
        converted.append(tuple(values))
    return converted


def _execution_diagnostic(
    name: str,
    row_number: int,
    row: tuple[Any, ...],
    error: BaseException,
) -> str:
    spec = SPECS[name]
    fields = ", ".join(
        f"{column.json_name}={value!r} ({type(value).__name__})"
        for column, value in zip(spec.columns, row)
    )
    return (
        "MariaDB rejected a converted import row\n"
        f"  Collection: {name}\n"
        f"  Row:        {row_number}\n"
        f"  Values:     {fields}\n"
        f"  Driver:     {type(error).__name__}: {error}"
    )


def insert_rows(cursor: mariadb.Cursor, name: str, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    spec = SPECS[name]
    converted = convert_rows(name, rows)
    savepoint = f"import_{TABLE_MAP[name]}"
    cursor.execute(f"SAVEPOINT `{savepoint}`")
    try:
        cursor.executemany(spec.sql, converted)
        cursor.execute(f"RELEASE SAVEPOINT `{savepoint}`")
        return
    except mariadb.Error as bulk_error:
        cursor.execute(f"ROLLBACK TO SAVEPOINT `{savepoint}`")

    # Some Connector/Python bulk-protocol errors omit the JSON field name. Probe
    # row-by-row inside the same transaction so the diagnostic identifies the
    # exact source record while preserving all-or-nothing import behavior.
    for row_number, converted_row in enumerate(converted, start=1):
        try:
            cursor.execute(spec.sql, converted_row)
        except mariadb.Error as row_error:
            raise ImportExecutionError(
                _execution_diagnostic(name, row_number, converted_row, row_error)
            ) from row_error
    cursor.execute(f"RELEASE SAVEPOINT `{savepoint}`")


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
    try:
        data, metadata = load_backup(args.backup)
        validate(data)
        # Perform every type conversion during dry-run too. This catches the
        # same parameter failures as a live import without requiring MariaDB.
        for name in INSERT_ORDER:
            convert_rows(name, data[name])
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"Backup validation failed: {exc}", file=sys.stderr)
        return 2
    print(f"Backup application: {metadata.get('applicationVersion', 'Unknown')}")
    print(f"Backup schema:      {metadata.get('schemaVersion', 'Unknown')}")
    print("Record counts:")
    for name in COLLECTIONS:
        print(f"  {name:24} {len(data[name]):8}")
    print(f"  {'TOTAL':24} {sum(map(len, data.values())):8}")
    if args.dry_run:
        print("Dry run complete. No database changes were made.")
        return 0
    connection: mariadb.Connection | None = None
    try:
        connection = connect()
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
            count = len(data[name])
            print(f"Importing {name:<24} ... ", end="", flush=True)
            insert_rows(cursor, name, data[name])
            print(f"OK ({count})")
        connection.commit()
        print("Import committed successfully.")
    except (ImportValueError, ImportExecutionError, mariadb.Error, RuntimeError) as exc:
        if connection is not None:
            connection.rollback()
        print("Import failed. Transaction rolled back; no partial import was retained.", file=sys.stderr)
        print(str(exc), file=sys.stderr)
        return 3
    except Exception as exc:
        if connection is not None:
            connection.rollback()
        print("Import failed. Transaction rolled back; no partial import was retained.", file=sys.stderr)
        print(f"Unexpected {type(exc).__name__}: {exc}", file=sys.stderr)
        return 4
    finally:
        if connection is not None:
            connection.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
