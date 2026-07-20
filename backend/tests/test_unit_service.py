from __future__ import annotations

import unittest
from decimal import Decimal

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


if __name__ == "__main__":
    unittest.main()
