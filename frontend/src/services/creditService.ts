import { db } from "../db/database";
import { rentLedgerService } from "./rentLedgerService";
import { applicationClock } from "./applicationClockService";

export interface UnappliedCreditRow { paymentId:number; leaseId:number; receivedDate:string; reference:string; amount:number; allocated:number; remaining:number; unitLabel:string; tenantName:string; }

export class CreditService {
  async list(): Promise<UnappliedCreditRow[]> {
    const [payments, allocations, leases, units, buildings, locations, participants, tenants] = await Promise.all([
      db.payments.toArray(), db.paymentAllocations.toArray(), db.leases.toArray(), db.units.toArray(), db.buildings.toArray(), db.locations.toArray(), db.leaseParticipants.toArray(), db.tenants.toArray(),
    ]);
    const allocated = new Map<number,number>();
    allocations.forEach(a => allocated.set(a.paymentId, (allocated.get(a.paymentId) ?? 0) + a.amount));
    return payments.filter(p => (p.status ?? "Posted") === "Posted").map(payment => {
      const used=allocated.get(payment.id!) ?? 0; const remaining=Math.max(payment.amount-used,0);
      const lease=leases.find(l=>l.id===payment.leaseId); const unit=units.find(u=>u.id===lease?.unitId); const building=buildings.find(b=>b.id===unit?.buildingId); const location=locations.find(l=>l.id===building?.locationId);
      const primary=participants.filter(x=>x.leaseId===payment.leaseId).sort((a,b)=>Number(b.primary)-Number(a.primary)||(a.sortOrder??0)-(b.sortOrder??0))[0];
      const tenant=tenants.find(t=>t.id===primary?.tenantId);
      return {paymentId:payment.id!, leaseId:payment.leaseId, receivedDate:payment.receivedDate, reference:payment.reference || "—", amount:payment.amount, allocated:used, remaining, unitLabel:[building?.civicAddress, unit?.apartmentNumber, location?.name].filter(Boolean).join(" · "), tenantName:tenant?`${tenant.firstName} ${tenant.lastName}`:"—"};
    }).filter(r=>r.remaining>.005).sort((a,b)=>a.receivedDate.localeCompare(b.receivedDate));
  }
  async obligations(leaseId:number){ await rentLedgerService.ensureObligationsThrough(applicationClock.currentPeriod()); const obs=await db.rentObligations.where("leaseId").equals(leaseId).toArray(); const alloc=await db.paymentAllocations.toArray(); return obs.map(o=>{const paid=alloc.filter(a=>a.obligationId===o.id).reduce((t,a)=>t+a.amount,0); return {...o,paid,remaining:Math.max(o.expectedAmount-paid,0)};}).filter(o=>o.remaining>.005).sort((a,b)=>a.rentPeriod.localeCompare(b.rentPeriod)); }
  async apply(paymentId:number, obligationId:number, amount:number):Promise<void>{
    if(amount<=0) throw new Error("Credit amount must be greater than zero."); const payment=await db.payments.get(paymentId); const obligation=await db.rentObligations.get(obligationId); if(!payment||!obligation) throw new Error("Payment or obligation not found."); if(payment.leaseId!==obligation.leaseId) throw new Error("Credit and charge must belong to the same lease.");
    const used=(await db.paymentAllocations.where("paymentId").equals(paymentId).toArray()).reduce((t,a)=>t+a.amount,0); const paid=(await db.paymentAllocations.where("obligationId").equals(obligationId).toArray()).reduce((t,a)=>t+a.amount,0); const available=payment.amount-used; const due=obligation.expectedAmount-paid; if(amount-available>.005) throw new Error("Amount exceeds available credit."); if(amount-due>.005) throw new Error("Amount exceeds the selected outstanding charge.");
    await db.paymentAllocations.add({paymentId,obligationId,amount}); await rentLedgerService.refreshAllStatuses();
  }
}
export const creditService=new CreditService();
