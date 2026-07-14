
import { db } from "../db/database";
import type { Payment, PaymentAllocation } from "../models/domain";
import { rentLedgerService } from "./rentLedgerService";

export interface MatchSuggestion {
  leaseId: number;
  unitLabel: string;
  amountDue: number;
  exact: boolean;
  difference: number;
  oldestPeriod: string;
}

export interface ReconcileAllocation {
  obligationId: number;
  amount: number;
}

export class ReconciliationService {
  async suggestions(transactionId: number): Promise<MatchSuggestion[]> {
    const transaction = await db.bankTransactions.get(transactionId);
    if (!transaction) throw new Error("Bank transaction not found.");

    await rentLedgerService.ensureObligationsThrough(
      transaction.postedDate.slice(0, 7),
    );

    const [leases, units, buildings, locations] = await Promise.all([
      db.leases.toArray(),
      db.units.toArray(),
      db.buildings.toArray(),
      db.locations.toArray(),
    ]);

    const unitMap = new Map(units.map((item) => [item.id, item]));
    const buildingMap = new Map(buildings.map((item) => [item.id, item]));
    const locationMap = new Map(locations.map((item) => [item.id, item]));

    const suggestions: MatchSuggestion[] = [];
    for (const lease of leases) {
      const outstanding =
        await rentLedgerService.getOutstandingObligations(lease.id as number);
      if (outstanding.length === 0) continue;

      const amountDue = outstanding.reduce(
        (total, obligation) => total + obligation.balance,
        0,
      );
      const closestSingle = [...outstanding].sort(
        (left, right) =>
          Math.abs(left.balance - transaction.amount) -
          Math.abs(right.balance - transaction.amount),
      )[0];

      const unit = unitMap.get(lease.unitId);
      const building = unit ? buildingMap.get(unit.buildingId) : undefined;
      const location = building ? locationMap.get(building.locationId) : undefined;
      const unitLabel =
        `${building?.civicAddress ?? "?"}` +
        `${unit?.apartmentNumber ? ` ${unit.apartmentNumber}` : ""}` +
        `${location?.name ? ` ${location.name}` : ""}`;

      suggestions.push({
        leaseId: lease.id as number,
        unitLabel: unitLabel.trim(),
        amountDue,
        exact:
          Math.abs((closestSingle?.balance ?? amountDue) - transaction.amount) <
          0.005,
        difference: Math.abs(
          (closestSingle?.balance ?? amountDue) - transaction.amount,
        ),
        oldestPeriod: outstanding[0]?.rentPeriod ?? "",
      });
    }

    return suggestions
      .sort(
        (left, right) =>
          Number(right.exact) - Number(left.exact) ||
          left.difference - right.difference ||
          left.unitLabel.localeCompare(right.unitLabel),
      )
      .slice(0, 12);
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
      await db.bankTransactions.update(transaction.id as number, {
        status: "Unmatched",
        matchedPaymentId: undefined,
      });
    }
  }
}

export const reconciliationService = new ReconciliationService();
