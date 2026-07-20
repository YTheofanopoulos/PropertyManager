from __future__ import annotations

import unittest
from contextlib import nullcontext
from decimal import Decimal
from unittest.mock import patch

from property_manager.services.unit_service import (
    UnitNotFoundError,
    UnitService,
    UnitValidationError,
)


class ReadOnlyFakeUnitRepository:
    def list_units(self):
        return [
            {
                "id": 7,
                "building_id": 2,
                "apartment_number": "4",
                "bedrooms": Decimal("2.0"),
                "bathrooms": Decimal("1.0"),
                "monthly_rent": Decimal("1100.00"),
                "status": "Occupied",
                "active": 1,
                "street": "Edouard-Charles",
                "civic_address": "383",
                "effective_rent": Decimal("1150.00"),
                "rent_source": "Active Lease",
            }
        ]

    def get_by_id(self, unit_id: int):
        if unit_id != 7:
            return None
        row = self.list_units()[0].copy()
        for key in ("street", "civic_address", "effective_rent", "rent_source"):
            row.pop(key)
        return row


class WritableFakeUnitRepository(ReadOnlyFakeUnitRepository):
    def __init__(self) -> None:
        self.inserted = None

    def building_exists(self, connection, building_id: int) -> bool:
        return building_id == 2

    def find_duplicate(self, connection, building_id, apartment_number):
        return None

    def next_id(self, connection) -> int:
        return 8

    def insert(self, connection, unit_id, values) -> None:
        self.inserted = {"id": unit_id, **values}

    def get_by_id(self, unit_id: int):
        if self.inserted and self.inserted["id"] == unit_id:
            return self.inserted
        return super().get_by_id(unit_id)


class UnitServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = UnitService(
            ReadOnlyFakeUnitRepository()  # type: ignore[arg-type]
        )

    def test_list_units_maps_database_fields_to_api_contract(self) -> None:
        units = self.service.list_units()
        self.assertEqual(units[0]["buildingId"], 2)
        self.assertEqual(units[0]["effectiveRent"], 1150.0)
        self.assertEqual(units[0]["rentSource"], "Active Lease")

    def test_get_missing_unit_raises_not_found(self) -> None:
        with self.assertRaises(UnitNotFoundError):
            self.service.get_unit(999)

    def test_invalid_payload_is_rejected(self) -> None:
        with self.assertRaises(UnitValidationError):
            self.service._validate(
                {
                    "buildingId": 2,
                    "apartmentNumber": "4",
                    "bedrooms": 2,
                    "bathrooms": 0,
                    "monthlyRent": 1100,
                    "status": "Occupied",
                }
            )

    def test_create_assigns_id_before_insert_and_returns_unit(self) -> None:
        repository = WritableFakeUnitRepository()
        service = UnitService(repository)  # type: ignore[arg-type]
        payload = {
            "buildingId": 2,
            "apartmentNumber": "5",
            "bedrooms": 2,
            "bathrooms": 1,
            "monthlyRent": 1200,
            "status": "Vacant",
        }
        with patch(
            "property_manager.services.unit_service.transaction",
            return_value=nullcontext(object()),
        ):
            created = service.create_unit(payload)

        self.assertEqual(created["id"], 8)
        self.assertEqual(created["apartmentNumber"], "5")


if __name__ == "__main__":
    unittest.main()
