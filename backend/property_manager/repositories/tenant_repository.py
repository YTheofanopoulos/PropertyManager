from __future__ import annotations

from typing import Any

from ..database import read_connection


class TenantRepository:
    def list_tenants(self) -> list[dict[str, Any]]:
        with read_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT t.id, t.first_name, t.last_name, t.email, t.phone, t.active,
                       COUNT(DISTINCT CASE WHEN lp.is_primary THEN lp.lease_id END)
                           AS primary_lease_count
                  FROM tenants AS t
                  LEFT JOIN lease_participants AS lp ON lp.tenant_id = t.id
                 GROUP BY t.id, t.first_name, t.last_name, t.email, t.phone, t.active
                 ORDER BY t.last_name, t.first_name, t.id
                """
            )
            tenants = list(cursor.fetchall())
            cursor.execute(
                """
                SELECT lp.tenant_id, b.civic_address, u.apartment_number, l.name
                  FROM lease_participants AS lp
                  JOIN leases AS le ON le.id = lp.lease_id
                  JOIN units AS u ON u.id = le.unit_id
                  JOIN buildings AS b ON b.id = u.building_id
                  JOIN locations AS l ON l.id = b.location_id
                 ORDER BY lp.tenant_id, le.start_date, lp.sort_order
                """
            )
            apartments: dict[int, list[str]] = {}
            for row in cursor.fetchall():
                label = row["civic_address"]
                if row["apartment_number"]:
                    label += f" {row['apartment_number']}"
                label += f" {row['name']}"
                apartments.setdefault(int(row["tenant_id"]), []).append(label)
            cursor.close()
        for tenant in tenants:
            tenant["apartments"] = apartments.get(int(tenant["id"]), [])
        return tenants

    def get_by_id(self, tenant_id: int) -> dict[str, Any] | None:
        with read_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                """SELECT id, first_name, last_name, email, phone, active
                     FROM tenants WHERE id = ?""",
                (tenant_id,),
            )
            row = cursor.fetchone()
            cursor.close()
        return row

    @staticmethod
    def exists(connection: Any, tenant_id: int) -> bool:
        cursor = connection.cursor()
        cursor.execute("SELECT 1 FROM tenants WHERE id = ? LIMIT 1", (tenant_id,))
        result = cursor.fetchone() is not None
        cursor.close()
        return result

    @staticmethod
    def find_email(connection: Any, email: str, excluding_id=None):
        cursor = connection.cursor()
        sql = "SELECT id FROM tenants WHERE LOWER(email) = LOWER(?)"
        values: list[Any] = [email]
        if excluding_id is not None:
            sql += " AND id <> ?"
            values.append(excluding_id)
        cursor.execute(sql, values)
        row = cursor.fetchone()
        cursor.close()
        return int(row[0]) if row else None

    @staticmethod
    def next_id(connection: Any) -> int:
        cursor = connection.cursor()
        cursor.execute("SELECT id FROM tenants ORDER BY id DESC LIMIT 1 FOR UPDATE")
        row = cursor.fetchone()
        cursor.close()
        return int(row[0]) + 1 if row else 1

    @staticmethod
    def insert(connection: Any, tenant_id: int, values: dict[str, Any]) -> None:
        cursor = connection.cursor()
        cursor.execute(
            """INSERT INTO tenants
               (id, first_name, last_name, email, phone, active)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (tenant_id, *values.values()),
        )
        cursor.close()

    @staticmethod
    def update(connection: Any, tenant_id: int, values: dict[str, Any]) -> None:
        cursor = connection.cursor()
        cursor.execute(
            """UPDATE tenants SET first_name=?, last_name=?, email=?, phone=?, active=?
                 WHERE id=?""",
            (*values.values(), tenant_id),
        )
        cursor.close()

    @staticmethod
    def has_leases(connection: Any, tenant_id: int) -> bool:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT 1 FROM lease_participants WHERE tenant_id = ? LIMIT 1",
            (tenant_id,),
        )
        result = cursor.fetchone() is not None
        cursor.close()
        return result

    @staticmethod
    def delete(connection: Any, tenant_id: int) -> None:
        cursor = connection.cursor()
        cursor.execute("DELETE FROM tenants WHERE id = ?", (tenant_id,))
        cursor.close()
