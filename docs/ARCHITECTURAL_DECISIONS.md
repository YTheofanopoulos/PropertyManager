\
        # PropertyManager Architectural Decisions

        This document records product and accounting decisions that affect
        implementation across multiple baselines.

        ## AD-001: Lease is the authoritative rent source

        The active lease defines the contractual monthly rent. Unit views display
        the active lease rent when an active lease exists and Market Rent when no
        active lease exists.

        ## AD-002: Rent periods are independent from transaction dates

        A payment can be received before or after the rent period it satisfies.
        Allocations identify the rent period paid; the payment transaction date
        records when the money was processed.

        ## AD-003: Outstanding rent is based on today

        Current outstanding and arrears include only unpaid rent obligations due
        through the current month. A future bank transaction date must not create
        future arrears.

        ## AD-004: Preserve the accounting transaction date

        QFX bank-posted dates and manually entered received dates are retained
        unchanged for accounting and audit purposes.

        ## AD-005: Payment Receipts reports by transaction month

        The Payment Receipts report groups payments by transaction date, not by
        rent period. An early payment processed on July 30 for August rent is
        reported in July.

        ## AD-006: Reconciliation remains user-confirmed

        Assisted matching may rank and explain candidates but never automatically
        reconciles a bank transaction. Amount alone is insufficient evidence for
        a high-confidence match.

        ## AD-007: QFX is the preferred statement format

        QFX provides FITIDs, posted dates, references, names, and memos needed for
        duplicate detection and reliable reconciliation. CSV import is deferred
        because typical CSV exports omit important accounting metadata.

        ## AD-008: Voiding reverses allocations

        A voided payment is excluded from financial totals and its allocations are
        removed so the applicable rent obligations become outstanding again.

        ## AD-009: Rent Status is read-only

        Rent Status is a scanning and drill-down dashboard. Payment entry and
        allocation remain in Rent Roll and Payments to avoid duplicating workflows.

        ## AD-010: Maintenance remains deferred

        Maintenance is not a core requirement for the current portfolio and remains
        planned for Baseline 7.0 or later.
