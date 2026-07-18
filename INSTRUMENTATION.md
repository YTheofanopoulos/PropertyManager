# Baseline 5.6.4 Reconciliation Timing

Reconciliation timing remains available but is disabled by default.

Enable from the browser console:

```js
localStorage.setItem("pm.debug.reconciliationTiming", "true");
location.reload();
```

Disable it:

```js
localStorage.removeItem("pm.debug.reconciliationTiming");
location.reload();
```

The queue-classification timing now measures a batched classification pass that loads shared matching data once and scores transactions from in-memory maps.
