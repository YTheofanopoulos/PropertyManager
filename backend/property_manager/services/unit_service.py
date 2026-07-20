from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

from ..database import transaction
from ..repositories.unit_repository import UnitRepository

VALID_STATUSES = {"Occupied", "Vacant", "Maintenance"}


class UnitValidationError(ValueError):
    pass


class UnitNotFoundError(LookupError):
    pass


class UnitConflictError(RuntimeError):
    pass


class UnitService:
    def __init__(self, repository: UnitRepository | None = None) -> None:
        self.repository = repository or UnitRepository()

    def list_units(self) -> list[dict[str, Any]]:
        return [
            self._serialize(row, include_projection=True)
            for row in self.repository.list_units()
        ]

    def get_unit(self, unit_id: int) -> dict[str, Any]:
        row = self.repository.get_by_id(unit_id)
        if row is None:
            raise UnitNotFoundError("Unit not found.")
        return self._serialize(row)

    def create_unit(self, payload: object) -> dict[str, Any]:
        values = self._validate(payload)
        with transaction() as connection:
            if not self.repository.building_exists(connection, values["building_id"]):
                raise UnitValidationError("The selected building does not exist.")
            if self.repository.find_duplicate(
                connection, values["building_id"], values["apartment_number"]
            ):
                raise UnitConflictError(
                    "That apartment already exists in this building."
                )
            unit_id = self.repository.next_id(connection)
            self.repository.insert(connection, unit_id, values)
        return self.get_unit(unit_id)

    def update_unit(self, unit_id: int, payload: object) -> dict[str, Any]:
        values = self._validate(payload)
        with transaction() as connection:
            if not self.repository.building_exists(connection, values["building_id"]):
                raise UnitValidationError("The selected building does not exist.")
            if self.repository.find_duplicate(
                connection,
                values["building_id"],
                values["apartment_number"],
                excluding_id=unit_id,
            ):
                raise UnitConflictError(
                    "That apartment already exists in this building."
                )
            if not self.repository.update(connection, unit_id, values):
                raise UnitNotFoundError("Unit not found.")
        return self.get_unit(unit_id)

    def delete_unit(self, unit_id: int) -> None:
        with transaction() as connection:
            if self.repository.has_lease_history(connection, unit_id):
                raise UnitConflictError("A unit with lease history cannot be deleted.")
            if not self.repository.delete(connection, unit_id):
                raise UnitNotFoundError("Unit not found.")

    @staticmethod
    def _validate(payload: object) -> dict[str, Any]:
        if not isinstance(payload, dict):
            raise UnitValidationError("A JSON object is required.")
        try:
            building_id = int(payload.get("buildingId", 0))
            bedrooms = Decimal(str(payload.get("bedrooms")))
            bathrooms = Decimal(str(payload.get("bathrooms")))
            monthly_rent = Decimal(str(payload.get("monthlyRent")))
        except (InvalidOperation, TypeError, ValueError):
            raise UnitValidationError(
                "Unit numbers and rent must be valid numeric values."
            ) from None

        apartment_number = str(payload.get("apartmentNumber", "")).strip()
        status = str(payload.get("status", ""))
        if building_id <= 0:
            raise UnitValidationError("A building is required.")
        if bedrooms < 0 or bathrooms <= 0:
            raise UnitValidationError("Bedroom and bathroom values are invalid.")
        if monthly_rent < 0:
            raise UnitValidationError("Monthly rent cannot be negative.")
        if status not in VALID_STATUSES:
            raise UnitValidationError("Unit status is invalid.")
        return {
            "building_id": building_id,
            "apartment_number": apartment_number,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "monthly_rent": monthly_rent,
            "status": status,
            "active": bool(payload.get("active", True)),
        }

    @staticmethod
    def _serialize(
        row: dict[str, Any], include_projection: bool = False
    ) -> dict[str, Any]:
        result: dict[str, Any] = {
            "id": int(row["id"]),
            "buildingId": int(row["building_id"]),
            "apartmentNumber": row["apartment_number"],
            "bedrooms": float(row["bedrooms"]),
            "bathrooms": float(row["bathrooms"]),
            "monthlyRent": float(row["monthly_rent"]),
            "status": row["status"],
            "active": bool(row["active"]),
        }
        if include_projection:
            result.update(
                {
                    "street": row["street"],
                    "civicAddress": row["civic_address"],
                    "effectiveRent": float(row["effective_rent"]),
                    "rentSource": row["rent_source"],
                }
            )
        return result
