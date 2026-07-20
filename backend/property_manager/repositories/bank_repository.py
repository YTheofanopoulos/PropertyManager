from ..database import read_connection


class BankRepository:
 @staticmethod
 def rows(sql,args=()):
  with read_connection() as connection:
   cursor=connection.cursor(dictionary=True);cursor.execute(sql,args);rows=list(cursor.fetchall());cursor.close();return rows
 def batches(self):return self.rows("SELECT * FROM bank_import_batches ORDER BY imported_at DESC,id DESC")
 def transactions(self):return self.rows("SELECT * FROM bank_transactions ORDER BY posted_date DESC,id DESC")
 def transaction(self,row_id):
  rows=self.rows("SELECT * FROM bank_transactions WHERE id=?",(row_id,));return rows[0] if rows else None
 @staticmethod
 def transaction_for_update(connection,row_id):
  cursor=connection.cursor(dictionary=True);cursor.execute("SELECT * FROM bank_transactions WHERE id=? FOR UPDATE",(row_id,));row=cursor.fetchone();cursor.close();return row
 @staticmethod
 def next_id(connection,table):
  if table not in {"bank_import_batches","bank_transactions","payments","payment_allocations","reconciliation_history"}:raise ValueError("Unsupported table")
  cursor=connection.cursor();cursor.execute(f"SELECT id FROM {table} ORDER BY id DESC LIMIT 1 FOR UPDATE");row=cursor.fetchone();cursor.close();return int(row[0])+1 if row else 1
 @staticmethod
 def duplicate_keys(connection,account,ids):
  if not ids:return set()
  cursor=connection.cursor();marks=",".join("?" for _ in ids);cursor.execute(f"SELECT external_id FROM bank_transactions WHERE account_last_four=? AND external_id IN ({marks})",(account,*ids));rows={r[0] for r in cursor.fetchall()};cursor.close();return rows
 @staticmethod
 def insert_import(connection,batch_id,batch,transactions):
  cursor=connection.cursor();cursor.execute("""INSERT INTO bank_import_batches
   (id,filename,imported_at,account_last_four,currency,statement_start,statement_end,transaction_count,total_credits,total_debits,new_transaction_count,duplicate_count,status)
   VALUES (?,?,UTC_TIMESTAMP(6),?,?,?,?,?,?,?,?,?,'Imported')""",(batch_id,batch["filename"],batch["account"],batch["currency"],batch["start"],batch["end"],batch["count"],batch["credits"],batch["debits"],len(transactions),batch["duplicates"]))
  if transactions:
   first=BankRepository.next_id(connection,"bank_transactions")
   cursor.executemany("""INSERT INTO bank_transactions
    (id,import_batch_id,external_id,account_last_four,posted_date,amount,transaction_type,name,memo,status,matched_payment_id,ignored_reason,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,NULL,?,UTC_TIMESTAMP(6))""",[(first+i,batch_id,r["externalId"],batch["account"],r["postedDate"],r["amount"],r["transactionType"],r["name"],r["memo"],"Unmatched" if r["amount"]>0 else "Ignored",None if r["amount"]>0 else "Debit transaction") for i,r in enumerate(transactions)])
  cursor.close()
 @staticmethod
 def ignore(connection,row_id,reason):
  cursor=connection.cursor();cursor.execute("UPDATE bank_transactions SET status='Ignored',ignored_reason=? WHERE id=? AND status NOT IN ('Reconciled','Duplicate')",(reason,row_id));count=cursor.rowcount;cursor.close();return count
 @staticmethod
 def reconcile(connection,transaction,payment_id,lease_id,allocations):
  cursor=connection.cursor();cursor.execute("""INSERT INTO payments
   (id,lease_id,tenant_id,received_date,amount,payment_method,reference,notes,source,status,created_at)
   VALUES (?,?,NULL,?,?,'Electronic Transfer',?,?,'Bank Import','Posted',UTC_TIMESTAMP(6))""",(payment_id,lease_id,transaction["posted_date"],transaction["amount"],transaction["external_id"],f"{transaction['name']}{' — '+transaction['memo'] if transaction['memo'] else ''}"))
  first=BankRepository.next_id(connection,"payment_allocations")
  cursor.executemany("INSERT INTO payment_allocations(id,payment_id,obligation_id,amount) VALUES (?,?,?,?)",[(first+i,payment_id,r["obligation_id"],r["amount"]) for i,r in enumerate(allocations)])
  cursor.execute("UPDATE bank_transactions SET status='Reconciled',matched_payment_id=?,ignored_reason=NULL WHERE id=?",(payment_id,transaction["id"]))
  history_id=BankRepository.next_id(connection,"reconciliation_history")
  normalize=lambda v:" ".join("".join(ch if ch.isalnum() else " " for ch in v.upper()).split())
  cursor.execute("""INSERT INTO reconciliation_history
   (id,bank_transaction_id,payment_id,lease_id,amount,posted_date,posted_day,normalized_name,normalized_memo,created_at)
   VALUES (?,?,?,?,?,?,DAY(?),?,?,UTC_TIMESTAMP(6))""",(history_id,transaction["id"],payment_id,lease_id,transaction["amount"],transaction["posted_date"],transaction["posted_date"],normalize(transaction["name"]),normalize(transaction["memo"])))
  cursor.close()
