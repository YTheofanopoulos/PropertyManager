import { applicationClock } from "./applicationClockService";
import { financialContextService } from "./financialContextService";

export interface DashboardMonthlyCollection {
  period: string;
  label: string;
  collectedAmount: number;
}

export interface DashboardSummary {
  applicationDate: string;
  currentPeriod: string;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  monthlyRent: number;
  collectedCurrentPeriod: number;
  collectionRate: number;
  totalOutstanding: number;
  monthlyCollections: DashboardMonthlyCollection[];
  rentStatus: {
    current: number;
    oneMonthBehind: number;
    twoPlusMonthsBehind: number;
    notDueOrNoLease: number;
  };
  recentPayments: Array<{
    id: number;
    receivedDate: string;
    unitLabel: string;
    tenantName: string;
    amount: number;
    method: string;
  }>;
  upcomingExpirations: Array<{
    leaseId: number;
    unitLabel: string;
    tenantNames: string;
    endDate: string;
    daysLeft: number;
  }>;
  renewalPipeline: Array<{
    window: string;
    notStarted: number;
    letterSent: number;
    renewed: number;
    underDispute: number;
  }>;
  urgentRenewals: Array<{
    leaseId: number;
    unitLabel: string;
    tenantNames: string;
    endDate: string;
    daysLeft: number;
    renewalStatus: string;
    attentionLevel: "Planning" | "Urgent" | "Deadline Passed";
  }>;
}

