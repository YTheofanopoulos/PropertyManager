
import { db } from "../db/database";
import type { RentObligation, RentRollRow } from "../models/domain";
const monthKey=(d:string)=>d.slice(0,7);
function nextMonth(p:string){const [y,m]=p.split("-").map(Number);return new Date(y,m,1).toISOString().slice(0,7);}
export class RentLedgerService {
  async ensureObligationsThrough(period:string):Promise<void>{
    const [leases,charges]=await Promise.all([db.leases.toArray(),db.recurringCharges.toArray()]);
    await db.transaction("rw",db.rentObligations,async()=>{
      for(const lease of leases){ if(lease.status==="Terminated") continue; let cur=monthKey(lease.startDate); const end=lease.termType==="Month-to-Month"||!lease.endDate?period:monthKey(lease.endDate);
        while(cur<=period&&cur<=end){const exists=await db.rentObligations.where("[leaseId+rentPeriod]").equals([lease.id as number,cur]).first();
          if(!exists){const expected=charges.filter(c=>c.leaseId===lease.id&&c.frequency==="Monthly"&&monthKey(c.startDate)<=cur&&(!c.endDate||monthKey(c.endDate)>=cur)).reduce((t,c)=>t+c.amount,0);if(expected>0) await db.rentObligations.add({leaseId:lease.id as number,rentPeriod:cur,expectedAmount:expected,status:"Unpaid",createdAt:new Date().toISOString()} satisfies RentObligation);} cur=nextMonth(cur);
        }
      }
    }); await this.refreshAllStatuses();
  }
  async refreshAllStatuses(){const [obs,allocs]=await Promise.all([db.rentObligations.toArray(),db.paymentAllocations.toArray()]);await db.transaction("rw",db.rentObligations,async()=>{for(const o of obs){const paid=allocs.filter(a=>a.obligationId===o.id).reduce((t,a)=>t+a.amount,0);const status=paid===0?"Unpaid":paid<o.expectedAmount?"Partially Paid":paid===o.expectedAmount?"Paid":"Overpaid";await db.rentObligations.update(o.id as number,{status});}})}
  async getOutstandingObligations(leaseId:number){const obs=await db.rentObligations.where("leaseId").equals(leaseId).sortBy("rentPeriod");const allocs=await db.paymentAllocations.toArray();return obs.map(o=>{const paid=allocs.filter(a=>a.obligationId===o.id).reduce((t,a)=>t+a.amount,0);return {...o,paid,balance:Math.max(o.expectedAmount-paid,0)}}).filter(x=>x.balance>0.005)}
  async getRentRoll(period:string):Promise<RentRollRow[]>{await this.ensureObligationsThrough(period);const [leases,obs,allocs,units,buildings,locations,parts,tenants]=await Promise.all([db.leases.toArray(),db.rentObligations.toArray(),db.paymentAllocations.toArray(),db.units.toArray(),db.buildings.toArray(),db.locations.toArray(),db.leaseParticipants.toArray(),db.tenants.toArray()]);const um=new Map(units.map(x=>[x.id,x])),bm=new Map(buildings.map(x=>[x.id,x])),lm=new Map(locations.map(x=>[x.id,x])),tm=new Map(tenants.map(x=>[x.id,x]));const paid=(id?:number)=>id?allocs.filter(a=>a.obligationId===id).reduce((t,a)=>t+a.amount,0):0;
    return leases.filter(l=>monthKey(l.startDate)<=period).map(l=>{const list=obs.filter(o=>o.leaseId===l.id&&o.rentPeriod<=period).sort((a,b)=>a.rentPeriod.localeCompare(b.rentPeriod));const cur=list.find(o=>o.rentPeriod===period);const prior=list.filter(o=>o.rentPeriod<period);const priorBalance=prior.reduce((t,o)=>t+Math.max(o.expectedAmount-paid(o.id),0),0);const currentBalance=cur?Math.max(cur.expectedAmount-paid(cur.id),0):0;const unpaid=list.filter(o=>o.expectedAmount-paid(o.id)>0.005);const u=um.get(l.unitId),b=u?bm.get(u.buildingId):undefined,loc=b?lm.get(b.locationId):undefined;const pl=parts.filter(x=>x.leaseId===l.id).sort((a,b)=>(a.sortOrder??999)-(b.sortOrder??999)).find(x=>x.primary)??parts.find(x=>x.leaseId===l.id);const ten=pl?tm.get(pl.tenantId):undefined;const total=priorBalance+currentBalance;return {leaseId:l.id as number,unitLabel:`${b?.civicAddress??"?"}${u?.apartmentNumber?` ${u.apartmentNumber}`:""} ${loc?.name??""}`.trim(),primaryTenant:ten?`${ten.firstName} ${ten.lastName}`:"Unknown",selectedPeriod:period,currentMonthDue:cur?.expectedAmount??0,currentMonthPaid:paid(cur?.id),priorBalance,totalOutstanding:total,oldestUnpaidPeriod:unpaid[0]?.rentPeriod??"",monthsInArrears:unpaid.filter(o=>o.rentPeriod<period).length,status:total<=.005?"Current":priorBalance>.005?"In Arrears":"Partial"} satisfies RentRollRow})
  }
}
export const rentLedgerService=new RentLedgerService();
