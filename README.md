# PropertyManager — Baseline 5.8

Baseline 5.8 is the final browser-only workflow and reliability milestone before the 6.0 backend transition.

## Included

- Consistent two-decimal CAD formatting throughout the application
- Clear distinction between payment amount and allocation amount in Rent Status details
- XLSX Payment Receipts export with Payments, Monthly Summary, and Control Totals worksheets
- Existing lease lifecycle, reconciliation, payment, and historical playback functionality from 5.6
- Reconciliation instrumentation retained behind the local-storage debug flag

## Development

```bash
cd frontend
npm install
npm run dev
```

## Build

```bash
cd frontend
npm run build
```
