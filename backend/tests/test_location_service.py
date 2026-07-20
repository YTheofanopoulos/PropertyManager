from __future__ import annotations

import unittest

from property_manager.services.location_service import (
    LocationNotFoundError,
    LocationService,
    LocationValidationError,
)


class ReadOnlyFakeLocationRepository:
    def list_locations(self):
        return [
            {
                "id": 1,
                "name": "Edouard-Charles",
                "city": "Montreal",
                "building_count": 4,
                "unit_count": 25,
            }
        ]

    def get_by_id(self, location_id: int):
        if location_id != 1:
            return None
        return {"id": 1, "name": "Edouard-Charles", "city": "Montreal"}


class LocationServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = LocationService(
            ReadOnlyFakeLocationRepository()  # type: ignore[arg-type]
        )

    def test_list_locations_maps_counts(self) -> None:
        locations = self.service.list_locations()
        self.assertEqual(locations[0]["buildingCount"], 4)
        self.assertEqual(locations[0]["unitCount"], 25)

    def test_get_missing_location_raises_not_found(self) -> None:
        with self.assertRaises(LocationNotFoundError):
            self.service.get_location(999)

    def test_name_and_city_are_required(self) -> None:
        with self.assertRaises(LocationValidationError):
            self.service._validate({"name": "", "city": "Montreal"})


if __name__ == "__main__":
    unittest.main()
