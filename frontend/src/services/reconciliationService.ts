
import { db } from "../db/database";
import type {
  MatchClassification,
  Payment,
  PaymentAllocation,
  ReconciliationHistory,
} from "../models/domain";
import { rentLedgerService } from "./rentLedgerService";

export interface MatchSuggestion {
  leaseId: number;
  unitLabel: string;
  amountDue: number;
  oldestPeriod: string;
  score: number;
  classification: MatchClassification;
  reasons: string[];
  exactOutstandingAmount: boolean;
  historyCount: number;
  ambiguous: boolean;
}

export interface ReconcileAllocation {
  obligationId: number;
  amount: number;
}

function normalize(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function daysApart(left: number, right: number): number {
  return Math.abs(left - right);
}

export class ReconciliationService {
  async suggestions(transactionId: number): Promise<MatchSuggestion[]> {
    const transaction = await db.bankTransactions.get(transactionId);
    if (!transaction) throw new Error("Bank transaction not found.");

    await rentLedgerService.ensureObligationsThrough(
      transaction.postedDate.slice(0, 7),
    );

    const [leases, units, buildings, locations, history] = await Promise.all([
      db.leases.toArray(),
      db.units.toArray(),
      db.buildings.toArray(),
      db.locations.toArray(),
      db.reconciliationHistory.toArray(),
    ]);

    const unitMap = new Map(units.map((item) => [item.id, item]));
    const buildingMap = new Map(buildings.map((item) => [item.id, item]));
    const locationMap = new Map(locations.map((item) => [item.id, item]));
    const normalizedName = normalize(transaction.name);
    const normalizedMemo = normalize(transaction.memo);
    const postedDay = Number(transaction.postedDate.slice(8, 10));

    const candidates: MatchSuggestion[] = [];

    for (const lease of leases) {
      if (lease.status === "Expired" || lease.status === "Terminated") continue;

      const unit = unitMap.get(lease.unitId);
      const building = unit ? buildingMap.get(unit.buildingId) : undefined;
      const location = building ? locationMap.get(building.locationId) : undefined;
      if (!unit || !building || !location) continue;

      // 5.3.1 fixtures intentionally target only building 383. The scoring
      // engine itself remains general, but vacant/no-obligation units never enter.
      const outstanding = await rentLedgerService.getOutstandingObligations(
        lease.id as number,
      );
      if (outstanding.length === 0) continue;

      const leaseHistory = history.filter((item) => item.leaseId === lease.id);
      const exactOutstandingAmount = outstanding.some(
        (item) => Math.abs(item.balance - transaction.amount) < 0.005,
      );
      const amountHistory = leaseHistory.filter(
        (item) => Math.abs(item.amount - transaction.amount) < 0.005,
      );
      const memoHistory = normalizedMemo
        ? leaseHistory.filter((item) => item.normalizedMemo === normalizedMemo)
        : [];
      const nameHistory = normalizedName
        ? leaseHistory.filter((item) => item.normalizedName === normalizedName)
        : [];
      const timingHistory = leaseHistory.filter(
        (item) => daysApart(item.postedDay, postedDay) <= 3,
      );

      let score = 0;
      const reasons: string[] = [];

      if (exactOutstandingAmount) {
        score += 25;
        reasons.push("+25 amount exactly matches an outstanding rent balance");
      }
      if (amountHistory.length > 0) {
        score += 25;
        reasons.push(`+25 same amount previously reconciled to this unit (${amountHistory.length})`);
      }
      if (memoHistory.length > 0) {
        score += 20;
        reasons.push(`+20 memo matches prior reconciliation history (${memoHistory.length})`);
      }
      if (nameHistory.length > 0) {
        score += 15;
        reasons.push(`+15 transaction name matches prior history (${nameHistory.length})`);
      }
      if (timingHistory.length > 0) {
        score += 10;
        reasons.push(`+10 posting day is within three days of prior history (${timingHistory.length})`);
      }
      if (leaseHistory.length > 0) {
        score += 5;
        reasons.push(`+5 unit has reconciliation history (${leaseHistory.length})`);
      }
      if (reasons.length === 0) {
        reasons.push("No historical or amount evidence");
      }

      candidates.push({
        leaseId: lease.id as number,
        unitLabel: `${building.civicAddress}${unit.apartmentNumber ? ` ${unit.apartmentNumber}` : ""} ${location.name}`,
        amountDue: outstanding.reduce((total, item) => total + item.balance, 0),
        oldestPeriod: outstanding[0]?.rentPeriod ?? "",
        score,
        classification: "Manual Review",
        reasons,
        exactOutstandingAmount,
        historyCount: leaseHistory.length,
        ambiguous: false,
      });
    }

    candidates.sort(
      (left, right) =>
        right.score - left.score || left.unitLabel.localeCompare(right.unitLabel),
    );

    const top = candidates[0];
    const second = candidates[1];
    const topTies = top
      ? candidates.filter((candidate) => candidate.score === top.score)
      : [];
    const exactAmountCandidates = candidates.filter(
      (candidate) => candidate.exactOutstandingAmount,
    );

    for (const candidate of candidates) {
      const tiedForTop = topTies.length > 1 && candidate.score === top?.score;
      const amountOnlyAmbiguity =
        candidate.historyCount === 0 &&
        candidate.exactOutstandingAmount &&
        exactAmountCandidates.length > 1;
      const smallLead =
        candidate === top &&
        Boolean(second) &&
        top.score - second.score < 15;

      candidate.ambiguous = tiedForTop || amountOnlyAmbiguity || smallLead;

      if (candidate.ambiguous && candidate === top) {
        candidate.classification = "Ambiguous";
        candidate.reasons.push("Classification: no unique leading candidate");
      } else if (
        candidate === top &&
        candidate.score >= 70 &&
        candidate.historyCount > 0 &&
        !candidate.ambiguous
      ) {
        candidate.classification = "High Confidence";
        candidate.reasons.push("Classification: strong historical evidence and a clear lead");
      } else if (
        candidate === top &&
        candidate.score >= 25 &&
        !candidate.ambiguous
      ) {
        candidate.classification = "Suggested";
        candidate.reasons.push("Classification: useful evidence, but user confirmation is required");
      } else if (candidate === top && candidate.ambiguous) {
        candidate.classification = "Ambiguous";
      } else {
        candidate.classification = "Manual Review";
      }
    }

    return candidates.slice(0, 12);
  }

  async reconcile(
    transactionId: number,
    leaseId: number,
    allocations: ReconcileAllocation[],
  ): Promise<number> {
    const transaction = await db.bankTransactions.get(transactionId);
    if (!transaction) throw new Error("Bank transaction not found.");
    if (transaction.status === "Reconciled") {
      throw new Error("This transaction is already reconciled.");
    }
    if (transaction.amount <= 0) {
      throw new Error("Only credit transactions can be reconciled as rent.");
    }

    const allocationTotal = allocations.reduce(
      (total, allocation) => total + allocation.amount,
      0,
    );
    if (allocationTotal <= 0) {
      throw new Error("Allocate at least part of the transaction.");
    }
    if (allocationTotal - transaction.amount > 0.005) {
      throw new Error("Allocations cannot exceed the bank transaction amount.");
    }

    const obligations = await db.rentObligations.bulkGet(
      allocations.map((allocation) => allocation.obligationId),
    );
    for (const allocation of allocations) {
      const obligation = obligations.find(
        (item) => item?.id === allocation.obligationId,
      );
      if (!obligation || obligation.leaseId !== leaseId) {
        throw new Error("An allocation does not belong to the selected unit.");
      }
    }

    const paymentId = await db.transaction(
      "rw",
      db.payments,
      db.paymentAllocations,
      db.bankTransactions,
      db.reconciliationHistory,
      async () => {
        const id = Number(
          await db.payments.add({
            leaseId,
            receivedDate: transaction.postedDate,
            amount: transaction.amount,
            paymentMethod: "Electronic Transfer",
            reference: transaction.externalId,
            notes: `${transaction.name}${transaction.memo ? ` — ${transaction.memo}` : ""}`,
            source: "Bank Import",
            status: "Posted",
            createdAt: new Date().toISOString(),
          } satisfies Payment),
        );

        const rows = allocations
          .filter((allocation) => allocation.amount > 0)
          .map((allocation) => ({
            paymentId: id,
            obligationId: allocation.obligationId,
            amount: allocation.amount,
          } satisfies PaymentAllocation));

        await db.paymentAllocations.bulkAdd(rows);
        await db.bankTransactions.update(transactionId, {
          status: "Reconciled",
          matchedPaymentId: id,
        });
        await db.reconciliationHistory.add({
          bankTransactionId: transactionId,
          paymentId: id,
          leaseId,
          amount: transaction.amount,
          postedDate: transaction.postedDate,
          postedDay: Number(transaction.postedDate.slice(8, 10)),
          normalizedName: normalize(transaction.name),
          normalizedMemo: normalize(transaction.memo),
          createdAt: new Date().toISOString(),
        } satisfies ReconciliationHistory);
        return id;
      },
    );

    await rentLedgerService.refreshAllStatuses();
    return paymentId;
  }

  async reopenForVoidedPayment(paymentId: number): Promise<void> {
    const transaction = await db.bankTransactions
      .where("matchedPaymentId")
      .equals(paymentId)
      .first();

    if (transaction) {
      await db.transaction(
        "rw",
        db.bankTransactions,
        db.reconciliationHistory,
        async () => {
          await db.bankTransactions.update(transaction.id as number, {
            status: "Unmatched",
            matchedPaymentId: undefined,
          });
          await db.reconciliationHistory
            .where("paymentId")
            .equals(paymentId)
            .delete();
        },
      );
    }
  }
}

export const reconciliationService = new ReconciliationService();
