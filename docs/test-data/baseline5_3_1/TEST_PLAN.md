
# Baseline 5.3.1 Assisted Matching Test Plan

## Controlled building

- 383-1 Edouard-Charles — $636
- 383-2 Edouard-Charles — $1,045
- 383-3 Edouard-Charles — $1,081
- 383-4 Edouard-Charles — vacant and must never appear as a candidate

## Procedure

1. Reset Sample Data.
2. Import Month 1 and inspect diagnostics before manually reconciling all three.
3. Import Month 2. Reconcile the $600 payment to 383-3 before inspecting the $481 payment.
4. Import Month 3 and compare every classification with its expected CSV.
5. Confirm that amount equality alone never creates High Confidence.
6. Confirm that tied or conflicting evidence is labeled Ambiguous.
7. Confirm that no transaction is ever reconciled automatically.

## Scoring

- +25 exact outstanding balance
- +25 same amount in prior reconciliation history
- +20 same normalized memo
- +15 same normalized transaction name
- +10 posting day within three days of prior history
- +5 any prior reconciliation history for the unit

High Confidence requires at least 70 points, prior history, and a clear lead of at
least 15 points. A tie, small lead, or duplicate amount without distinguishing
history becomes Ambiguous.
