
import type { ParsedQfxStatement } from "../models/domain";

function valueOf(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"));
  return match?.[1]?.trim() ?? "";
}

function normalizeDate(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return "";
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function parseQfx(content: string): ParsedQfxStatement {
  if (!content.match(/<OFX>/i)) {
    throw new Error("This file does not appear to be a QFX/OFX statement.");
  }

  const accountId = valueOf(content, "ACCTID");
  const accountLastFour = accountId.slice(-4);
  const currency = valueOf(content, "CURDEF") || "CAD";
  const bankBlock = content.match(/<BANKTRANLIST>([\s\S]*?)<\/BANKTRANLIST>/i)?.[1] ?? content;
  const statementStart = normalizeDate(valueOf(bankBlock, "DTSTART"));
  const statementEnd = normalizeDate(valueOf(bankBlock, "DTEND"));

  const transactionBlocks = Array.from(
    content.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi),
  ).map((match) => match[1] ?? "");

  if (transactionBlocks.length === 0) {
    throw new Error("No transactions were found in the QFX file.");
  }

  const transactions = transactionBlocks.map((block, index) => {
    const externalId = valueOf(block, "FITID");
    const amount = Number(valueOf(block, "TRNAMT"));

    if (!externalId) {
      throw new Error(`Transaction ${index + 1} has no FITID reference.`);
    }
    if (!Number.isFinite(amount)) {
      throw new Error(`Transaction ${externalId} has an invalid amount.`);
    }

    return {
      externalId,
      postedDate: normalizeDate(valueOf(block, "DTPOSTED")),
      amount,
      transactionType: valueOf(block, "TRNTYPE") || (amount >= 0 ? "CREDIT" : "DEBIT"),
      name: valueOf(block, "NAME"),
      memo: valueOf(block, "MEMO"),
    };
  });

  return {
    accountLastFour,
    currency,
    statementStart,
    statementEnd,
    transactions,
  };
}
