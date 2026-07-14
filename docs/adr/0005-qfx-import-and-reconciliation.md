
# ADR 0005: QFX import and rent reconciliation

## Decision

QFX is the primary bank-import format for Baseline 5.2. Imported bank
transactions remain separate from rent payments until the user confirms a
reconciliation.

Duplicate detection uses the bank account identity plus QFX FITID.

## Reconciliation

Confirming a match atomically creates the payment and allocations, links the
bank transaction, and marks it reconciled. Amount matching provides suggestions
only; it never automatically chooses a unit.

Voiding an imported payment removes its allocations and returns the source bank
transaction to the unmatched queue.
