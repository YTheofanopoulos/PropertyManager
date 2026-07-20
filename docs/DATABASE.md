# Database Schema 1

Schema 1 maps all Baseline 5.8 backup collections to normalized InnoDB tables while preserving the original numeric IDs.

Core hierarchy:

```text
locations -> buildings -> units -> leases
                               -> lease_participants -> tenants
                               -> recurring_charges
                               -> lease_concessions
                               -> rent_obligations
```

Financial hierarchy:

```text
payments -> payment_allocations -> rent_obligations
bank_import_batches -> bank_transactions -> payments
reconciliation_history -> bank_transactions, payments, leases
```

All currency values use fixed-point `DECIMAL`, never floating-point database types. Dates use `DATE`; timestamps use `DATETIME(6)`.

`schema_migrations` records independently applied database migrations. Application startup reports both the expected and installed schema versions through `/api/v1/system/health`.
