import type { RentRollRow } from "../models/domain";
import { apiRequest } from "../repositories/apiClient";
export interface OutstandingObligation {id:number;leaseId:number;rentPeriod:string;expectedAmount:number;status:string;createdAt:string;paid:number;remaining:number;balance:number;}
export class RentLedgerService {
 ensureObligationsThrough(throughPeriod:string){return apiRequest<void>("/api/v1/rent-ledger/ensure",{method:"POST",body:JSON.stringify({throughPeriod})});}
 async refreshAllStatuses():Promise<void>{/* Statuses are maintained transactionally by the backend. */}
 getOutstandingObligations(leaseId:number,_throughPeriod?:string){return apiRequest<OutstandingObligation[]>(`/api/v1/rent-ledger/leases/${leaseId}/outstanding`);}
 getRentRoll(period:string){return apiRequest<RentRollRow[]>(`/api/v1/rent-ledger/rent-roll?period=${encodeURIComponent(period)}`);}
}
export const rentLedgerService=new RentLedgerService();
