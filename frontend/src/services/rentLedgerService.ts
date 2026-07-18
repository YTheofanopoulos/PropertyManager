import { db } from "../db/database";
import type { RentObligation, RentRollRow } from "../models/domain";

const monthKey = (date: string): string => date.slice(0, 7);
function nextMonth(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month, 1).toISOString().slice(0, 7);
}

export class RentLedgerService {
  async ensureObligationsThrough(period: string): Promise<void> {
    const [leases, charges, concessions, existingObligations, allocations] = await Promise.all([
      db.leases.toArray(),
      db.recurringCharges.toArray(),
      db.leaseConcessions.toArray(),
      db.rentObligations.toArray(),
      db.paymentAllocations.toArray(),
    ]);

    await db.transaction("rw", db.rentObligations, async () => {
      for (const lease of leases) {
        if (lease.id === undefined || lease.status === "Terminated") continue;
        const start = monthKey(lease.startDate);
        const end = lease.termType === "Month-to-Month" || !lease.endDate
          ? period
          : monthKey(lease.endDate);
        const leaseObligations = existingObligations.filter((item) => item.leaseId === lease.id);

        // Remove stale, unallocated obligations left behind by a prior lease-date edit.
        for (const obligation of leaseObligations) {
          if (obligation.id === undefined || (obligation.rentPeriod >= start && obligation.rentPeriod <= end)) continue;
          const paid = allocations
            .filter((allocation) => allocation.obligationId === obligation.id)
            .reduce((total, allocation) => total + allocation.amount, 0);
          if (paid <= 0.005) await db.rentObligations.delete(obligation.id);
        }

        let current = start;
        while (current <= period && current <= end) {
          const gross = charges
            .filter((charge) =>
              charge.leaseId === lease.id &&
              charge.frequency === "Monthly" &&
              monthKey(charge.startDate) <= current &&
              (!charge.endDate || monthKey(charge.endDate) >= current),
            )
            .reduce((total, charge) => total + charge.amount, 0);
          const credit = concessions
            .filter((concession) =>
              concession.leaseId === lease.id &&
              concession.startPeriod <= current &&
              concession.endPeriod >= current,
            )
            .reduce((total, concession) => total + concession.amount, 0);
          const expectedAmount = Math.max(gross - credit, 0);
          const existing = leaseObligations.find((item) => item.rentPeriod === current);

          if (!existing && expectedAmount > 0.005) {
            await db.rentObligations.add({
              leaseId: lease.id,
              rentPeriod: current,
              expectedAmount,
              status: "Unpaid",
              createdAt: new Date().toISOString(),
            } satisfies RentObligation);
          } else if (existing?.id !== undefined) {
            const paid = allocations
              .filter((allocation) => allocation.obligationId === existing.id)
              .reduce((total, allocation) => total + allocation.amount, 0);
            if (expectedAmount <= 0.005 && paid <= 0.005) {
              await db.rentObligations.delete(existing.id);
            } else if (paid <= expectedAmount + 0.005) {
              await db.rentObligations.update(existing.id, { expectedAmount });
            }
          }
          current = nextMonth(current);
        }
      }
    });
    await this.refreshAllStatuses();
  }

  async refreshAllStatuses(): Promise<void> {
    const [obligations, allocations] = await Promise.all([
      db.rentObligations.toArray(),
      db.paymentAllocations.toArray(),
    ]);
    await db.transaction("rw", db.rentObligations, async () => {
      for (const obligation of obligations) {
        const paid = allocations
          .filter((allocation) => allocation.obligationId === obligation.id)
          .reduce((total, allocation) => total + allocation.amount, 0);
        const status = paid === 0
          ? "Unpaid"
          : paid < obligation.expectedAmount
            ? "Partially Paid"
            : paid === obligation.expectedAmount
              ? "Paid"
              : "Overpaid";
        await db.rentObligations.update(obligation.id as number, { status });
      }
    });
  }

