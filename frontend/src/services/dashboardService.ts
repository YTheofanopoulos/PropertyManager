
import { db } from "../db/database";
export class DashboardService {
 async getSummary(){
  const [locations,buildings,units,tenants,leases]=await Promise.all([db.locations.toArray(),db.buildings.toArray(),db.units.toArray(),db.tenants.toArray(),db.leases.toArray()]);
  const occupied=units.filter(x=>x.status==="Occupied");
  return {locations,totalUnits:units.length,occupiedUnits:occupied.length,monthlyRent:occupied.reduce((s,x)=>s+x.monthlyRent,0),tenantCount:tenants.length,activeLeaseCount:leases.filter(x=>x.status==="Active").length,locationUnitCounts:locations.map(l=>{const ids=buildings.filter(b=>b.locationId===l.id).map(b=>b.id); return units.filter(u=>ids.includes(u.buildingId)).length;})};
 }
}
export const dashboardService=new DashboardService();
