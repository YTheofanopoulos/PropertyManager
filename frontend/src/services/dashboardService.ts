import { db } from "../db/database";
import type { Location } from "../models/domain";
import { applicationClock } from "./applicationClockService";

export interface DashboardMonthlyCollection {
  period: string;
  label: string;
  collectedAmount: number;
}

export interface DashboardSummary {
  applicationDate: string;
  currentPeriod: string;
  locations: Location[];
  totalUnits: number;
  occupiedUnits: number;
  monthlyRent: number;
  tenantCount: number;
  activeLeaseCount: number;
  locationUnitCounts: number[];
  monthlyCollections: DashboardMonthlyCollection[];
}

function addMonths(period: string, amount: number): string {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
  ].join("-");
}

function periodLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
  }).format(new Date(year, month - 1, 1));
}

function leaseIsActiveOn(
  lease: {
    startDate: string;
    endDate?: string;
    status: string;
  },
  date: string,
): boolean {
  return (
    lease.status !== "Terminated" &&
    lease.startDate <= date &&
    (!lease.endDate || lease.endDate >= date)
  );
}

export class DashboardService {
  async getSummary(): Promise<DashboardSummary> {
    const applicationDate = applicationClock.today();
    const currentPeriod = applicationClock.currentPeriod();

    const [
      locations,
      buildings,
      units,
      tenants,
      leases,
      recurringCharges,
      payments,
    ] = await Promise.all([
      db.locations.toArray(),
      db.buildings.toArray(),
      db.units.toArray(),
      db.tenants.toArray(),
      db.leases.toArray(),
      db.recurringCharges.toArray(),
      db.payments.toArray(),
    ]);

    const activeLeases = leases.filter((lease) =>
      leaseIsActiveOn(lease, applicationDate),
    );

    const activeLeaseIds = new Set(
      activeLeases
        .map((lease) => lease.id)
        .filter((leaseId): leaseId is number => leaseId !== undefined),
    );

    const occupiedUnitIds = new Set(
      activeLeases.map((lease) => lease.unitId),
    );

    const monthlyRent = recurringCharges
      .filter(
        (charge) =>
          activeLeaseIds.has(charge.leaseId) &&
          charge.frequency === "Monthly" &&
          charge.startDate <= applicationDate &&
          (!charge.endDate || charge.endDate >= applicationDate),
      )
      .reduce((total, charge) => total + charge.amount, 0);

    const periods = Array.from({ length: 6 }, (_, index) =>
      addMonths(currentPeriod, index - 5),
    );

    const monthlyCollections = periods.map((period) => ({
      period,
      label: periodLabel(period),
      collectedAmount: payments
        .filter(
          (payment) =>
            (payment.status ?? "Posted") !== "Voided" &&
            payment.receivedDate.slice(0, 7) === period,
        )
        .reduce((total, payment) => total + payment.amount, 0),
    }));

    return {
      applicationDate,
      currentPeriod,
      locations,
      totalUnits: units.length,
      occupiedUnits: occupiedUnitIds.size,
      monthlyRent,
      tenantCount: tenants.filter((tenant) => tenant.active).length,
      activeLeaseCount: activeLeases.length,
      locationUnitCounts: locations.map((location) => {
        const buildingIds = buildings
          .filter((building) => building.locationId === location.id)
          .map((building) => building.id);

        return units.filter((unit) =>
          buildingIds.includes(unit.buildingId),
        ).length;
      }),
      monthlyCollections,
    };
  }
}

export const dashboardService = new DashboardService();
