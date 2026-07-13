
import { db } from "../db/database";
import type { LeaseListItem } from "../models/domain";
export class DexieLeaseRepository {
 async getListItems():Promise<LeaseListItem[]> {
  const leases=await db.leases.toArray(), participants=await db.leaseParticipants.toArray();
  const tenants=new Map((await db.tenants.toArray()).map(x=>[x.id,x])), units=new Map((await db.units.toArray()).map(x=>[x.id,x])), buildings=new Map((await db.buildings.toArray()).map(x=>[x.id,x])), locations=new Map((await db.locations.toArray()).map(x=>[x.id,x]));
  return leases.map(lease=>{const unit=units.get(lease.unitId), b=unit?buildings.get(unit.buildingId):undefined, l=b?locations.get(b.locationId):undefined; const leaseholders=participants.filter(p=>p.leaseId===lease.id).sort((a,b)=>Number(b.primary)-Number(a.primary)).map(p=>tenants.get(p.tenantId)).filter((t):t is NonNullable<typeof t>=>Boolean(t)).map(t=>`${t.firstName} ${t.lastName}`); return {...lease,street:l?.name??"Unknown",apartment:`${b?.civicAddress??"?"}${unit?.apartmentNumber?` ${unit.apartmentNumber}`:""}`,leaseholders};});
 }
}
export const leaseRepository=new DexieLeaseRepository();
