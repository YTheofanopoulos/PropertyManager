import unittest
from decimal import Decimal

from property_manager.services.financial_service import FinancialService, FinancialValidationError


class FinancialValidationTests(unittest.TestCase):
    def test_valid_payment_is_normalized(self):
        row=FinancialService._payment_input({"leaseId":7,"receivedDate":"2026-07-20","amount":1000,
            "paymentMethod":"Cheque","reference":"  R1 ","notes":" test ","allocations":[{"obligationId":9,"amount":500}]})
        self.assertEqual(row["lease_id"],7);self.assertEqual(row["amount"],Decimal("1000"));self.assertEqual(row["reference"],"R1")

    def test_zero_payment_is_rejected(self):
        with self.assertRaisesRegex(FinancialValidationError,"greater than zero"):
            FinancialService._payment_input({"leaseId":1,"receivedDate":"2026-07-20","amount":0,"paymentMethod":"Cash","allocations":[]})

    def test_invalid_method_is_rejected(self):
        with self.assertRaisesRegex(FinancialValidationError,"method"):
            FinancialService._payment_input({"leaseId":1,"receivedDate":"2026-07-20","amount":1,"paymentMethod":"Crypto","allocations":[]})

    def test_invalid_period_is_rejected(self):
        with self.assertRaisesRegex(FinancialValidationError,"YYYY-MM"):
            FinancialService._period("2026-13")

    def test_month_to_month_application(self):
        class Lease:
            status="Active";term_type="Month-to-Month"
            start_date=type("D",(),{"isoformat":lambda self:"2026-01-01"})()
            def __getitem__(self,key): return getattr(self,key)
        self.assertTrue(FinancialService._applies(Lease(),"2099-12"))


if __name__=="__main__": unittest.main()
