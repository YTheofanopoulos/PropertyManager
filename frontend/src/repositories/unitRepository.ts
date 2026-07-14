
import { db } from "../db/database";
import type { Unit, UnitListItem } from "../models/domain";
import type { Repository } from "./repository";

export class DexieUnitRepository implements Repository<Unit> {
  getAll(): Promise<Unit[]> {
    return db.units.toArray();
  }

  getById(id: number): Promise<Unit | undefined> {
    return db.units.get(id);
  }

  async add(entity: Omit<Unit, "id">): Promise<number> {
    return Number(await db.units.add(entity));
  }

  async update(
    id: number,
    changes: Partial<Omit<Unit, "id">>,
  ): Promise<void> {
    await db.units.update(id, changes);
  }

  async delete(id: number): Promise<void> {
    await db.units.delete(id);
  }

  async getListItems(): Promise<UnitListItem[]> {
    const today = new Date().toISOString().slice(0, 10);
    const [units, buildings, locations, leases, charges] = await Promise.all([
      db.units.toArray(),
      db.buildings.toArray(),
      db.locations.toArray(),
      db.leases.toArray(),
      db.recurringCharges.toArray(),
    ]);

    const buildingMap = new Map(buildings.map((item) => [item.id, item]));
    const locationMap = new Map(locations.map((item) => [item.id, item]));

    return units.map((unit) => {
      const building = buildingMap.get(unit.buildingId);
      const location = building
        ? locationMap.get(building.locationId)
        : undefined;

      const applicableLease = leases
        .filter((lease) => {
          if (lease.unitId !== unit.id) return false;
          if (lease.status === "Expired" || lease.status === "Terminated") {
            return false;
          }

          const hasStarted = lease.startDate <= today;
          const hasNotEnded =
            lease.termType === "Month-to-Month" ||
            !lease.endDate ||
            lease.endDate >= today;

          return hasStarted && hasNotEnded;
        })
        .sort((left, right) =>
          right.startDate.localeCompare(left.startDate),
        )[0];

      const apartmentRent = applicableLease
        ? charges.find(
            (charge) =>
              charge.leaseId === applicableLease.id &&
              charge.chargeType === "Apartment Rent" &&
              charge.frequency === "Monthly" &&
              charge.startDate <= today &&
              (!charge.endDate || charge.endDate >= today),
          )?.amount
        : undefined;

      return {
        ...unit,
        street: location?.name ?? "Unknown",
        civicAddress: building?.civicAddress ?? "Unknown",
        effectiveRent: apartmentRent ?? unit.monthlyRent,
        rentSource:
          apartmentRent !== undefined ? "Active Lease" : "Market Rent",
      };
    });
  }
}

export const unitRepository = new DexieUnitRepository();
