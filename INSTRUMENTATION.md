# Baseline 5.6.3.1 Reconciliation Instrumentation

Open the browser developer tools and select the **Console** tab before reconciling a transaction.

Each reconciliation produces a collapsed console group such as:

```text
[Reconcile 123-abc] Transaction 123
```

Expand the group to review timings for:

- transaction lookup
- obligation lookup and validation
- IndexedDB write transaction
- reconciliation service total
- modal dismissal
- queue data loading
- transaction classification / matching suggestions
- DataTable initialization
- Bank Import queue refresh
- total click-to-ready time

The trace identifier links all entries from the same reconciliation. Capture or copy the expanded group after several reconciliations so the slowest phase can be identified. This build changes no reconciliation rules or saved data.
