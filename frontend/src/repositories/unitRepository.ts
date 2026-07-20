
import { db } from "../db/database";
import type { Unit, UnitListItem } from "../models/domain";
import type { Repository } from "./repository";
import { applicationClock } from "../services/applicationClockService";
import { apiRequest } from "./apiClient";
import { repositoryConfiguration } from "./repositoryConfiguration";

export interface UnitRepository extends Repository<Unit> {
  getListItems(): Promise<UnitListItem[]>;
}

export class DexieUnitRepository implements UnitRepository {
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
    const today = applicationClock.today();
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

export class ApiUnitRepository implements UnitRepository {
  getAll(): Promise<Unit[]> {
    return apiRequest<UnitListItem[]>("/api/v1/units");
  }

  getById(id: number): Promise<Unit | undefined> {
    return apiRequest<Unit>(`/api/v1/units/${id}`);
  }

  async add(entity: Omit<Unit, "id">): Promise<number> {
    const created = await apiRequest<Unit>("/api/v1/units", {
      method: "POST",
      body: JSON.stringify(entity),
    });
    if (created.id === undefined) throw new Error("The backend did not return a unit identifier.");
    return created.id;
  }

  async update(id: number, changes: Partial<Omit<Unit, "id">>): Promise<void> {
    const current = await this.getById(id);
    if (!current) throw new Error("Unit not found.");
    await apiRequest<Unit>(`/api/v1/units/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...current, ...changes }),
    });
  }

  delete(id: number): Promise<void> {
    return apiRequest<void>(`/api/v1/units/${id}`, { method: "DELETE" });
  }

  getListItems(): Promise<UnitListItem[]> {
    return apiRequest<UnitListItem[]>("/api/v1/units");
  }
}

export const unitRepository: UnitRepository =
  repositoryConfiguration.units === "api"
    ? new ApiUnitRepository()
    : new DexieUnitRepository();
