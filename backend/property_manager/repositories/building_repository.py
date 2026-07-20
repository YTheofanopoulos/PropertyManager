from __future__ import annotations

from typing import Any

from ..database import read_connection


class BuildingRepository:
    def list_buildings(self) -> list[dict[str, Any]]:
        with read_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT b.id, b.location_id, b.civic_address, b.city,
                       b.state_province, b.postal_code, l.name AS street,
                       COUNT(u.id) AS unit_count
                  FROM buildings AS b
                  JOIN locations AS l ON l.id = b.location_id
                  LEFT JOIN units AS u ON u.building_id = b.id
                 GROUP BY b.id, b.location_id, b.civic_address, b.city,
                          b.state_province, b.postal_code, l.name
                 ORDER BY l.name, b.civic_address, b.id
                """
            )
            rows = list(cursor.fetchall())
            cursor.close()
        return rows

    def get_by_id(self, building_id: int) -> dict[str, Any] | None:
        with read_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT id, location_id, civic_address, city,
                       state_province, postal_code
                  FROM buildings
                 WHERE id = ?
                """,
                (building_id,),
            )
            row = cursor.fetchone()
            cursor.close()
        return row

    @staticmethod
    def exists(connection: Any, building_id: int) -> bool:
        cursor = connection.cursor()
        cursor.execute("SELECT 1 FROM buildings WHERE id = ? LIMIT 1", (building_id,))
        exists = cursor.fetchone() is not None
        cursor.close()
        return exists

    @staticmethod
    def location_exists(connection: Any, location_id: int) -> bool:
        cursor = connection.cursor()
        cursor.execute("SELECT 1 FROM locations WHERE id = ? LIMIT 1", (location_id,))
        exists = cursor.fetchone() is not None
        cursor.close()
        return exists

    @staticmethod
    def find_duplicate(
        connection: Any,
        location_id: int,
        civic_address: str,
        excluding_id: int | None = None,
    ) -> int | None:
        cursor = connection.cursor()
        sql = """
            SELECT id FROM buildings
             WHERE location_id = ? AND LOWER(civic_address) = LOWER(?)
        """
        parameters: list[Any] = [location_id, civic_address]
        if excluding_id is not None:
            sql += " AND id <> ?"
            parameters.append(excluding_id)
        cursor.execute(sql, parameters)
        row = cursor.fetchone()
        cursor.close()
        return int(row[0]) if row else None

    @staticmethod
    def next_id(connection: Any) -> int:
        cursor = connection.cursor()
        cursor.execute("SELECT id FROM buildings ORDER BY id DESC LIMIT 1 FOR UPDATE")
        row = cursor.fetchone()
        cursor.close()
        return int(row[0]) + 1 if row else 1

    @staticmethod
    def insert(connection: Any, building_id: int, values: dict[str, Any]) -> None:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO buildings (
                id, location_id, civic_address, city, state_province, postal_code
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                building_id,
                values["location_id"],
                values["civic_address"],
                values["city"],
                values["state_province"],
                values["postal_code"],
            ),
        )
        cursor.close()

    @staticmethod
    def update(connection: Any, building_id: int, values: dict[str, Any]) -> None:
        cursor = connection.cursor()
        cursor.execute(
            """
            UPDATE buildings
               SET location_id = ?, civic_address = ?, city = ?,
                   state_province = ?, postal_code = ?
             WHERE id = ?
            """,
            (
                values["location_id"],
                values["civic_address"],
                values["city"],
                values["state_province"],
                values["postal_code"],
                building_id,
            ),
        )
        cursor.close()

    @staticmethod
    def has_units(connection: Any, building_id: int) -> bool:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT 1 FROM units WHERE building_id = ? LIMIT 1", (building_id,)
        )
        exists = cursor.fetchone() is not None
        cursor.close()
        return exists

    @staticmethod
    def delete(connection: Any, building_id: int) -> None:
        cursor = connection.cursor()
        cursor.execute("DELETE FROM buildings WHERE id = ?", (building_id,))
        cursor.close()
