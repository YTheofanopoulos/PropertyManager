
import { db } from "../db/database";
import type {
  Lease,
  LeaseListItem,
  LeaseParticipant,
  RecurringCharge,
  LeaseConcession,
  LeaseHistoryItem,
} from "../models/domain";
import type { Repository } from "./repository";
import { apiRequest } from "./apiClient";
import { repositoryConfiguration } from "./repositoryConfiguration";

export interface LeaseRepository extends Repository<Lease> {
  getParticipants(leaseId:number):Promise<LeaseParticipant[]>;
  getCharges(leaseId:number):Promise<RecurringCharge[]>;
  getConcessions(leaseId:number):Promise<LeaseConcession[]>;
  getListItems():Promise<LeaseListItem[]>;
  getHistory(leaseId:number):Promise<LeaseHistoryItem[]>;
}

export class DexieLeaseRepository implements LeaseRepository {
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

  getConcessions(leaseId: number): Promise<LeaseConcession[]> {
    return db.leaseConcessions.where("leaseId").equals(leaseId).toArray();
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
        .sort((left, right) =>
          Number(right.primary) - Number(left.primary) ||
          (left.sortOrder ?? Number.MAX_SAFE_INTEGER) -
            (right.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
          Number(left.id ?? 0) - Number(right.id ?? 0),
        )
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

  async getHistory(leaseId:number):Promise<LeaseHistoryItem[]> {
    const lease=await this.getById(leaseId);
    if(!lease)return [];
    const charges=await db.recurringCharges.toArray();
    return (await db.leases.where("unitId").equals(lease.unitId).sortBy("startDate")).map(item=>({
      id:item.id!, previousLeaseId:item.previousLeaseId, startDate:item.startDate,
      endDate:item.endDate, termType:item.termType??"Fixed", status:item.status,
      renewalStatus:item.renewalStatus??"Not Started",
      monthlyTotal:charges.filter(c=>c.leaseId===item.id&&c.frequency==="Monthly").reduce((s,c)=>s+c.amount,0),
    }));
  }
}

export class ApiLeaseRepository implements LeaseRepository {
  getAll(){return apiRequest<LeaseListItem[]>("/api/v1/leases");}
  getById(id:number){return apiRequest<Lease>(`/api/v1/leases/${id}`);}
  async add(_entity:Omit<Lease,"id">):Promise<number>{throw new Error("Use LeaseService to create leases.");}
  async update(_id:number,_changes:Partial<Omit<Lease,"id">>):Promise<void>{throw new Error("Use LeaseService to update leases.");}
  async delete(_id:number):Promise<void>{throw new Error("Lease deletion is not supported.");}
  getParticipants(id:number){return apiRequest<LeaseParticipant[]>(`/api/v1/leases/${id}/participants`);}
  getCharges(id:number){return apiRequest<RecurringCharge[]>(`/api/v1/leases/${id}/charges`);}
  getConcessions(id:number){return apiRequest<LeaseConcession[]>(`/api/v1/leases/${id}/concessions`);}
  getListItems(){return apiRequest<LeaseListItem[]>("/api/v1/leases");}
  getHistory(id:number){return apiRequest<LeaseHistoryItem[]>(`/api/v1/leases/${id}/history`);}
}

export const leaseRepository:LeaseRepository=repositoryConfiguration.leases==="api"?new ApiLeaseRepository():new DexieLeaseRepository();
