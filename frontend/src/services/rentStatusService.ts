
import { db } from "../db/database";
import { rentLedgerService } from "./rentLedgerService";

export type MonthCellState =
  | "Paid"
  | "Paid Ahead"
  | "Partial"
  | "Partial Prepayment"
  | "Unpaid"
  | "Not Yet Due"
  | "Not Applicable";

export interface RentStatusMonth {
  period: string;
  expected: number;
  paid: number;
  remaining: number;
  collectionRate: number;
  state: MonthCellState;
  obligationId?: number;
  allocations: Array<{
    paymentId: number;
    receivedDate: string;
    amount: number;
    reference: string;
    source: string;
  }>;
}

export interface RentStatusOccupant {
  tenantId: number;
  name: string;
  role: "Primary Tenant" | "Additional Tenant";
  email: string;
  phone: string;
}

export interface RentStatusRow {
  unitId: number;
  leaseId?: number;
  unitLabel: string;
  tenantNames: string;
  occupants: RentStatusOccupant[];
  months: RentStatusMonth[];
  outstandingToday: number;
  monthsBehind: number;
}

function appliesToPeriod(
  lease: {
    startDate: string;
    endDate: string;
    termType?: string;
    status: string;
  },
  period: string,
): boolean {
  if (lease.status === "Terminated") return false;

  const starts = lease.startDate.slice(0, 7) <= period;
  const ends =
    lease.termType === "Month-to-Month" ||
    !lease.endDate ||
    lease.endDate.slice(0, 7) >= period;

  return starts && ends;
}

export class RentStatusService {
  async getStatus(
    periods: string[],
    currentPeriod: string,
  ): Promise<RentStatusRow[]> {
    if (periods.length === 0) return [];

    await rentLedgerService.ensureObligationsThrough(
      periods[periods.length - 1]!,
    );

    const [
      units,
      buildings,
      locations,
      leases,
      participants,
      tenants,
      obligations,
      rawAllocations,
      payments,
    ] = await Promise.all([
      db.units.toArray(),
      db.buildings.toArray(),
      db.locations.toArray(),
      db.leases.toArray(),
      db.leaseParticipants.toArray(),
      db.tenants.toArray(),
      db.rentObligations.toArray(),
      db.paymentAllocations.toArray(),
      db.payments.toArray(),
    ]);

    const buildingMap = new Map(
      buildings.map((item) => [item.id, item]),
    );
    const locationMap = new Map(
      locations.map((item) => [item.id, item]),
    );
    const tenantMap = new Map(
      tenants.map((item) => [item.id, item]),
    );
    const paymentMap = new Map(
      payments.map((item) => [item.id, item]),
    );

    const allocations = rawAllocations.filter(
      (allocation) =>
        (paymentMap.get(allocation.paymentId)?.status ?? "Posted") !==
        "Voided",
    );

    return units
      .filter((unit) => unit.active !== false)
      .map((unit) => {
        const building = buildingMap.get(unit.buildingId);
        const location = building
          ? locationMap.get(building.locationId)
          : undefined;

        const unitLabel =
          `${building?.civicAddress ?? "?"}` +
          `${unit.apartmentNumber ? ` ${unit.apartmentNumber}` : ""}` +
          `${location?.name ? ` ${location.name}` : ""}`;

        const unitLeases = leases
          .filter((lease) => lease.unitId === unit.id)
          .sort((left, right) =>
            right.startDate.localeCompare(left.startDate),
          );

        const displayedLease =
          unitLeases.find((lease) =>
            periods.some((period) =>
              appliesToPeriod(lease, period),
            ),
          ) ?? unitLeases[0];

        const leaseParticipants = displayedLease
          ? participants
              .filter(
                (participant) =>
                  participant.leaseId === displayedLease.id,
              )
              .sort(
                (left, right) =>
                  Number(right.primary) - Number(left.primary) ||
                  Number(left.sortOrder ?? 999) -
                    Number(right.sortOrder ?? 999),
              )
          : [];

        const occupants = leaseParticipants
          .map((participant) => {
            const tenant = tenantMap.get(participant.tenantId);
            if (!tenant) return undefined;

            return {
              tenantId: tenant.id as number,
              name: `${tenant.firstName} ${tenant.lastName}`,
              role: participant.primary
                ? ("Primary Tenant" as const)
                : ("Additional Tenant" as const),
              email: tenant.email ?? "",
              phone: tenant.phone ?? "",
            };
          })
          .filter(
            (
              occupant,
            ): occupant is NonNullable<typeof occupant> =>
              Boolean(occupant),
          );

        const tenantNames = occupants
          .map((occupant) => occupant.name)
          .join(", ");

        const monthRows = periods.map((period) => {
          const lease = unitLeases.find((item) =>
            appliesToPeriod(item, period),
          );

          if (!lease) {
            return {
              period,
              expected: 0,
              paid: 0,
              remaining: 0,
              collectionRate: 0,
              state: "Not Applicable" as const,
              allocations: [],
            };
          }

          const obligation = obligations.find(
            (item) =>
              item.leaseId === lease.id &&
              item.rentPeriod === period,
          );

          if (!obligation) {
            return {
              period,
              expected: 0,
              paid: 0,
              remaining: 0,
              collectionRate: 0,
              state: "Not Applicable" as const,
              allocations: [],
            };
          }

          const obligationAllocations = allocations.filter(
            (allocation) =>
              allocation.obligationId === obligation.id,
          );

          const paid = obligationAllocations.reduce(
            (total, allocation) =>
              total + allocation.amount,
            0,
          );

          const expected = obligation.expectedAmount;
          const remaining = Math.max(expected - paid, 0);
          const future = period > currentPeriod;

          let state: RentStatusMonth["state"];
          if (paid >= expected - 0.005) {
            state = future ? "Paid Ahead" : "Paid";
          } else if (paid > 0.005) {
            state = future
              ? "Partial Prepayment"
              : "Partial";
          } else {
            state = future ? "Not Yet Due" : "Unpaid";
          }

          return {
            period,
            expected,
            paid,
            remaining,
            collectionRate:
              expected > 0
                ? Math.min((paid / expected) * 100, 100)
                : 0,
            state,
            obligationId: obligation.id,
            allocations: obligationAllocations.map(
              (allocation) => {
                const payment = paymentMap.get(
                  allocation.paymentId,
                );
                return {
                  paymentId: allocation.paymentId,
                  receivedDate:
                    payment?.receivedDate ?? "",
                  amount: allocation.amount,
                  reference: payment?.reference ?? "",
                  source: payment?.source ?? "",
                };
              },
            ),
          };
        });

        const dueMonths = monthRows.filter(
          (month) =>
            month.period <= currentPeriod &&
            month.state !== "Not Applicable",
        );

        return {
          unitId: unit.id as number,
          leaseId: displayedLease?.id,
          unitLabel: unitLabel.trim(),
          tenantNames,
          occupants,
          months: monthRows,
          outstandingToday: dueMonths.reduce(
            (total, month) =>
              total + month.remaining,
            0,
          ),
          monthsBehind: dueMonths.filter(
            (month) =>
              month.state === "Unpaid" ||
              month.state === "Partial",
          ).length,
        };
      })
      .sort((left, right) =>
        left.unitLabel.localeCompare(
          right.unitLabel,
          undefined,
          { numeric: true },
        ),
      );
  }
}

export const rentStatusService = new RentStatusService();
