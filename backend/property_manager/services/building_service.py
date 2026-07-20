from __future__ import annotations

from typing import Any

from ..database import transaction
from ..repositories.building_repository import BuildingRepository


class BuildingValidationError(ValueError):
    pass


class BuildingNotFoundError(LookupError):
    pass


class BuildingConflictError(RuntimeError):
    pass


class BuildingService:
    def __init__(self, repository: BuildingRepository | None = None) -> None:
        self.repository = repository or BuildingRepository()

    def list_buildings(self) -> list[dict[str, Any]]:
        return [self._serialize(row, True) for row in self.repository.list_buildings()]

    def get_building(self, building_id: int) -> dict[str, Any]:
        row = self.repository.get_by_id(building_id)
        if row is None:
            raise BuildingNotFoundError("Building not found.")
        return self._serialize(row)

    def create_building(self, payload: object) -> dict[str, Any]:
        values = self._validate(payload)
        with transaction() as connection:
            self._validate_relationships(connection, values)
            if self.repository.find_duplicate(
                connection, values["location_id"], values["civic_address"]
            ):
                raise BuildingConflictError(
                    "That civic address already exists at this location."
                )
            building_id = self.repository.next_id(connection)
            self.repository.insert(connection, building_id, values)
        return self.get_building(building_id)

    def update_building(self, building_id: int, payload: object) -> dict[str, Any]:
        values = self._validate(payload)
        with transaction() as connection:
            if not self.repository.exists(connection, building_id):
                raise BuildingNotFoundError("Building not found.")
            self._validate_relationships(connection, values)
            if self.repository.find_duplicate(
                connection,
                values["location_id"],
                values["civic_address"],
                excluding_id=building_id,
            ):
                raise BuildingConflictError(
                    "That civic address already exists at this location."
                )
            self.repository.update(connection, building_id, values)
        return self.get_building(building_id)

    def delete_building(self, building_id: int) -> None:
        with transaction() as connection:
            if not self.repository.exists(connection, building_id):
                raise BuildingNotFoundError("Building not found.")
            if self.repository.has_units(connection, building_id):
                raise BuildingConflictError(
                    "Delete or move the units before deleting this building."
                )
            self.repository.delete(connection, building_id)

    def _validate_relationships(
        self, connection: Any, values: dict[str, Any]
    ) -> None:
        if not self.repository.location_exists(connection, values["location_id"]):
            raise BuildingValidationError("The selected location does not exist.")

    @staticmethod
    def _validate(payload: object) -> dict[str, Any]:
        if not isinstance(payload, dict):
            raise BuildingValidationError("A JSON object is required.")
        try:
            location_id = int(payload.get("locationId", 0))
        except (TypeError, ValueError):
            raise BuildingValidationError("A location is required.") from None
        civic_address = str(payload.get("civicAddress", "")).strip()
        if location_id <= 0 or not civic_address:
            raise BuildingValidationError("Location and civic address are required.")
        return {
            "location_id": location_id,
            "civic_address": civic_address,
            "city": str(payload.get("city", "")).strip(),
            "state_province": str(payload.get("stateProvince", "")).strip(),
            "postal_code": str(payload.get("postalCode", "")).strip().upper(),
        }

    @staticmethod
    def _serialize(
        row: dict[str, Any], include_projection: bool = False
    ) -> dict[str, Any]:
        result: dict[str, Any] = {
            "id": int(row["id"]),
            "locationId": int(row["location_id"]),
            "civicAddress": row["civic_address"],
            "city": row["city"],
            "stateProvince": row["state_province"],
            "postalCode": row["postal_code"],
        }
        if include_projection:
            result.update(
                {"street": row["street"], "unitCount": int(row["unit_count"])}
            )
        return result
