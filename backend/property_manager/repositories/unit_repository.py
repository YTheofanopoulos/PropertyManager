from __future__ import annotations

from decimal import Decimal
from typing import Any

from ..database import read_connection


class UnitRepository:
    """Persistence operations for units and their list-page projections."""

    def list_units(self) -> list[dict[str, Any]]:
        with read_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT u.id,
                       u.building_id,
                       u.apartment_number,
                       u.bedrooms,
                       u.bathrooms,
                       u.monthly_rent,
                       u.status,
                       u.active,
                       b.civic_address,
                       l.name AS street
                  FROM units AS u
                  JOIN buildings AS b ON b.id = u.building_id
                  JOIN locations AS l ON l.id = b.location_id
                 ORDER BY l.name, b.civic_address, u.apartment_number, u.id
                """
            )
            units = list(cursor.fetchall())

            cursor.execute(
                """
                SELECT le.unit_id, rc.amount
                  FROM leases AS le
                  JOIN recurring_charges AS rc
                    ON rc.lease_id = le.id
                   AND rc.charge_type = 'Apartment Rent'
                   AND rc.frequency = 'Monthly'
                   AND rc.start_date <= CURRENT_DATE()
                   AND (rc.end_date IS NULL OR rc.end_date >= CURRENT_DATE())
                 WHERE le.status NOT IN ('Expired', 'Terminated')
                   AND le.start_date <= CURRENT_DATE()
                   AND (
                       le.term_type = 'Month-to-Month'
                       OR le.end_date >= CURRENT_DATE()
                   )
                 ORDER BY le.unit_id, le.start_date DESC, rc.start_date DESC, rc.id DESC
                """
            )
            active_rents: dict[int, Decimal] = {}
            for row in cursor.fetchall():
                active_rents.setdefault(int(row["unit_id"]), row["amount"])
            cursor.close()

        for unit in units:
            active_rent = active_rents.get(int(unit["id"]))
            unit["effective_rent"] = (
                active_rent if active_rent is not None else unit["monthly_rent"]
            )
            unit["rent_source"] = (
                "Active Lease" if active_rent is not None else "Market Rent"
            )
        return units

    def get_by_id(self, unit_id: int) -> dict[str, Any] | None:
        with read_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT id, building_id, apartment_number, bedrooms, bathrooms,
                       monthly_rent, status, active
                  FROM units
                 WHERE id = ?
                """,
                (unit_id,),
            )
            row = cursor.fetchone()
            cursor.close()
        return row

    @staticmethod
    def find_duplicate(
        connection: Any,
        building_id: int,
        apartment_number: str,
        excluding_id: int | None = None,
    ) -> int | None:
        cursor = connection.cursor()
        sql = """
            SELECT id FROM units
             WHERE building_id = ? AND LOWER(apartment_number) = LOWER(?)
        """
        parameters: list[Any] = [building_id, apartment_number]
        if excluding_id is not None:
            sql += " AND id <> ?"
            parameters.append(excluding_id)
        cursor.execute(sql, parameters)
        row = cursor.fetchone()
        cursor.close()
        return int(row[0]) if row else None

    @staticmethod
    def building_exists(connection: Any, building_id: int) -> bool:
        cursor = connection.cursor()
        cursor.execute("SELECT 1 FROM buildings WHERE id = ? LIMIT 1", (building_id,))
        exists = cursor.fetchone() is not None
        cursor.close()
        return exists

    @staticmethod
    def exists(connection: Any, unit_id: int) -> bool:
        cursor = connection.cursor()
        cursor.execute("SELECT 1 FROM units WHERE id = ? LIMIT 1", (unit_id,))
        exists = cursor.fetchone() is not None
        cursor.close()
        return exists

    @staticmethod
    def next_id(connection: Any) -> int:
        cursor = connection.cursor()
        cursor.execute("SELECT id FROM units ORDER BY id DESC LIMIT 1 FOR UPDATE")
        row = cursor.fetchone()
        cursor.close()
        return (int(row[0]) + 1) if row else 1

    @staticmethod
    def insert(connection: Any, unit_id: int, values: dict[str, Any]) -> None:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO units (
                id, building_id, apartment_number, bedrooms, bathrooms,
                monthly_rent, status, active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                unit_id,
                values["building_id"],
                values["apartment_number"],
                values["bedrooms"],
                values["bathrooms"],
                values["monthly_rent"],
                values["status"],
                values["active"],
            ),
        )
        cursor.close()

    @staticmethod
    def update(connection: Any, unit_id: int, values: dict[str, Any]) -> None:
        cursor = connection.cursor()
        cursor.execute(
            """
            UPDATE units
               SET building_id = ?, apartment_number = ?, bedrooms = ?,
                   bathrooms = ?, monthly_rent = ?, status = ?, active = ?
             WHERE id = ?
            """,
            (
                values["building_id"],
                values["apartment_number"],
                values["bedrooms"],
                values["bathrooms"],
                values["monthly_rent"],
                values["status"],
                values["active"],
                unit_id,
            ),
        )
        cursor.close()

    @staticmethod
    def has_lease_history(connection: Any, unit_id: int) -> bool:
        cursor = connection.cursor()
        cursor.execute("SELECT 1 FROM leases WHERE unit_id = ? LIMIT 1", (unit_id,))
        exists = cursor.fetchone() is not None
        cursor.close()
        return exists

    @staticmethod
    def delete(connection: Any, unit_id: int) -> bool:
        cursor = connection.cursor()
        cursor.execute("DELETE FROM units WHERE id = ?", (unit_id,))
        deleted = cursor.rowcount > 0
        cursor.close()
        return deleted
