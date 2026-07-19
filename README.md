# PropertyManager Baseline 5.8.2 UI Enhancement Delta

Apply over the existing Baseline 5.8.2 source tree.

## Included

- Collapsible Portfolio, Residents, Financial, Reports, and Administration menu sections.
- Independently scrollable left navigation for smaller-height displays.
- Expanded/collapsed section state stored in local storage.
- The section containing the active route opens automatically.
- Recurring charge inputs show a dollar prefix and normalize to two decimal places when focus leaves the field.
- Updated CHANGELOG.md.

## Build

After copying the delta, run from `frontend`:

```bash
npm install
npm run build
```

The archive contains source changes only; `node_modules`, `.git`, and generated build output are excluded.
