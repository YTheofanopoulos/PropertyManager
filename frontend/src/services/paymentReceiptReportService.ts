
import { db } from "../db/database";
import type { PaymentSource } from "../models/domain";

export interface PaymentReceiptTransaction {
  paymentId: number;
  unitId: number;
  unitLabel: string;
  transactionDate: string;
  amount: number;
  source: PaymentSource;
  method: string;
  reference: string;
  notes: string;
}

export interface PaymentReceiptMonthSummary {
  period: string;
  bankImported: number;
  manual: number;
  total: number;
  transactionCount: number;
  voidedExcluded: number;
  voidedCount: number;
}

export interface PaymentReceiptRow {
  unitId: number;
  buildingId: number;
  unitLabel: string;
  amounts: Record<string, number>;
  total: number;
  transactionsByPeriod: Record<
    string,
    PaymentReceiptTransaction[]
  >;
}

export interface PaymentReceiptReport {
  rows: PaymentReceiptRow[];
  monthlySummaries: PaymentReceiptMonthSummary[];
  grandTotal: number;
  totalTransactionCount: number;
  voidedExcluded: number;
  voidedCount: number;
}

function unitLabel(
  civicAddress: string,
  apartmentNumber: string,
  street: string,
): string {
  const prefix = apartmentNumber
    ? `${civicAddress}-${apartmentNumber}`
    : civicAddress;

  return `${prefix} ${street}`.trim();
}

export class PaymentReceiptReportService {
  async buildingOptions(): Promise<
    Array<{ id: number; label: string }>
  > {
    const [buildings, locations] = await Promise.all([
      db.buildings.toArray(),
      db.locations.toArray(),
    ]);
    const locationMap = new Map(
      locations.map((location) => [location.id, location]),
    );

    return buildings
      .map((building) => ({
        id: building.id as number,
        label: `${building.civicAddress} ${
          locationMap.get(building.locationId)?.name ?? ""
        }`.trim(),
      }))
      .sort((left, right) =>
        left.label.localeCompare(right.label, undefined, {
          numeric: true,
        }),
      );
  }

  async generate(
    periods: string[],
    buildingId?: number,
  ): Promise<PaymentReceiptReport> {
    if (periods.length === 0) {
      return {
        rows: [],
        monthlySummaries: [],
        grandTotal: 0,
        totalTransactionCount: 0,
        voidedExcluded: 0,
        voidedCount: 0,
      };
    }

    const [
      units,
      buildings,
      locations,
      leases,
      payments,
    ] = await Promise.all([
      db.units.toArray(),
      db.buildings.toArray(),
      db.locations.toArray(),
      db.leases.toArray(),
      db.payments.toArray(),
    ]);

    const buildingMap = new Map(
      buildings.map((building) => [building.id, building]),
    );
    const locationMap = new Map(
      locations.map((location) => [location.id, location]),
    );
    const unitMap = new Map(
      units.map((unit) => [unit.id, unit]),
    );
    const leaseMap = new Map(
      leases.map((lease) => [lease.id, lease]),
    );

    const selectedUnits = units
      .filter(
        (unit) =>
          unit.active !== false &&
          (!buildingId || unit.buildingId === buildingId),
      )
      .map((unit) => {
        const building = buildingMap.get(unit.buildingId);
        const location = building
          ? locationMap.get(building.locationId)
          : undefined;

        return {
          unit,
          label: unitLabel(
            building?.civicAddress ?? "?",
            unit.apartmentNumber,
            location?.name ?? "",
          ),
        };
      });

    const rows = new Map<number, PaymentReceiptRow>();
    for (const item of selectedUnits) {
      rows.set(item.unit.id as number, {
        unitId: item.unit.id as number,
        buildingId: item.unit.buildingId,
        unitLabel: item.label,
        amounts: Object.fromEntries(
          periods.map((period) => [period, 0]),
        ),
        total: 0,
        transactionsByPeriod: Object.fromEntries(
          periods.map((period) => [period, []]),
        ),
      });
    }

    const summaryMap = new Map<
      string,
      PaymentReceiptMonthSummary
    >(
      periods.map((period) => [
        period,
        {
          period,
          bankImported: 0,
          manual: 0,
          total: 0,
          transactionCount: 0,
          voidedExcluded: 0,
          voidedCount: 0,
        },
      ]),
    );

    let grandTotal = 0;
    let totalTransactionCount = 0;
    let voidedExcluded = 0;
    let voidedCount = 0;

    for (const payment of payments) {
      const period = payment.receivedDate.slice(0, 7);
      if (!summaryMap.has(period)) continue;

      const lease = leaseMap.get(payment.leaseId);
      const unit = lease ? unitMap.get(lease.unitId) : undefined;
      if (!unit || (buildingId && unit.buildingId !== buildingId)) {
        continue;
      }

      const row = rows.get(unit.id as number);
      if (!row) continue;

      const summary = summaryMap.get(period)!;

      if ((payment.status ?? "Posted") === "Voided") {
        summary.voidedExcluded += payment.amount;
        summary.voidedCount += 1;
        voidedExcluded += payment.amount;
        voidedCount += 1;
        continue;
      }

      const transaction: PaymentReceiptTransaction = {
        paymentId: payment.id as number,
        unitId: unit.id as number,
        unitLabel: row.unitLabel,
        transactionDate: payment.receivedDate,
        amount: payment.amount,
        source: payment.source,
        method: payment.paymentMethod,
        reference: payment.reference,
        notes: payment.notes,
      };

      row.amounts[period] =
        (row.amounts[period] ?? 0) + payment.amount;
      row.total += payment.amount;
      row.transactionsByPeriod[period]?.push(transaction);

      if (payment.source === "Bank Import") {
        summary.bankImported += payment.amount;
      } else {
        summary.manual += payment.amount;
      }
      summary.total += payment.amount;
      summary.transactionCount += 1;
      grandTotal += payment.amount;
      totalTransactionCount += 1;
    }

    for (const row of rows.values()) {
      for (const period of periods) {
        row.transactionsByPeriod[period]?.sort(
          (left, right) =>
            left.transactionDate.localeCompare(
              right.transactionDate,
            ) || left.paymentId - right.paymentId,
        );
      }
    }

    return {
      rows: [...rows.values()].sort((left, right) =>
        left.unitLabel.localeCompare(
          right.unitLabel,
          undefined,
          { numeric: true },
        ),
      ),
      monthlySummaries: periods.map(
        (period) => summaryMap.get(period)!,
      ),
      grandTotal,
      totalTransactionCount,
      voidedExcluded,
      voidedCount,
    };
  }
}

export const paymentReceiptReportService =
  new PaymentReceiptReportService();
