# PropertyManager — Baseline 5.7

Baseline 5.7 builds on the validated 5.6 accounting baseline.

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
