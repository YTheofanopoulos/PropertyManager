# Importing Baseline 5.x Backups

Baseline 6.0.0.4 hardens the official JSON migration path from the browser-based
5.x application to MariaDB schema 1.

## Recommended workflow

From the project root, first validate the backup without changing MariaDB:

```bash
./scripts/import_5x_backup.sh /path/to/PropertyManager_backup.json --dry-run
```

If validation succeeds, perform the transactional import:

```bash
./scripts/import_5x_backup.sh /path/to/PropertyManager_backup.json
```

Use `--replace` only for a development database whose existing contents may be
discarded and only after taking a database backup.

## What the dry run validates

- Backup structure, collections, and checksum when present
- Positive, unique record identifiers
- References between related records
- Every parameter's conversion to its expected MariaDB type
- Nullable values, decimals, integers, booleans, dates, and text fields
- Rejection of nested JSON objects or arrays in scalar database columns

The dry run does not connect to MariaDB and does not change data.

## Import progress

A live import reports each collection as it is committed to the pending
transaction:

```text
Importing locations                ... OK (3)
Importing buildings                ... OK (16)
Importing units                    ... OK (41)
```

The transaction is committed only after every collection succeeds. Any failure
rolls back the complete import, including a `--replace` operation.

## Conversion diagnostics

Invalid values are reported with their exact source location:

```text
Backup parameter conversion failed
  Collection:  units
  Row:         4
  Column:      5 (bathrooms)
  Python type: dict
  Value:       {'value': 1}
  Reason:      nested objects and arrays cannot be bound to this MariaDB column
```

Rows and columns are one-based. The field name is the original JSON property,
which makes it possible to inspect the matching record in the exported backup.
Displayed values are limited to 500 characters.

If MariaDB rejects a value after conversion, the importer retries the failed
bulk operation row-by-row inside the same transaction. The resulting diagnostic
identifies the collection, exact row, converted values and Python types, and the
MariaDB driver error.

## Supported conversions

- IDs and counters become Python integers.
- Currency, rent, bedroom, and bathroom values become `Decimal` values.
- Boolean fields accept JSON booleans, `0`/`1`, and common true/false text.
- ISO calendar dates become native Python `date` values.
- ISO 8601 timestamps, including values ending in `Z`, become native Python
  `datetime` values; timezone-aware values are normalized to UTC for MariaDB.
- Empty nullable fields become SQL `NULL`.
- Scalar text fields accept strings and scalar numeric values.

## Exit status

- `0`: validation or import completed successfully
- `2`: backup structure, relationship, or value conversion failed
- `3`: database connection, schema, transaction, or MariaDB row failure
- `4`: unexpected internal error

Do not retire the Baseline 5.8 application or its original JSON backup until the
MariaDB record counts and financial control totals have been independently
verified.
