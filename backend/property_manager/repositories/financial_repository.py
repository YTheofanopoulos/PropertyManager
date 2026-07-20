from __future__ import annotations

from decimal import Decimal

from ..database import read_connection


class FinancialRepository:
    @staticmethod
    def rows(sql, parameters=()):
        with read_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute(sql, parameters)
            rows = list(cursor.fetchall())
            cursor.close()
        return rows

    def list_payments(self):
        return self.rows("""SELECT p.*,COALESCE((SELECT SUM(pa.amount) FROM payment_allocations pa
            WHERE pa.payment_id=p.id),0) allocated,l.name location_name,
            b.civic_address,u.apartment_number FROM payments p JOIN leases le ON le.id=p.lease_id
            JOIN units u ON u.id=le.unit_id JOIN buildings b ON b.id=u.building_id
            JOIN locations l ON l.id=b.location_id ORDER BY p.received_date DESC,p.id DESC""")

    def list_credits(self):
        return self.rows("""SELECT p.*,COALESCE((SELECT SUM(pa.amount) FROM payment_allocations pa
            WHERE pa.payment_id=p.id),0) allocated,l.name location_name,
            b.civic_address,u.apartment_number,COALESCE((SELECT CONCAT(t.first_name,' ',t.last_name)
            FROM lease_participants lp JOIN tenants t ON t.id=lp.tenant_id WHERE lp.lease_id=p.lease_id
            ORDER BY lp.is_primary DESC,lp.sort_order,lp.id LIMIT 1),'—') tenant_name
            FROM payments p JOIN leases le ON le.id=p.lease_id JOIN units u ON u.id=le.unit_id
            JOIN buildings b ON b.id=u.building_id JOIN locations l ON l.id=b.location_id
            WHERE p.status='Posted' AND p.amount-COALESCE((SELECT SUM(px.amount)
            FROM payment_allocations px WHERE px.payment_id=p.id),0)>.005 ORDER BY p.received_date,p.id""")

    def obligations(self, lease_id=None):
        where = "WHERE ro.lease_id=?" if lease_id is not None else ""
        args = (lease_id,) if lease_id is not None else ()
        return self.rows(f"""SELECT ro.*,COALESCE(SUM(CASE WHEN p.status='Posted' THEN pa.amount ELSE 0 END),0) paid
            FROM rent_obligations ro LEFT JOIN payment_allocations pa ON pa.obligation_id=ro.id
            LEFT JOIN payments p ON p.id=pa.payment_id {where} GROUP BY ro.id ORDER BY ro.rent_period,ro.id""", args)

    def context(self):
        return {
            "leases": self.rows("SELECT * FROM leases ORDER BY start_date,id"),
            "charges": self.rows("SELECT * FROM recurring_charges ORDER BY lease_id,id"),
            "concessions": self.rows("SELECT * FROM lease_concessions ORDER BY lease_id,id"),
            "obligations": self.obligations(),
            "units": self.rows("""SELECT u.*,b.civic_address,b.location_id,l.name location_name FROM units u
                JOIN buildings b ON b.id=u.building_id JOIN locations l ON l.id=b.location_id ORDER BY u.id"""),
            "participants": self.rows("""SELECT lp.*,t.first_name,t.last_name,t.email,t.phone FROM lease_participants lp
                JOIN tenants t ON t.id=lp.tenant_id ORDER BY lp.lease_id,lp.is_primary DESC,lp.sort_order,lp.id"""),
            "payments": self.rows("SELECT * FROM payments ORDER BY id"),
            "allocations": self.rows("""SELECT pa.* FROM payment_allocations pa JOIN payments p ON p.id=pa.payment_id
                WHERE p.status='Posted' ORDER BY pa.id"""),
        }

    @staticmethod
    def next_id(connection, table):
        if table not in {"payments", "payment_allocations", "rent_obligations"}: raise ValueError("Unsupported table")
        cursor=connection.cursor(); cursor.execute(f"SELECT id FROM {table} ORDER BY id DESC LIMIT 1 FOR UPDATE")
        row=cursor.fetchone(); cursor.close(); return int(row[0])+1 if row else 1

    @staticmethod
    def one(connection, table, row_id):
        if table not in {"leases", "tenants", "payments", "rent_obligations"}: raise ValueError("Unsupported table")
        cursor=connection.cursor(dictionary=True); cursor.execute(f"SELECT * FROM {table} WHERE id=?",(row_id,))
        row=cursor.fetchone(); cursor.close(); return row

    @staticmethod
    def allocations_for(connection, column, row_id):
        if column not in {"payment_id", "obligation_id"}: raise ValueError("Unsupported column")
        cursor=connection.cursor(dictionary=True); cursor.execute(f"SELECT * FROM payment_allocations WHERE {column}=?",(row_id,))
        rows=list(cursor.fetchall()); cursor.close(); return rows

    @staticmethod
    def insert_payment(connection, payment_id, v):
        cursor=connection.cursor(); cursor.execute("""INSERT INTO payments
            (id,lease_id,tenant_id,received_date,amount,payment_method,reference,notes,source,status,created_at)
            VALUES (?,?,?,?,?,?,?,?,'Manual','Posted',UTC_TIMESTAMP(6))""",
            (payment_id,v["lease_id"],v["tenant_id"],v["received_date"],v["amount"],v["payment_method"],v["reference"],v["notes"])); cursor.close()

    @staticmethod
    def insert_allocations(connection, rows):
        if not rows: return
        cursor=connection.cursor(); cursor.executemany(
            "INSERT INTO payment_allocations(id,payment_id,obligation_id,amount) VALUES (?,?,?,?)",rows); cursor.close()

    @staticmethod
    def void_payment(connection, payment_id, reason):
        cursor=connection.cursor(); cursor.execute("DELETE FROM payment_allocations WHERE payment_id=?",(payment_id,))
        cursor.execute("UPDATE payments SET status='Voided',voided_at=UTC_TIMESTAMP(6),void_reason=? WHERE id=?",(reason,payment_id))
        cursor.execute("UPDATE bank_transactions SET matched_payment_id=NULL,status='Unmatched' WHERE matched_payment_id=?",(payment_id,)); cursor.close()

    @staticmethod
    def set_status(connection, obligation_id, expected, paid):
        epsilon=Decimal("0.005")
        status="Unpaid" if paid<=epsilon else "Partially Paid" if paid<expected-epsilon else "Paid" if paid<=expected+epsilon else "Overpaid"
        cursor=connection.cursor(); cursor.execute("UPDATE rent_obligations SET status=? WHERE id=?",(status,obligation_id)); cursor.close()

    @staticmethod
    def insert_obligation(connection, row_id, lease_id, period, expected):
        cursor=connection.cursor(); cursor.execute("""INSERT INTO rent_obligations
            (id,lease_id,rent_period,expected_amount,status,created_at) VALUES (?,?,?,?,'Unpaid',UTC_TIMESTAMP(6))""",
            (row_id,lease_id,period,expected)); cursor.close()
