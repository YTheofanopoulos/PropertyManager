import { applicationClock } from "./applicationClockService";
import type {
  MatchClassification,
} from "../models/domain";
import { rentLedgerService } from "./rentLedgerService";
import {financialContextService} from "./financialContextService";
import {bankImportService} from "./bankImportService";
import {apiRequest} from "../repositories/apiClient";

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
    const transaction = await bankImportService.getTransaction(transactionId);

    const context = await this.buildSuggestionContext();
    return this.scoreTransaction(transaction, context);
  }

  async batchSuggestions(
    transactions: Array<{ id?: number; name: string; memo: string; externalId: string; postedDate: string; amount: number }>,
  ): Promise<Map<number, MatchSuggestion[]>> {
    const context = await this.buildSuggestionContext();
    const results = new Map<number, MatchSuggestion[]>();

    for (const transaction of transactions) {
      if (transaction.id === undefined) continue;
      results.set(transaction.id, this.scoreTransaction(transaction, context));
    }

    return results;
  }

  private async buildSuggestionContext() {
    const currentPeriod = applicationClock.currentPeriod();
    await rentLedgerService.ensureObligationsThrough(currentPeriod);

    const context=await financialContextService.get(currentPeriod);
    const {leases,units,buildings,locations,history,participants,tenants,obligations,allocations}=context;

    const paidByObligation = new Map<number, number>();
    for (const allocation of allocations) {
      const obligationId = Number(allocation.obligationId);
      paidByObligation.set(
        obligationId,
        (paidByObligation.get(obligationId) ?? 0) + allocation.amount,
      );
    }

    const outstandingByLease = new Map<number, Array<(typeof obligations)[number] & { paid: number; balance: number }>>();
    for (const obligation of obligations) {
      if (obligation.id === undefined || obligation.rentPeriod > currentPeriod) continue;
      const paid = paidByObligation.get(Number(obligation.id)) ?? 0;
      const balance = Math.max(obligation.expectedAmount - paid, 0);
      if (balance <= 0.005) continue;
      const leaseId = Number(obligation.leaseId);
      const list = outstandingByLease.get(leaseId) ?? [];
      list.push({ ...obligation, paid, balance });
      outstandingByLease.set(leaseId, list);
    }
    for (const list of outstandingByLease.values()) {
      list.sort((left, right) => left.rentPeriod.localeCompare(right.rentPeriod));
    }

    const historyByLease = new Map<number, typeof history>();
    for (const item of history) {
      const leaseId = Number(item.leaseId);
      const list = historyByLease.get(leaseId) ?? [];
      list.push(item);
      historyByLease.set(leaseId, list);
    }

    const tenantIdsByLease = new Map<number, number[]>();
    for (const participant of participants) {
      const leaseId = Number(participant.leaseId);
      const list = tenantIdsByLease.get(leaseId) ?? [];
      list.push(Number(participant.tenantId));
      tenantIdsByLease.set(leaseId, list);
    }

    return {
      currentPeriod,
      leases,
      unitMap: new Map(units.map((item) => [item.id, item])),
      buildingMap: new Map(buildings.map((item) => [item.id, item])),
      locationMap: new Map(locations.map((item) => [item.id, item])),
      tenantMap: new Map(tenants.map((item) => [item.id, item])),
      historyByLease,
      tenantIdsByLease,
      outstandingByLease,
    };
  }

  private scoreTransaction(
    transaction: { name: string; memo: string; externalId: string; postedDate: string; amount: number },
    context: Awaited<ReturnType<ReconciliationService["buildSuggestionContext"]>>,
  ): MatchSuggestion[] {
    const normalizedName = normalize(transaction.name);
    const normalizedMemo = normalize(transaction.memo);
    const searchableText = normalize(
      `${transaction.name} ${transaction.memo} ${transaction.externalId}`,
    );
    const postedDay = Number(transaction.postedDate.slice(8, 10));
    const targetPeriod = targetRentPeriod(transaction.postedDate);
    const candidates: MatchSuggestion[] = [];

    for (const lease of context.leases) {
      if (lease.status === "Expired" || lease.status === "Terminated") continue;
      if (lease.id === undefined) continue;

      const leaseId = Number(lease.id);
      const unit = context.unitMap.get(lease.unitId);
      const building = unit ? context.buildingMap.get(unit.buildingId) : undefined;
      const location = building ? context.locationMap.get(building.locationId) : undefined;
      if (!unit || !building || !location) continue;

      const outstanding = context.outstandingByLease.get(leaseId) ?? [];
      if (outstanding.length === 0) continue;

      const amountDue = outstanding.reduce((total, item) => total + item.balance, 0);
      const exactObligations = outstanding.filter(
        (item) => Math.abs(item.balance - transaction.amount) < 0.005,
      );
      const exactOutstandingAmount = exactObligations.length > 0;
      const amountDifference = Math.abs(amountDue - transaction.amount);
      const sameRentPeriod = exactObligations.some(
        (item) => item.rentPeriod === targetPeriod,
      );

      const leaseHistory = context.historyByLease.get(leaseId) ?? [];
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

      const buildingMatch = containsToken(searchableText, building.civicAddress);
      const unitMatch = Boolean(unit.apartmentNumber) && containsToken(
        searchableText,
        unit.apartmentNumber,
      );

      const tenantNameMatch = (context.tenantIdsByLease.get(leaseId) ?? []).some(
        (tenantId) => {
          const tenant = context.tenantMap.get(tenantId);
          if (!tenant) return false;
          const firstName = normalize(tenant.firstName);
          const lastName = normalize(tenant.lastName);
          return (
            (firstName && searchableText.includes(firstName)) ||
            (lastName && searchableText.includes(lastName))
          );
        },
      );

      let score = 0;
      const reasons: string[] = [];

      if (exactOutstandingAmount) {
        score += 100;
        reasons.push("+100 exact outstanding rent balance");
      } else {
        const penalty = Math.round(amountDifference);
        score -= penalty;
        reasons.push(`-${penalty} amount differs by $${penalty.toLocaleString("en-CA")}`);
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
        reasons.push(`+15 same amount previously reconciled to this unit (${amountHistory.length})`);
      }
      if (memoHistory.length > 0 || nameHistory.length > 0) {
        score += 15;
        reasons.push(`+15 transaction name or memo matches prior history (${Math.max(memoHistory.length, nameHistory.length)})`);
      }
      if (timingHistory.length > 0) {
        score += 5;
        reasons.push(`+5 posting day is near prior reconciliation history (${timingHistory.length})`);
      }
      if (leaseHistory.length > 0) {
        score += 5;
        reasons.push(`+5 unit has reconciliation history (${leaseHistory.length})`);
      }

      candidates.push({
        leaseId,
        unitLabel: `${building.civicAddress}${unit.apartmentNumber ? ` ${unit.apartmentNumber}` : ""} ${location.name}`,
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

    candidates.sort(
      (left, right) =>
        Number(right.exactOutstandingAmount) - Number(left.exactOutstandingAmount) ||
        right.score - left.score ||
        left.amountDifference - right.amountDifference ||
        left.unitLabel.localeCompare(right.unitLabel),
    );

    const exactCandidates = candidates.filter((candidate) => candidate.exactOutstandingAmount);
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
        candidate.reasons.push("Classification: multiple exact amount candidates require user selection");
      } else if (candidate === top && candidate.exactOutstandingAmount && candidate.score >= 120) {
        candidate.classification = "Strong Candidate";
        candidate.reasons.push("Classification: exact balance plus supporting evidence");
      } else if (candidate.exactOutstandingAmount) {
        candidate.classification = "Good Candidate";
        candidate.reasons.push("Classification: exact balance match; user confirmation is still required");
      } else if (candidate === top && candidate.score > 0) {
        candidate.classification = "Possible Match";
        candidate.reasons.push("Classification: supporting evidence exists, but the amount is not exact");
      } else {
        candidate.classification = "Manual Review";
        if (candidate.reasons.length === 0) candidate.reasons.push("No matching evidence");
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
    const transaction = await bankImportService.getTransaction(transactionId);
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

    const writeStarted=performance.now();
    const result=await apiRequest<{paymentId:number}>(`/api/v1/bank/transactions/${transactionId}/reconcile`,{method:"POST",body:JSON.stringify({leaseId,allocations})});
    logPhase("Commit MariaDB reconciliation",writeStarted);
    return result.paymentId;
  }

  async reopenForVoidedPayment(_paymentId:number):Promise<void>{/* The backend payment transaction performs this atomically. */}
}

export const reconciliationService = new ReconciliationService();
