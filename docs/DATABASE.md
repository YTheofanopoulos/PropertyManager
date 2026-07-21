# Database Schema 2

Schema 1 maps all Baseline 5.8 backup collections to normalized InnoDB tables while preserving the original numeric IDs. Schema 2 adds lease renewal lineage and accepted proposal data.

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

## Lease renewal lineage

`leases.previous_lease_id` is a nullable self-reference. Its unique index permits at most one direct successor for a lease. `renewal_proposed_rent` stores the accepted proposal separately from current recurring charges, and `renewal_status` includes `Accepted`. Creating a successor never overwrites the source lease.
