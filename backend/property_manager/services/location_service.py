from __future__ import annotations

from typing import Any

from ..database import transaction
from ..repositories.location_repository import LocationRepository


class LocationValidationError(ValueError):
    pass


class LocationNotFoundError(LookupError):
    pass


class LocationConflictError(RuntimeError):
    pass


class LocationService:
    def __init__(self, repository: LocationRepository | None = None) -> None:
        self.repository = repository or LocationRepository()

    def list_locations(self) -> list[dict[str, Any]]:
        return [self._serialize(row, True) for row in self.repository.list_locations()]

    def get_location(self, location_id: int) -> dict[str, Any]:
        row = self.repository.get_by_id(location_id)
        if row is None:
            raise LocationNotFoundError("Location not found.")
        return self._serialize(row)

    def create_location(self, payload: object) -> dict[str, Any]:
        values = self._validate(payload)
        with transaction() as connection:
            if self.repository.find_duplicate(connection, values["name"]):
                raise LocationConflictError("A location with that name already exists.")
            location_id = self.repository.next_id(connection)
            self.repository.insert(connection, location_id, values)
        return self.get_location(location_id)

    def update_location(self, location_id: int, payload: object) -> dict[str, Any]:
        values = self._validate(payload)
        with transaction() as connection:
            if not self.repository.exists(connection, location_id):
                raise LocationNotFoundError("Location not found.")
            if self.repository.find_duplicate(
                connection, values["name"], excluding_id=location_id
            ):
                raise LocationConflictError("A location with that name already exists.")
            self.repository.update(connection, location_id, values)
        return self.get_location(location_id)

    def delete_location(self, location_id: int) -> None:
        with transaction() as connection:
            if not self.repository.exists(connection, location_id):
                raise LocationNotFoundError("Location not found.")
            if self.repository.has_buildings(connection, location_id):
                raise LocationConflictError(
                    "Delete or move the buildings before deleting this location."
                )
            self.repository.delete(connection, location_id)

    @staticmethod
    def _validate(payload: object) -> dict[str, str]:
        if not isinstance(payload, dict):
            raise LocationValidationError("A JSON object is required.")
        name = str(payload.get("name", "")).strip()
        city = str(payload.get("city", "")).strip()
        if not name or not city:
            raise LocationValidationError("Location name and city are required.")
        return {"name": name, "city": city}

    @staticmethod
    def _serialize(
        row: dict[str, Any], include_projection: bool = False
    ) -> dict[str, Any]:
        result: dict[str, Any] = {
            "id": int(row["id"]),
            "name": row["name"],
            "city": row["city"],
        }
        if include_projection:
            result.update(
                {
                    "buildingCount": int(row["building_count"]),
                    "unitCount": int(row["unit_count"]),
                }
            )
        return result