  async getOutstandingObligations(leaseId: number, throughPeriod?: string) {
    const [lease, obligations, allocations] = await Promise.all([
      db.leases.get(leaseId),
      db.rentObligations.where("leaseId").equals(leaseId).sortBy("rentPeriod"),
      db.paymentAllocations.toArray(),
    ]);
    if (!lease) return [];
    const start = monthKey(lease.startDate);
    const end = lease.termType === "Month-to-Month" || !lease.endDate ? "9999-12" : monthKey(lease.endDate);

    return obligations
      .filter((obligation) =>
        obligation.rentPeriod >= start &&
        obligation.rentPeriod <= end &&
        (!throughPeriod || obligation.rentPeriod <= throughPeriod),
      )
      .map((obligation) => {
        const paid = allocations
          .filter((allocation) => allocation.obligationId === obligation.id)
          .reduce((total, allocation) => total + allocation.amount, 0);
        return { ...obligation, paid, balance: Math.max(obligation.expectedAmount - paid, 0) };
      })
      .filter((item) => item.balance > 0.005);
  }

  async getRentRoll(period: string): Promise<RentRollRow[]> {
    await this.ensureObligationsThrough(period);
    const [leases, obligations, allocations, units, buildings, locations, participants, tenants] = await Promise.all([
      db.leases.toArray(), db.rentObligations.toArray(), db.paymentAllocations.toArray(), db.units.toArray(),
      db.buildings.toArray(), db.locations.toArray(), db.leaseParticipants.toArray(), db.tenants.toArray(),
    ]);
    const unitMap = new Map(units.map((item) => [item.id, item]));
    const buildingMap = new Map(buildings.map((item) => [item.id, item]));
    const locationMap = new Map(locations.map((item) => [item.id, item]));
    const tenantMap = new Map(tenants.map((item) => [item.id, item]));
    const paid = (id?: number): number => id
      ? allocations.filter((allocation) => allocation.obligationId === id).reduce((total, allocation) => total + allocation.amount, 0)
      : 0;

    return leases
      .filter((lease) => monthKey(lease.startDate) <= period)
      .map((lease) => {
        const leaseStart = monthKey(lease.startDate);
        const leaseEnd = lease.termType === "Month-to-Month" || !lease.endDate ? "9999-12" : monthKey(lease.endDate);
        const list = obligations
          .filter((obligation) =>
            obligation.leaseId === lease.id &&
            obligation.rentPeriod >= leaseStart &&
            obligation.rentPeriod <= leaseEnd &&
            obligation.rentPeriod <= period,
          )
          .sort((left, right) => left.rentPeriod.localeCompare(right.rentPeriod));
        const current = list.find((obligation) => obligation.rentPeriod === period);
        const prior = list.filter((obligation) => obligation.rentPeriod < period);
        const priorBalance = prior.reduce((total, obligation) => total + Math.max(obligation.expectedAmount - paid(obligation.id), 0), 0);
        const currentBalance = current ? Math.max(current.expectedAmount - paid(current.id), 0) : 0;
        const unpaid = list.filter((obligation) => obligation.expectedAmount - paid(obligation.id) > 0.005);
        const unit = unitMap.get(lease.unitId);
        const building = unit ? buildingMap.get(unit.buildingId) : undefined;
        const location = building ? locationMap.get(building.locationId) : undefined;
        const primaryLink = participants
          .filter((item) => item.leaseId === lease.id)
          .sort((left, right) => (left.sortOrder ?? 999) - (right.sortOrder ?? 999))
          .find((item) => item.primary) ?? participants.find((item) => item.leaseId === lease.id);
        const tenant = primaryLink ? tenantMap.get(primaryLink.tenantId) : undefined;
        const totalOutstanding = priorBalance + currentBalance;

        return {
          leaseId: lease.id as number,
          unitLabel: `${building?.civicAddress ?? "?"}${unit?.apartmentNumber ? ` ${unit.apartmentNumber}` : ""} ${location?.name ?? ""}`.trim(),
          primaryTenant: tenant ? `${tenant.firstName} ${tenant.lastName}` : "Unknown",
          selectedPeriod: period,
          currentMonthDue: current?.expectedAmount ?? 0,
          currentMonthPaid: paid(current?.id),
          priorBalance,
          totalOutstanding,
          oldestUnpaidPeriod: unpaid[0]?.rentPeriod ?? "",
          monthsInArrears: unpaid.filter((obligation) => obligation.rentPeriod < period).length,
          status: totalOutstanding <= 0.005 ? "Current" : priorBalance > 0.005 ? "In Arrears" : "Partial",
        } satisfies RentRollRow;
      });
  }
}

export const rentLedgerService = new RentLedgerService();
