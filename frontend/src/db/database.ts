
import Dexie, { type EntityTable } from "dexie";
import type { Building, Lease, LeaseParticipant, Location, Tenant, Unit } from "../models/domain";
export class PropertyManagerDatabase extends Dexie {
  locations!: EntityTable<Location, "id">;
  buildings!: EntityTable<Building, "id">;
  units!: EntityTable<Unit, "id">;
  tenants!: EntityTable<Tenant, "id">;
  leases!: EntityTable<Lease, "id">;
  leaseParticipants!: EntityTable<LeaseParticipant, "id">;
  constructor() {
    super("PropertyManager");
    this.version(1).stores({
      locations: "++id, name, city",
      buildings: "++id, locationId, civicAddress, [locationId+civicAddress]",
      units: "++id, buildingId, apartmentNumber, status, [buildingId+apartmentNumber]",
      tenants: "++id, lastName, firstName, email, active",
      leases: "++id, unitId, startDate, endDate, status",
      leaseParticipants: "++id, leaseId, tenantId, primary, [leaseId+tenantId]"
    });
  }
}
export const db = new PropertyManagerDatabase();
