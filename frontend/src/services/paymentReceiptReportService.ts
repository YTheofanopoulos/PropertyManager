
import type { PaymentSource } from "../models/domain";
import {locationRepository} from "../repositories/locationRepository";
import {buildingRepository} from "../repositories/buildingRepository";
import {financialContextService} from "./financialContextService";
import {applicationClock} from "./applicationClockService";

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
  locationId: number;
  unitLabel: string;
  amounts: Record<string, number>;
  total: number;
  transactionsByPeriod: Record<
    string,
    PaymentReceiptTransaction[]
  >;
}

export interface PaymentReceiptReport {
  locationId?: number;
  locationName?: string;
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
  async locationOptions(): Promise<
    Array<{ id: number; label: string }>
  > {
    const locations = await locationRepository.getAll();

    return locations
      .map((location) => ({
        id: location.id as number,
        label: location.name,
      }))
      .sort((left, right) =>
        left.label.localeCompare(right.label, undefined, {
          numeric: true,
        }),
      );
  }

  async buildingOptions(
    locationId?: number,
  ): Promise<Array<{ id: number; locationId: number; label: string }>> {
    const [buildings, locations] = await Promise.all([
      buildingRepository.getAll(),
      locationRepository.getAll(),
    ]);
    const locationMap = new Map(
      locations.map((location) => [location.id, location]),
    );

    return buildings
      .filter(
        (building) =>
          !locationId || building.locationId === locationId,
      )
      .map((building) => ({
        id: building.id as number,
        locationId: building.locationId,
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
    locationId?: number,
  ): Promise<PaymentReceiptReport> {
    if (periods.length === 0) {
      return {
        locationId,
        rows: [],
        monthlySummaries: [],
        grandTotal: 0,
        totalTransactionCount: 0,
        voidedExcluded: 0,
        voidedCount: 0,
      };
    }

    const context=await financialContextService.get(applicationClock.currentPeriod());
    const {units,buildings,locations,leases,payments}=context;

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
      .filter((unit) => {
        if (unit.active === false) return false;
        if (buildingId && unit.buildingId !== buildingId) {
          return false;
        }

        const building = buildingMap.get(unit.buildingId);
        if (
          locationId &&
          building?.locationId !== locationId
        ) {
          return false;
        }

        return true;
      })
      .map((unit) => {
        const building = buildingMap.get(unit.buildingId);
        const location = building
          ? locationMap.get(building.locationId)
          : undefined;

        return {
          unit,
          building,
          location,
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
        locationId: item.building?.locationId ?? 0,
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
      const building = unit
        ? buildingMap.get(unit.buildingId)
        : undefined;

      if (
        !unit ||
        (buildingId && unit.buildingId !== buildingId) ||
        (locationId && building?.locationId !== locationId)
      ) {
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
      locationId,
      locationName: locationId
        ? locationMap.get(locationId)?.name
        : undefined,
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
