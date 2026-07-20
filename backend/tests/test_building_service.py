from __future__ import annotations

import unittest

from property_manager.services.building_service import (
    BuildingNotFoundError,
    BuildingService,
    BuildingValidationError,
)


class ReadOnlyFakeBuildingRepository:
    def list_buildings(self):
        return [
            {
                "id": 2,
                "location_id": 1,
                "civic_address": "383",
                "city": "Montreal",
                "state_province": "QC",
                "postal_code": "H2X 1Y4",
                "street": "Edouard-Charles",
                "unit_count": 4,
            }
        ]

    def get_by_id(self, building_id: int):
        if building_id != 2:
            return None
        row = self.list_buildings()[0].copy()
        row.pop("street")
        row.pop("unit_count")
        return row


class BuildingServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = BuildingService(
            ReadOnlyFakeBuildingRepository()  # type: ignore[arg-type]
        )

    def test_list_buildings_maps_projection(self) -> None:
        buildings = self.service.list_buildings()
        self.assertEqual(buildings[0]["locationId"], 1)
        self.assertEqual(buildings[0]["unitCount"], 4)
        self.assertEqual(buildings[0]["street"], "Edouard-Charles")

    def test_get_missing_building_raises_not_found(self) -> None:
        with self.assertRaises(BuildingNotFoundError):
            self.service.get_building(999)

    def test_location_and_civic_address_are_required(self) -> None:
        with self.assertRaises(BuildingValidationError):
            self.service._validate({"locationId": 0, "civicAddress": ""})


if __name__ == "__main__":
    unittest.main()
