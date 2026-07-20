
import { db } from "../db/database";
import type { Tenant, TenantListItem } from "../models/domain";
import type { Repository } from "./repository";
import { apiRequest } from "./apiClient";
import { repositoryConfiguration } from "./repositoryConfiguration";
export interface TenantRepository extends Repository<Tenant> { getListItems():Promise<TenantListItem[]>; }
export class DexieTenantRepository implements TenantRepository {
 getAll(){return db.tenants.toArray();} getById(id:number){return db.tenants.get(id);} async add(entity:Omit<Tenant,"id">){return Number(await db.tenants.add(entity));} async update(id:number,changes:Partial<Omit<Tenant,"id">>){await db.tenants.update(id,changes);} async delete(id:number){await db.tenants.delete(id);}
 async getListItems():Promise<TenantListItem[]> {
  const tenants=await db.tenants.toArray(), participants=await db.leaseParticipants.toArray();
  const leases=new Map((await db.leases.toArray()).map(x=>[x.id,x])), units=new Map((await db.units.toArray()).map(x=>[x.id,x])), buildings=new Map((await db.buildings.toArray()).map(x=>[x.id,x])), locations=new Map((await db.locations.toArray()).map(x=>[x.id,x]));
  return tenants.map(t=>{const ps=participants.filter(p=>p.tenantId===t.id); const apartments=ps.map(p=>{const lease=leases.get(p.leaseId), unit=lease?units.get(lease.unitId):undefined, b=unit?buildings.get(unit.buildingId):undefined, l=b?locations.get(b.locationId):undefined; return `${b?.civicAddress??"?"}${unit?.apartmentNumber?` ${unit.apartmentNumber}`:""} ${l?.name??""}`.trim();}); return {...t,apartments,primaryLeaseCount:ps.filter(p=>p.primary).length};});
 }
}
export class ApiTenantRepository implements TenantRepository {
 getAll(){return apiRequest<TenantListItem[]>("/api/v1/tenants");}
 getById(id:number){return apiRequest<Tenant>(`/api/v1/tenants/${id}`);}
 async add(entity:Omit<Tenant,"id">){const row=await apiRequest<Tenant>("/api/v1/tenants",{method:"POST",body:JSON.stringify(entity)});if(row.id===undefined)throw new Error("The backend did not return a tenant identifier.");return row.id;}
 async update(id:number,changes:Partial<Omit<Tenant,"id">>){const current=await this.getById(id);await apiRequest(`/api/v1/tenants/${id}`,{method:"PUT",body:JSON.stringify({...current,...changes})});}
 delete(id:number){return apiRequest<void>(`/api/v1/tenants/${id}`,{method:"DELETE"});}
 getListItems(){return apiRequest<TenantListItem[]>("/api/v1/tenants");}
}
export const tenantRepository:TenantRepository=repositoryConfiguration.tenants==="api"?new ApiTenantRepository():new DexieTenantRepository();
