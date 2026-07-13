
import { db } from "../db/database";
import type {
  Lease,
  LeaseListItem,
  LeaseParticipant,
  RecurringCharge,
} from "../models/domain";
import type { Repository } from "./repository";

export class DexieLeaseRepository implements Repository<Lease> {
  getAll(): Promise<Lease[]> {
    return db.leases.toArray();
  }

  getById(id: number): Promise<Lease | undefined> {
    return db.leases.get(id);
  }

  add(entity: Omit<Lease, "id">): Promise<number> {
    return db.leases.add(entity) as Promise<number>;
  }

  async update(id: number, changes: Partial<Omit<Lease, "id">>): Promise<void> {
    await db.leases.update(id, changes);
  }

  async delete(id: number): Promise<void> {
    await db.leases.delete(id);
  }

  getParticipants(leaseId: number): Promise<LeaseParticipant[]> {
    return db.leaseParticipants.where("leaseId").equals(leaseId).toArray();
  }

  getCharges(leaseId: number): Promise<RecurringCharge[]> {
    return db.recurringCharges.where("leaseId").equals(leaseId).toArray();
  }

  async getListItems(): Promise<LeaseListItem[]> {
    const [leases, participants, charges] = await Promise.all([
      db.leases.toArray(),
      db.leaseParticipants.toArray(),
      db.recurringCharges.toArray(),
    ]);
    const tenants = new Map((await db.tenants.toArray()).map((item) => [item.id, item]));
    const units = new Map((await db.units.toArray()).map((item) => [item.id, item]));
    const buildings = new Map((await db.buildings.toArray()).map((item) => [item.id, item]));
    const locations = new Map((await db.locations.toArray()).map((item) => [item.id, item]));

    return leases.map((lease) => {
      const unit = units.get(lease.unitId);
      const building = unit ? buildings.get(unit.buildingId) : undefined;
      const location = building ? locations.get(building.locationId) : undefined;
      const leaseholders = participants
        .filter((item) => item.leaseId === lease.id)
        .sort((left, right) => Number(right.primary) - Number(left.primary))
        .map((item) => tenants.get(item.tenantId))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map((item) => `${item.firstName} ${item.lastName}`);

      return {
        ...lease,
        street: location?.name ?? "Unknown",
        apartment: `${building?.civicAddress ?? "?"}${unit?.apartmentNumber ? ` ${unit.apartmentNumber}` : ""}`,
        leaseholders,
        monthlyTotal: charges
          .filter((item) => item.leaseId === lease.id && item.frequency === "Monthly")
          .reduce((total, item) => total + item.amount, 0),
      };
    });
  }
}

export const leaseRepository = new DexieLeaseRepository();
