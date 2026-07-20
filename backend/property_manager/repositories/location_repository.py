from __future__ import annotations

from typing import Any

from ..database import read_connection


class LocationRepository:
    def list_locations(self) -> list[dict[str, Any]]:
        with read_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT l.id, l.name, l.city,
                       COUNT(DISTINCT b.id) AS building_count,
                       COUNT(DISTINCT u.id) AS unit_count
                  FROM locations AS l
                  LEFT JOIN buildings AS b ON b.location_id = l.id
                  LEFT JOIN units AS u ON u.building_id = b.id
                 GROUP BY l.id, l.name, l.city
                 ORDER BY l.name, l.id
                """
            )
            rows = list(cursor.fetchall())
            cursor.close()
        return rows

    def get_by_id(self, location_id: int) -> dict[str, Any] | None:
        with read_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                "SELECT id, name, city FROM locations WHERE id = ?",
                (location_id,),
            )
            row = cursor.fetchone()
            cursor.close()
        return row

    @staticmethod
    def exists(connection: Any, location_id: int) -> bool:
        cursor = connection.cursor()
        cursor.execute("SELECT 1 FROM locations WHERE id = ? LIMIT 1", (location_id,))
        exists = cursor.fetchone() is not None
        cursor.close()
        return exists

    @staticmethod
    def find_duplicate(
        connection: Any, name: str, excluding_id: int | None = None
    ) -> int | None:
        cursor = connection.cursor()
        sql = "SELECT id FROM locations WHERE LOWER(name) = LOWER(?)"
        parameters: list[Any] = [name]
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
        cursor.execute("SELECT id FROM locations ORDER BY id DESC LIMIT 1 FOR UPDATE")
        row = cursor.fetchone()
        cursor.close()
        return int(row[0]) + 1 if row else 1

    @staticmethod
    def insert(connection: Any, location_id: int, values: dict[str, str]) -> None:
        cursor = connection.cursor()
        cursor.execute(
            "INSERT INTO locations (id, name, city) VALUES (?, ?, ?)",
            (location_id, values["name"], values["city"]),
        )
        cursor.close()

    @staticmethod
    def update(
        connection: Any, location_id: int, values: dict[str, str]
    ) -> None:
        cursor = connection.cursor()
        cursor.execute(
            "UPDATE locations SET name = ?, city = ? WHERE id = ?",
            (values["name"], values["city"], location_id),
        )
        cursor.close()

    @staticmethod
    def has_buildings(connection: Any, location_id: int) -> bool:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT 1 FROM buildings WHERE location_id = ? LIMIT 1", (location_id,)
        )
        exists = cursor.fetchone() is not None
        cursor.close()
        return exists

    @staticmethod
    def delete(connection: Any, location_id: int) -> None:
        cursor = connection.cursor()
        cursor.execute("DELETE FROM locations WHERE id = ?", (location_id,))
        cursor.close()
