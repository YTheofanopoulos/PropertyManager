# Release Manifest

- Application version: 6.2.0
- REST API version: v1
- Database schema version: 1
- Source baseline: 6.1.0
- Package type: Delta

## Added files

- `backend/property_manager/repositories/building_repository.py`
- `backend/property_manager/repositories/location_repository.py`
- `backend/property_manager/routes/buildings.py`
- `backend/property_manager/routes/locations.py`
- `backend/property_manager/services/building_service.py`
- `backend/property_manager/services/location_service.py`
- `backend/tests/test_building_service.py`
- `backend/tests/test_location_service.py`

## Modified files

- `backend/property_manager/__init__.py`
- `backend/property_manager/app_factory.py`
- `backend/property_manager/repositories/unit_repository.py`
- `backend/property_manager/routes/__init__.py`
- `backend/property_manager/services/unit_service.py`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/app/shell.ts`
- `frontend/src/features/buildings/page.ts`
- `frontend/src/features/locations/page.ts`
- `frontend/src/features/units/page.ts`
- `frontend/src/repositories/buildingRepository.ts`
- `frontend/src/repositories/locationRepository.ts`
- `frontend/src/repositories/repositoryConfiguration.ts`
- `frontend/src/services/backupService.ts`
- `frontend/src/services/buildingService.ts`
- `frontend/src/services/locationService.ts`
- `README.md`
- `CHANGELOG.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/DeveloperWorkflow.md`
- `docs/INSTALL.md`
- `RELEASE_MANIFEST.md`

## Removed files

- None

## Apply

Extract the archive directly into the root of an existing Baseline 6.1.0 project directory. The archive intentionally has no enclosing project folder.

No database schema migration is required. Rebuild the frontend after applying the source delta:

```bash
cd frontend
npm install
npm run build
```

Run `./scripts/start_dev.sh`, then verify the Locations, Buildings, and Units requests in the browser Network panel.
