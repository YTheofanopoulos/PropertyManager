import { db } from "../db/database";
import { applicationClock } from "./applicationClockService";
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
  amountDifference: number;
  targetPeriod: string;
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

function targetRentPeriod(postedDate: string): string {
  const year = Number(postedDate.slice(0, 4));
  const month = Number(postedDate.slice(5, 7));
  const day = Number(postedDate.slice(8, 10));

  // Rent received during the last week of a month normally applies to the
  // following month. Otherwise, use the transaction's calendar month.
  if (day < 25) return postedDate.slice(0, 7);

  const date = new Date(year, month, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function containsToken(haystack: string, token: string): boolean {
  if (!token.trim()) return false;
  return haystack.split(" ").includes(normalize(token));
}

export class ReconciliationService {
  async suggestions(transactionId: number): Promise<MatchSuggestion[]> {
    const transaction = await db.bankTransactions.get(transactionId);
    if (!transaction) throw new Error("Bank transaction not found.");

    const currentPeriod = applicationClock.currentPeriod();
    await rentLedgerService.ensureObligationsThrough(currentPeriod);

    const [
      leases,
      units,
      buildings,
      locations,
      history,
      participants,
      tenants,
    ] = await Promise.all([
      db.leases.toArray(),
      db.units.toArray(),
      db.buildings.toArray(),
      db.locations.toArray(),
      db.reconciliationHistory.toArray(),
      db.leaseParticipants.toArray(),
      db.tenants.toArray(),
    ]);

    const unitMap = new Map(units.map((item) => [item.id, item]));
    const buildingMap = new Map(buildings.map((item) => [item.id, item]));
    const locationMap = new Map(locations.map((item) => [item.id, item]));
    const tenantMap = new Map(tenants.map((item) => [item.id, item]));

    const normalizedName = normalize(transaction.name);
    const normalizedMemo = normalize(transaction.memo);
    const normalizedReference = normalize(transaction.externalId);
    const searchableText = normalize(
      `${transaction.name} ${transaction.memo} ${transaction.externalId}`,
    );
    const postedDay = Number(transaction.postedDate.slice(8, 10));
    const targetPeriod = targetRentPeriod(transaction.postedDate);

    const candidates: MatchSuggestion[] = [];

    for (const lease of leases) {
      if (lease.status === "Expired" || lease.status === "Terminated") continue;

      const unit = unitMap.get(lease.unitId);
      const building = unit ? buildingMap.get(unit.buildingId) : undefined;
      const location = building ? locationMap.get(building.locationId) : undefined;
      if (!unit || !building || !location || lease.id === undefined) continue;

      const outstanding = await rentLedgerService.getOutstandingObligations(
        lease.id,
        currentPeriod,
      );
      if (outstanding.length === 0) continue;

      const amountDue = outstanding.reduce(
        (total, item) => total + item.balance,
        0,
      );
      const exactObligations = outstanding.filter(
        (item) => Math.abs(item.balance - transaction.amount) < 0.005,
      );
      const exactOutstandingAmount = exactObligations.length > 0;
      const amountDifference = Math.abs(amountDue - transaction.amount);
      const sameRentPeriod = exactObligations.some(
        (item) => item.rentPeriod === targetPeriod,
      );

      const leaseHistory = history.filter((item) => item.leaseId === lease.id);
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

      const buildingMatch = containsToken(
        searchableText,
        building.civicAddress,
      );
      const unitMatch = Boolean(unit.apartmentNumber) && containsToken(
        searchableText,
        unit.apartmentNumber,
      );

      const leaseTenantIds = participants
        .filter((participant) => participant.leaseId === lease.id)
        .map((participant) => participant.tenantId);
      const tenantNameMatch = leaseTenantIds.some((tenantId) => {
        const tenant = tenantMap.get(tenantId);
        if (!tenant) return false;
        const firstName = normalize(tenant.firstName);
        const lastName = normalize(tenant.lastName);
        return (
          (firstName && searchableText.includes(firstName)) ||
          (lastName && searchableText.includes(lastName))
        );
      });

      let score = 0;
      const reasons: string[] = [];

      if (exactOutstandingAmount) {
        score += 100;
        reasons.push("+100 exact outstanding rent balance");
      } else {
        const penalty = Math.round(amountDifference);
        score -= penalty;
        reasons.push(
          `-${penalty} amount differs by $${penalty.toLocaleString("en-CA")}`,
        );
      }

      if (sameRentPeriod) {
        score += 40;
        reasons.push(`+40 exact balance belongs to target period ${targetPeriod}`);
      }
      if (buildingMatch) {
        score += 20;
        reasons.push(`+20 transaction text contains building ${building.civicAddress}`);
      }
      if (unitMatch) {
        score += 20;
        reasons.push(`+20 transaction text contains unit ${unit.apartmentNumber}`);
      }
      if (tenantNameMatch) {
        score += 15;
        reasons.push("+15 transaction text contains a lease tenant name");
      }
      if (amountHistory.length > 0) {
        score += 15;
        reasons.push(
          `+15 same amount previously reconciled to this unit (${amountHistory.length})`,
        );
      }
      if (memoHistory.length > 0 || nameHistory.length > 0) {
        score += 15;
        reasons.push(
          `+15 transaction name or memo matches prior history (${Math.max(
            memoHistory.length,
            nameHistory.length,
          )})`,
        );
      }
      if (timingHistory.length > 0) {
        score += 5;
        reasons.push(
          `+5 posting day is near prior reconciliation history (${timingHistory.length})`,
        );
      }
      if (leaseHistory.length > 0) {
        score += 5;
        reasons.push(`+5 unit has reconciliation history (${leaseHistory.length})`);
      }

      candidates.push({
        leaseId: lease.id,
        unitLabel: `${building.civicAddress}${
          unit.apartmentNumber ? ` ${unit.apartmentNumber}` : ""
        } ${location.name}`,
        amountDue,
        oldestPeriod: outstanding[0]?.rentPeriod ?? "",
        score,
        classification: "Manual Review",
        reasons,
        exactOutstandingAmount,
        historyCount: leaseHistory.length,
        ambiguous: false,
        amountDifference,
        targetPeriod,
      });
    }

    // Exact outstanding-balance matches are always ranked before non-exact
    // candidates. Score is used only within the same ranking tier.
    candidates.sort(
      (left, right) =>
        Number(right.exactOutstandingAmount) -
          Number(left.exactOutstandingAmount) ||
        right.score - left.score ||
        left.amountDifference - right.amountDifference ||
        left.unitLabel.localeCompare(right.unitLabel),
    );

    const exactCandidates = candidates.filter(
      (candidate) => candidate.exactOutstandingAmount,
    );
    const top = candidates[0];
    const second = candidates[1];

    for (const candidate of candidates) {
      const tiedExactTop =
        candidate === top &&
        candidate.exactOutstandingAmount &&
        exactCandidates.length > 1 &&
        Boolean(second) &&
        second.exactOutstandingAmount &&
        candidate.score - second.score < 15;

      candidate.ambiguous = tiedExactTop;

      if (candidate === top && tiedExactTop) {
        candidate.classification = "Ambiguous";
        candidate.reasons.push(
          "Classification: multiple exact amount candidates require user selection",
        );
      } else if (
        candidate === top &&
        candidate.exactOutstandingAmount &&
        candidate.score >= 120
      ) {
        candidate.classification = "Strong Candidate";
        candidate.reasons.push(
          "Classification: exact balance plus supporting evidence",
        );
      } else if (candidate.exactOutstandingAmount) {
        candidate.classification = "Good Candidate";
        candidate.reasons.push(
          "Classification: exact balance match; user confirmation is still required",
        );
      } else if (candidate === top && candidate.score > 0) {
        candidate.classification = "Possible Match";
        candidate.reasons.push(
          "Classification: supporting evidence exists, but the amount is not exact",
        );
      } else {
        candidate.classification = "Manual Review";
        if (candidate.reasons.length === 0) {
          candidate.reasons.push("No matching evidence");
        }
      }

      candidate.reasons.push(`Final score: ${candidate.score}`);
    }

    return candidates.slice(0, 12);
  }

  async reconcile(
    transactionId: number,
    leaseId: number,
    allocations: ReconcileAllocation[],
    traceId?: string,
  ): Promise<number> {
    const started = performance.now();
    const logPhase = (phase: string, phaseStarted: number): void => {
      if (!traceId) return;
      const duration = Math.round((performance.now() - phaseStarted) * 10) / 10;
      console.info(`[Reconcile ${traceId}] Service — ${phase}: ${duration.toFixed(1)} ms`);
    };

    const lookupStarted = performance.now();
    const transaction = await db.bankTransactions.get(transactionId);
    logPhase("Load transaction", lookupStarted);
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

    const obligationsStarted = performance.now();
    const obligations = await db.rentObligations.bulkGet(
      allocations.map((allocation) => allocation.obligationId),
    );
    logPhase("Load and validate obligations", obligationsStarted);
    for (const allocation of allocations) {
      const obligation = obligations.find(
        (item) => item?.id === allocation.obligationId,
      );
      if (!obligation || obligation.leaseId !== leaseId) {
        throw new Error("An allocation does not belong to the selected unit.");
      }
    }

    const writeStarted = performance.now();
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
