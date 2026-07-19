# PropertyManager Baseline 5.8.1.1 Delta

Base version: Baseline 5.8.0

Included changes:
- Named JSON backups and sanitized filenames.
- Prominent backup notes in the Restore preview.
- HTTP development compatibility when `crypto.subtle` is unavailable.
- Concession Reason / Comment field.
- Editing of existing concession descriptions and comments.
- Immutable amount/start/end fields after a concession is recorded.
- Deletion blocked when settled payment allocations would be affected.
- Version update to 0.5.8.1.1 / Baseline 5.8.1.1.

Apply by copying this archive over the Baseline 5.8 source tree while preserving paths.
Then run from `frontend`:

    npm install
    npm run build

For deployment, replace the entire existing `frontend/dist` directory with the newly generated one. Do not merge old and new compiled assets.

This delta intentionally does not include a stale `dist` build. The build environment used to package this delta could not complete dependency installation; rebuilding locally guarantees the compiled files correspond to these source changes.
