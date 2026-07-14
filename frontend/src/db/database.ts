
import Dexie, { type EntityTable } from "dexie";
import type {
  Building,
  Lease,
  LeaseParticipant,
  Location,
  RecurringCharge,
  Tenant,
  Unit,
} from "../models/domain";

export class PropertyManagerDatabase extends Dexie {
  locations!: EntityTable<Location, "id">;
  buildings!: EntityTable<Building, "id">;
  units!: EntityTable<Unit, "id">;
  tenants!: EntityTable<Tenant, "id">;
  leases!: EntityTable<Lease, "id">;
  leaseParticipants!: EntityTable<LeaseParticipant, "id">;
  recurringCharges!: EntityTable<RecurringCharge, "id">;

  constructor() {
    super("PropertyManager");

    this.version(1).stores({
      locations: "++id, name, city",
      buildings: "++id, locationId, civicAddress, [locationId+civicAddress]",
      units: "++id, buildingId, apartmentNumber, status, [buildingId+apartmentNumber]",
      tenants: "++id, lastName, firstName, email, active",
      leases: "++id, unitId, startDate, endDate, status",
      leaseParticipants: "++id, leaseId, tenantId, primary, [leaseId+tenantId]",
    });

    this.version(2).stores({
      locations: "++id, name, city",
      buildings: "++id, locationId, civicAddress, [locationId+civicAddress]",
      units: "++id, buildingId, apartmentNumber, status, active, [buildingId+apartmentNumber]",
      tenants: "++id, lastName, firstName, email, active",
      leases: "++id, unitId, startDate, endDate, termType, status",
      leaseParticipants: "++id, leaseId, tenantId, primary, [leaseId+tenantId]",
      recurringCharges: "++id, leaseId, chargeType, frequency, startDate, endDate",
    }).upgrade(async (transaction) => {
      await transaction.table("units").toCollection().modify((unit) => {
        if (unit.active === undefined) unit.active = true;
      });

      await transaction.table("leases").toCollection().modify((lease) => {
        if (!lease.termType) lease.termType = "Fixed";
        if (!lease.notes) lease.notes = "";
      });
    });

    this.version(3).stores({
      locations: "++id, name, city",
      buildings: "++id, locationId, civicAddress, [locationId+civicAddress]",
      units: "++id, buildingId, apartmentNumber, status, active, [buildingId+apartmentNumber]",
      tenants: "++id, lastName, firstName, email, active",
      leases: "++id, unitId, startDate, endDate, termType, status",
      leaseParticipants: "++id, leaseId, tenantId, primary, sortOrder, [leaseId+tenantId]",
      recurringCharges: "++id, leaseId, chargeType, frequency, startDate, endDate",
    }).upgrade(async (transaction) => {
      const participants = await transaction.table("leaseParticipants").toArray();
      const byLease = new Map<number, typeof participants>();

      participants.forEach((participant) => {
        const list = byLease.get(participant.leaseId) ?? [];
        list.push(participant);
        byLease.set(participant.leaseId, list);
      });

      for (const list of byLease.values()) {
        list
          .sort((left, right) =>
            Number(right.primary) - Number(left.primary) ||
            Number(left.id ?? 0) - Number(right.id ?? 0),
          )
          .forEach((participant, index) => {
            participant.sortOrder = index;
          });
      }

      await transaction.table("leaseParticipants").bulkPut(participants);
    });

  }
}

export const db = new PropertyManagerDatabase();
