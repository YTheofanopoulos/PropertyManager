import unittest
from datetime import date,datetime
from decimal import Decimal
from property_manager.services.bank_service import BankService

class BankServiceTests(unittest.TestCase):
 def test_transaction_projection(self):
  row=BankService._transaction({"id":4,"import_batch_id":2,"external_id":"FIT1","account_last_four":"1234","posted_date":date(2026,7,20),"amount":Decimal("1200"),"transaction_type":"CREDIT","name":"Tenant","memo":"July","status":"Unmatched","matched_payment_id":None,"ignored_reason":None,"created_at":datetime(2026,7,20,12)})
  self.assertEqual(row["externalId"],"FIT1");self.assertEqual(row["amount"],1200.0);self.assertEqual(row["postedDate"],"2026-07-20")
 def test_batch_projection(self):
  row=BankService._batch({"id":1,"filename":"bank.qfx","imported_at":datetime(2026,7,20),"account_last_four":"1234","currency":"CAD","statement_start":date(2026,7,1),"statement_end":date(2026,7,20),"transaction_count":3,"total_credits":Decimal("10"),"total_debits":Decimal("2"),"new_transaction_count":2,"duplicate_count":1,"status":"Imported"})
  self.assertEqual(row["newTransactionCount"],2);self.assertEqual(row["currency"],"CAD")

if __name__=="__main__":unittest.main()
