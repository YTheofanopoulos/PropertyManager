from __future__ import annotations

from typing import Any

from ..database import read_connection


class LeaseRepository:
    def list_leases(self):
        with read_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT le.*, l.name AS street, b.civic_address,
                       u.apartment_number,
                       successor.id AS successor_lease_id,
                       COALESCE((SELECT SUM(rc.amount) FROM recurring_charges rc
                                  WHERE rc.lease_id=le.id
                                    AND rc.frequency='Monthly'), 0) AS monthly_total
                  FROM leases le JOIN units u ON u.id=le.unit_id
                  JOIN buildings b ON b.id=u.building_id
                  JOIN locations l ON l.id=b.location_id
                  LEFT JOIN leases successor ON successor.previous_lease_id=le.id
                 ORDER BY le.start_date DESC, le.id DESC
                """
            )
            leases = list(cursor.fetchall())
            cursor.execute(
                """SELECT lp.lease_id, t.first_name, t.last_name
                     FROM lease_participants lp JOIN tenants t ON t.id=lp.tenant_id
                    ORDER BY lp.lease_id, lp.is_primary DESC, lp.sort_order, lp.id"""
            )
            names: dict[int, list[str]] = {}
            for row in cursor.fetchall():
                names.setdefault(int(row["lease_id"]), []).append(
                    f"{row['first_name']} {row['last_name']}"
                )
            cursor.close()
        for lease in leases:
            lease["leaseholders"] = names.get(int(lease["id"]), [])
        return leases

    def get_by_id(self, lease_id):
        with read_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT * FROM leases WHERE id=?", (lease_id,))
            row = cursor.fetchone()
            cursor.close()
        return row

    def get_with_successor(self, lease_id):
        with read_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                """SELECT le.*, successor.id AS successor_lease_id
                     FROM leases le
                     LEFT JOIN leases successor ON successor.previous_lease_id=le.id
                    WHERE le.id=?""",
                (lease_id,),
            )
            row = cursor.fetchone()
            cursor.close()
        return row

    def get_related(self, table, lease_id):
        allowed = {
            "lease_participants": "SELECT * FROM lease_participants WHERE lease_id=? ORDER BY is_primary DESC, sort_order, id",
            "recurring_charges": "SELECT * FROM recurring_charges WHERE lease_id=? ORDER BY id",
            "lease_concessions": "SELECT * FROM lease_concessions WHERE lease_id=? ORDER BY start_period, id",
        }
        with read_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(allowed[table], (lease_id,))
            rows = list(cursor.fetchall())
            cursor.close()
        return rows

    def history(self, lease_id):
        with read_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(
                """SELECT le.id, le.previous_lease_id, le.start_date, le.end_date,
                          le.term_type, le.status, le.renewal_status,
                          COALESCE((SELECT SUM(rc.amount) FROM recurring_charges rc
                                    WHERE rc.lease_id=le.id AND rc.frequency='Monthly'),0) monthly_total
                     FROM leases le
                    WHERE le.unit_id=(SELECT unit_id FROM leases WHERE id=?)
                    ORDER BY le.start_date, le.id""",
                (lease_id,),
            )
            rows = list(cursor.fetchall())
            cursor.close()
        return rows

    @staticmethod
    def related(connection, table, lease_id):
        allowed = {
            "recurring_charges": "SELECT * FROM recurring_charges WHERE lease_id=? ORDER BY id",
            "lease_concessions": "SELECT * FROM lease_concessions WHERE lease_id=? ORDER BY id",
        }
        cursor = connection.cursor(dictionary=True)
        cursor.execute(allowed[table], (lease_id,))
        rows = list(cursor.fetchall())
        cursor.close()
        return rows

    @staticmethod
    def exists(connection, table, row_id):
        allowed = {"leases", "units", "tenants"}
        if table not in allowed: raise ValueError("Unsupported table")
        cursor = connection.cursor()
        cursor.execute(f"SELECT 1 FROM {table} WHERE id=? LIMIT 1", (row_id,))
        result = cursor.fetchone() is not None
        cursor.close()
        return result

    @staticmethod
    def next_id(connection, table):
        allowed = {"leases", "lease_participants", "recurring_charges", "lease_concessions"}
        if table not in allowed: raise ValueError("Unsupported table")
        cursor = connection.cursor()
        cursor.execute(f"SELECT id FROM {table} ORDER BY id DESC LIMIT 1 FOR UPDATE")
        row = cursor.fetchone()
        cursor.close()
        return int(row[0]) + 1 if row else 1

    @staticmethod
    def overlapping_unit(connection, unit_id, start, end, excluding_id):
        cursor = connection.cursor()
        cursor.execute(
            """SELECT id FROM leases WHERE unit_id=? AND id<>?
                 AND status IN ('Active','Future') AND start_date<=? AND end_date>=?
                 LIMIT 1""",
            (unit_id, excluding_id or 0, end, start),
        )
        row = cursor.fetchone()
        cursor.close()
        return int(row[0]) if row else None

    @staticmethod
    def overlapping_tenant(connection, tenant_id, start, end, excluding_id):
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """SELECT le.id, le.start_date, le.end_date FROM leases le
                 JOIN lease_participants lp ON lp.lease_id=le.id
                WHERE lp.tenant_id=? AND le.id<>? AND le.status IN ('Active','Future')
                  AND le.start_date<=? AND le.end_date>=? LIMIT 1""",
            (tenant_id, excluding_id or 0, end, start),
        )
        row = cursor.fetchone()
        cursor.close()
        return row

    @staticmethod
    def successor_id(connection, lease_id):
        cursor = connection.cursor()
        cursor.execute("SELECT id FROM leases WHERE previous_lease_id=?", (lease_id,))
        row = cursor.fetchone()
        cursor.close()
        return int(row[0]) if row else None

    @staticmethod
    def upsert_lease(connection, lease_id, values, creating):
        cursor = connection.cursor()
        columns = ("unit_id", "previous_lease_id", "start_date", "end_date", "term_type", "status",
                   "renewal_status", "renewal_proposed_rent", "renewal_letter_sent_date",
                   "renewal_response_date", "renewal_notes", "notes")
        args = tuple(values[column] for column in columns)
        if creating:
            cursor.execute(
                """INSERT INTO leases
                   (id,unit_id,previous_lease_id,start_date,end_date,term_type,status,renewal_status,
                    renewal_proposed_rent,renewal_letter_sent_date,renewal_response_date,renewal_notes,notes)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (lease_id, *args),
            )
        else:
            cursor.execute(
                """UPDATE leases SET unit_id=?,previous_lease_id=?,start_date=?,end_date=?,term_type=?,
                   status=?,renewal_status=?,renewal_proposed_rent=?,renewal_letter_sent_date=?,
                   renewal_response_date=?,renewal_notes=?,notes=? WHERE id=?""",
                (*args, lease_id),
            )
        cursor.close()

    @staticmethod
    def replace_participants(connection, lease_id, tenant_ids):
        cursor = connection.cursor()
        cursor.execute("DELETE FROM lease_participants WHERE lease_id=?", (lease_id,))
        next_id = LeaseRepository.next_id(connection, "lease_participants")
        cursor.executemany(
            """INSERT INTO lease_participants
               (id,lease_id,tenant_id,is_primary,sort_order) VALUES (?,?,?,?,?)""",
            [(next_id+i, lease_id, tenant_id, i == 0, i)
             for i, tenant_id in enumerate(tenant_ids)],
        )
        cursor.close()

    @staticmethod
    def replace_charges(connection, lease_id, charges, start, end):
        cursor = connection.cursor()
        cursor.execute("DELETE FROM recurring_charges WHERE lease_id=?", (lease_id,))
        rows = [charge for charge in charges if charge["amount"] > 0]
        next_id = LeaseRepository.next_id(connection, "recurring_charges")
        cursor.executemany(
            """INSERT INTO recurring_charges
               (id,lease_id,charge_type,description,amount,frequency,start_date,end_date)
               VALUES (?,?,?,?,?,'Monthly',?,?)""",
            [(next_id+i, lease_id, charge["charge_type"], charge["description"],
              charge["amount"], start, end) for i, charge in enumerate(rows)],
        )
        cursor.close()

    @staticmethod
    def concessions(connection, lease_id):
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM lease_concessions WHERE lease_id=?", (lease_id,))
        rows = list(cursor.fetchall())
        cursor.close()
        return rows

    @staticmethod
    def concession_has_allocations(connection, lease_id, start_period, end_period):
        cursor = connection.cursor()
        cursor.execute(
            """SELECT 1 FROM rent_obligations ro JOIN payment_allocations pa
                 ON pa.obligation_id=ro.id WHERE ro.lease_id=?
                 AND ro.rent_period BETWEEN ? AND ? LIMIT 1""",
            (lease_id, start_period, end_period),
        )
        result = cursor.fetchone() is not None
        cursor.close()
        return result

    @staticmethod
    def sync_concessions(connection, lease_id, incoming, existing):
        cursor = connection.cursor()
        incoming_ids = {item["id"] for item in incoming if item.get("id")}
        for item in existing:
            if item["id"] not in incoming_ids:
                cursor.execute("DELETE FROM lease_concessions WHERE id=?", (item["id"],))
        next_id = LeaseRepository.next_id(connection, "lease_concessions")
        for item in incoming:
            if item.get("id"):
                cursor.execute(
                    "UPDATE lease_concessions SET description=?,comment=? WHERE id=?",
                    (item["description"], item["comment"], item["id"]),
                )
            else:
                cursor.execute(
                    """INSERT INTO lease_concessions
                       (id,lease_id,description,amount,start_period,end_period,comment)
                       VALUES (?,?,?,?,?,?,?)""",
                    (next_id, lease_id, item["description"], item["amount"],
                     item["start_period"], item["end_period"], item["comment"]),
                )
                next_id += 1
        cursor.close()

    @staticmethod
    def obligations(connection, lease_id):
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """SELECT ro.*,
                      COALESCE((SELECT SUM(pa.amount) FROM payment_allocations pa
                                 WHERE pa.obligation_id=ro.id),0) paid
                 FROM rent_obligations ro WHERE ro.lease_id=?""",
            (lease_id,),
        )
        rows = list(cursor.fetchall())
        cursor.close()
        return rows

    @staticmethod
    def update_obligation(connection, obligation_id, expected, status):
        cursor = connection.cursor()
        cursor.execute("UPDATE rent_obligations SET expected_amount=?,status=? WHERE id=?",
                       (expected, status, obligation_id))
        cursor.close()

    @staticmethod
    def delete_obligation(connection, obligation_id):
        cursor = connection.cursor()
        cursor.execute("DELETE FROM rent_obligations WHERE id=?", (obligation_id,))
        cursor.close()

    @staticmethod
    def set_lease_status(connection, lease_id, status):
        cursor = connection.cursor()
        cursor.execute("UPDATE leases SET status=? WHERE id=?", (status, lease_id))
        cursor.close()

    @staticmethod
    def complete_renewal(connection, lease_id):
        cursor = connection.cursor()
        cursor.execute("UPDATE leases SET renewal_status='Renewed' WHERE id=?", (lease_id,))
        cursor.close()

    @staticmethod
    def refresh_unit(connection, unit_id, today):
        cursor = connection.cursor()
        cursor.execute(
            """SELECT 1 FROM leases WHERE unit_id=? AND status<>'Terminated'
                 AND start_date<=? AND end_date>=? LIMIT 1""",
            (unit_id, today, today),
        )
        occupied = cursor.fetchone() is not None
        cursor.execute("UPDATE units SET status=? WHERE id=?",
                       ("Occupied" if occupied else "Vacant", unit_id))
        cursor.close()