function addMonths(period: string, amount: number): string {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function activeOn(
  lease: { startDate: string; endDate?: string; status: string },
  date: string,
): boolean {
  return (
    lease.status !== "Terminated" &&
    lease.startDate <= date &&
    (!lease.endDate || lease.endDate >= date)
  );
}

function daysBetween(startDate: string, endDate: string): number {
  return Math.ceil(
    (new Date(`${endDate}T12:00:00`).getTime() -
      new Date(`${startDate}T12:00:00`).getTime()) /
      86_400_000,
  );
}

export class DashboardService {
  async getSummary(): Promise<DashboardSummary> {
    const applicationDate = applicationClock.today();
    const currentPeriod = applicationClock.currentPeriod();
    const context=await financialContextService.get(currentPeriod);
    const {units,buildings,locations,leases,recurringCharges,payments,obligations,allocations,participants,tenants}=context;

    const unitMap = new Map(units.map((item) => [item.id, item]));
    const buildingMap = new Map(buildings.map((item) => [item.id, item]));
    const locationMap = new Map(locations.map((item) => [item.id, item]));
    const leaseMap = new Map(leases.map((item) => [item.id, item]));
    const tenantMap = new Map(tenants.map((item) => [item.id, item]));

    const unitLabel = (unitId: number): string => {
      const unit = unitMap.get(unitId);
      const building = unit ? buildingMap.get(unit.buildingId) : undefined;
      const location = building ? locationMap.get(building.locationId) : undefined;
      return `${building?.civicAddress ?? "?"}${
        unit?.apartmentNumber ? ` ${unit.apartmentNumber}` : ""
      } ${location?.name ?? ""}`.trim();
    };

    const tenantNames = (leaseId: number): string =>
      participants
        .filter((item) => item.leaseId === leaseId)
        .sort(
          (left, right) =>
            Number(right.primary) - Number(left.primary) ||
            (left.sortOrder ?? 999) - (right.sortOrder ?? 999),
        )
        .map((item) => tenantMap.get(item.tenantId))
        .filter((item) => Boolean(item))
        .map((item) => `${item!.firstName} ${item!.lastName}`)
        .join(", ") || "Unknown";

    const activeLeases = leases.filter((lease) =>
      activeOn(lease, applicationDate),
    );
    const activeLeaseIds = new Set(
      activeLeases
        .map((lease) => lease.id)
        .filter((id): id is number => id !== undefined),
    );
    const occupiedUnitIds = new Set(activeLeases.map((lease) => lease.unitId));

    const monthlyRent = recurringCharges
      .filter(
        (charge) =>
          activeLeaseIds.has(charge.leaseId) &&
          charge.frequency === "Monthly" &&
          charge.startDate.slice(0, 7) <= currentPeriod &&
          (!charge.endDate || charge.endDate.slice(0, 7) >= currentPeriod),
      )
      .reduce((total, charge) => total + charge.amount, 0);

    const postedPayments = payments.filter(
      (payment) => (payment.status ?? "Posted") !== "Voided",
    );
    const collectedCurrentPeriod = postedPayments
      .filter((payment) => payment.receivedDate.slice(0, 7) === currentPeriod)
      .reduce((total, payment) => total + payment.amount, 0);

    const paidByObligation = new Map<number, number>();
    for (const allocation of allocations) {
      paidByObligation.set(
        allocation.obligationId,
        (paidByObligation.get(allocation.obligationId) ?? 0) + allocation.amount,
      );
    }

    const balancesByLease = new Map<
      number,
      Array<{ period: string; balance: number }>
    >();
    for (const obligation of obligations) {
      if (obligation.rentPeriod > currentPeriod) continue;
      const balance = Math.max(
        obligation.expectedAmount -
          (paidByObligation.get(obligation.id as number) ?? 0),
        0,
      );
      if (balance <= 0.005) continue;
      const rows = balancesByLease.get(obligation.leaseId) ?? [];
      rows.push({ period: obligation.rentPeriod, balance });
      balancesByLease.set(obligation.leaseId, rows);
    }

    const totalOutstanding = Array.from(balancesByLease.values())
      .flat()
      .reduce((total, item) => total + item.balance, 0);

    const rentStatus = {
      current: 0,
      oneMonthBehind: 0,
      twoPlusMonthsBehind: 0,
      notDueOrNoLease: units.length - occupiedUnitIds.size,
    };
    for (const lease of activeLeases) {
      if (lease.id === undefined) continue;
      const prior = (balancesByLease.get(lease.id) ?? []).filter(
        (item) => item.period < currentPeriod,
      );
      if (prior.length >= 2) rentStatus.twoPlusMonthsBehind += 1;
      else if (prior.length === 1) rentStatus.oneMonthBehind += 1;
      else rentStatus.current += 1;
    }

    const monthlyCollections = Array.from({ length: 6 }, (_, index) =>
      addMonths(currentPeriod, index - 5),
    ).map((period) => ({
      period,
      label: periodLabel(period),
      collectedAmount: postedPayments
        .filter((payment) => payment.receivedDate.slice(0, 7) === period)
        .reduce((total, payment) => total + payment.amount, 0),
    }));

    const recentPayments = postedPayments
      .filter((payment) => payment.receivedDate <= applicationDate)
      .sort(
        (left, right) =>
          right.receivedDate.localeCompare(left.receivedDate) ||
          Number(right.id ?? 0) - Number(left.id ?? 0),
      )
      .slice(0, 5)
      .map((payment) => {
        const lease = leaseMap.get(payment.leaseId);
        return {
          id: payment.id as number,
          receivedDate: payment.receivedDate,
          unitLabel: lease ? unitLabel(lease.unitId) : "Unknown",
          tenantName: lease ? tenantNames(lease.id as number) : "Unknown",
          amount: payment.amount,
          method:
            payment.source === "Bank Import"
              ? "QFX Import"
              : payment.paymentMethod,
        };
      });

    const renewalWindows = [
      { label: "0–30 days", min: 0, max: 30 },
      { label: "31–60 days", min: 31, max: 60 },
      { label: "61–90 days", min: 61, max: 90 },
      { label: "91–180 days", min: 91, max: 180 },
    ];

    const renewalCandidates = leases
      .filter((lease) =>
        lease.id !== undefined &&
        Boolean(lease.endDate) &&
        lease.status !== "Terminated" &&
        lease.endDate >= applicationDate
      )
      .map((lease) => ({
        lease,
        daysLeft: daysBetween(applicationDate, lease.endDate),
        renewalStatus: lease.renewalStatus ?? "Not Started",
      }))
      .filter((item) => item.daysLeft >= 0 && item.daysLeft <= 180);

    const renewalPipeline = renewalWindows.map((window) => {
      const rows = renewalCandidates.filter((item) =>
        item.daysLeft >= window.min && item.daysLeft <= window.max
      );
      return {
        window: window.label,
        notStarted: rows.filter((item) => item.renewalStatus === "Not Started").length,
        letterSent: rows.filter((item) => item.renewalStatus === "Renewal Letter Sent").length,
        renewed: rows.filter((item) => item.renewalStatus === "Renewed").length,
        underDispute: rows.filter((item) => item.renewalStatus === "Under Dispute").length,
      };
    });

    const urgentRenewals = renewalCandidates
      .filter((item) =>
        item.daysLeft <= 180 &&
        item.renewalStatus === "Not Started"
      )
      .sort((left, right) => left.daysLeft - right.daysLeft)
      .slice(0, 5)
      .map((item) => ({
        leaseId: item.lease.id as number,
        unitLabel: unitLabel(item.lease.unitId),
        tenantNames: tenantNames(item.lease.id as number),
        endDate: item.lease.endDate,
        daysLeft: item.daysLeft,
        renewalStatus: item.renewalStatus,
        attentionLevel: (
          item.daysLeft <= 90
            ? "Deadline Passed"
            : item.daysLeft <= 120
              ? "Urgent"
              : "Planning"
        ) as "Planning" | "Urgent" | "Deadline Passed",
      }));

    const upcomingExpirations = leases
      .filter(
        (lease) =>
          lease.id !== undefined &&
          Boolean(lease.endDate) &&
          lease.status !== "Terminated" &&
          lease.endDate! >= applicationDate,
      )
      .map((lease) => ({
        leaseId: lease.id as number,
        unitLabel: unitLabel(lease.unitId),
        tenantNames: tenantNames(lease.id as number),
        endDate: lease.endDate!,
        daysLeft: daysBetween(applicationDate, lease.endDate!),
      }))
      .sort((left, right) => left.endDate.localeCompare(right.endDate))
      .slice(0, 5);

    return {
      applicationDate,
      currentPeriod,
      totalUnits: units.length,
      occupiedUnits: occupiedUnitIds.size,
      vacantUnits: units.length - occupiedUnitIds.size,
      monthlyRent,
      collectedCurrentPeriod,
      collectionRate:
        monthlyRent > 0 ? (collectedCurrentPeriod / monthlyRent) * 100 : 0,
      totalOutstanding,
      monthlyCollections,
      rentStatus,
      recentPayments,
      upcomingExpirations,
      renewalPipeline,
      urgentRenewals,
    };
  }
}

export const dashboardService = new DashboardService();
