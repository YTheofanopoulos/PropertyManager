
# ADR 0006: Rolling Rent Status Window

## Decision

The Rent Status command center defaults to a rolling four-month window:

- two months before the current month,
- the current month,
- one future month.

The future month supports visibility into early payments but never contributes
to arrears or Outstanding Today.

Users may display 4, 6, 9, or 12 months and move the complete window earlier or
later. The Today action restores the default window.

## Visual states

- Paid
- Partial
- Unpaid
- Paid Ahead
- Partial Prepayment
- Not Yet Due
- No Lease / Vacant

Monthly cells are intentionally compact and clickable. Detailed amounts and
payment allocations are shown on demand.
