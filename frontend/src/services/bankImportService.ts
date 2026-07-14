
import { db } from "../db/database";
import type {
  BankImportBatch,
  BankTransaction,
  ParsedQfxStatement,
} from "../models/domain";

export interface ImportPreviewRow {
  externalId: string;
  postedDate: string;
  amount: number;
  transactionType: string;
  name: string;
  memo: string;
  result: "New" | "Duplicate";
}

export interface ImportPreview {
  filename: string;
  statement: ParsedQfxStatement;
  rows: ImportPreviewRow[];
  newCount: number;
  duplicateCount: number;
  totalCredits: number;
  totalDebits: number;
}

export class BankImportService {
  async preview(
    filename: string,
    statement: ParsedQfxStatement,
  ): Promise<ImportPreview> {
    const rows: ImportPreviewRow[] = [];

    for (const transaction of statement.transactions) {
      const duplicate = await db.bankTransactions
        .where("[accountLastFour+externalId]")
        .equals([statement.accountLastFour, transaction.externalId])
        .first();

      rows.push({
        ...transaction,
        result: duplicate ? "Duplicate" : "New",
      });
    }

    return {
      filename,
      statement,
      rows,
      newCount: rows.filter((row) => row.result === "New").length,
      duplicateCount: rows.filter((row) => row.result === "Duplicate").length,
      totalCredits: rows
        .filter((row) => row.amount > 0)
        .reduce((total, row) => total + row.amount, 0),
      totalDebits: rows
        .filter((row) => row.amount < 0)
        .reduce((total, row) => total + Math.abs(row.amount), 0),
    };
  }

  async commit(preview: ImportPreview): Promise<number> {
    return db.transaction(
      "rw",
      db.bankImportBatches,
      db.bankTransactions,
      async () => {
        const batchId = Number(
          await db.bankImportBatches.add({
            filename: preview.filename,
            importedAt: new Date().toISOString(),
            accountLastFour: preview.statement.accountLastFour,
            currency: preview.statement.currency,
            statementStart: preview.statement.statementStart,
            statementEnd: preview.statement.statementEnd,
            transactionCount: preview.rows.length,
            totalCredits: preview.totalCredits,
            totalDebits: preview.totalDebits,
            newTransactionCount: preview.newCount,
            duplicateCount: preview.duplicateCount,
            status: "Imported",
          } satisfies BankImportBatch),
        );

        const newRows = preview.rows
          .filter((row) => row.result === "New")
          .map((row) => ({
            importBatchId: batchId,
            externalId: row.externalId,
            accountLastFour: preview.statement.accountLastFour,
            postedDate: row.postedDate,
            amount: row.amount,
            transactionType: row.transactionType,
            name: row.name,
            memo: row.memo,
            status: row.amount > 0 ? "Unmatched" : "Ignored",
            ignoredReason: row.amount > 0 ? undefined : "Debit transaction",
            createdAt: new Date().toISOString(),
          } satisfies BankTransaction));

        if (newRows.length > 0) {
          await db.bankTransactions.bulkAdd(newRows);
        }

        return batchId;
      },
    );
  }

  async ignore(transactionId: number, reason: string): Promise<void> {
    const trimmed = reason.trim();
    if (!trimmed) throw new Error("Enter a reason for ignoring the transaction.");
    await db.bankTransactions.update(transactionId, {
      status: "Ignored",
      ignoredReason: trimmed,
    });
  }
}

export const bankImportService = new BankImportService();
