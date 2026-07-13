
import { db } from "../db/database";
import type { Tenant, TenantListItem } from "../models/domain";
import type { Repository } from "./repository";
export class DexieTenantRepository implements Repository<Tenant> {
 getAll(){return db.tenants.toArray();} getById(id:number){return db.tenants.get(id);} async add(entity:Omit<Tenant,"id">){return Number(await db.tenants.add(entity));} async update(id:number,changes:Partial<Omit<Tenant,"id">>){await db.tenants.update(id,changes);} async delete(id:number){await db.tenants.delete(id);}
 async getListItems():Promise<TenantListItem[]> {
  const tenants=await db.tenants.toArray(), participants=await db.leaseParticipants.toArray();
  const leases=new Map((await db.leases.toArray()).map(x=>[x.id,x])), units=new Map((await db.units.toArray()).map(x=>[x.id,x])), buildings=new Map((await db.buildings.toArray()).map(x=>[x.id,x])), locations=new Map((await db.locations.toArray()).map(x=>[x.id,x]));
  return tenants.map(t=>{const ps=participants.filter(p=>p.tenantId===t.id); const apartments=ps.map(p=>{const lease=leases.get(p.leaseId), unit=lease?units.get(lease.unitId):undefined, b=unit?buildings.get(unit.buildingId):undefined, l=b?locations.get(b.locationId):undefined; return `${b?.civicAddress??"?"}${unit?.apartmentNumber?` ${unit.apartmentNumber}`:""} ${l?.name??""}`.trim();}); return {...t,apartments,primaryLeaseCount:ps.filter(p=>p.primary).length};});
 }
}
export const tenantRepository=new DexieTenantRepository();
