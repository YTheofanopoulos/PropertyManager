
# ADR 0007: Payment Receipt Report Uses Transaction Month

## Decision

The Payment Receipts report groups the complete payment amount by the month of
`Payment.receivedDate`.

For QFX-reconciled payments, `Payment.receivedDate` is copied from the bank
transaction's posted date. Manual payments use the date entered by the user.

Rent-period allocations are intentionally ignored when choosing the report
month. A payment processed on July 30 for August rent is therefore reported in
July, allowing accounting totals to reconcile directly to July bank activity.

Voided payments are excluded from receipt totals and disclosed separately.
