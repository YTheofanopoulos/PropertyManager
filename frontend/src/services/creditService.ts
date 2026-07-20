import { apiRequest } from "../repositories/apiClient";
import { applicationClock } from "./applicationClockService";
export interface UnappliedCreditRow {paymentId:number;leaseId:number;receivedDate:string;reference:string;amount:number;allocated:number;remaining:number;unitLabel:string;tenantName:string;}
export interface OutstandingCreditObligation {id:number;leaseId:number;rentPeriod:string;expectedAmount:number;paid:number;remaining:number;balance:number;}
export class CreditService {
 list(){return apiRequest<UnappliedCreditRow[]>("/api/v1/credits");}
 async obligations(leaseId:number){await apiRequest<void>("/api/v1/rent-ledger/ensure",{method:"POST",body:JSON.stringify({throughPeriod:applicationClock.currentPeriod()})});return apiRequest<OutstandingCreditObligation[]>(`/api/v1/rent-ledger/leases/${leaseId}/outstanding`);}
 apply(paymentId:number,obligationId:number,amount:number){return apiRequest<void>(`/api/v1/credits/${paymentId}/apply`,{method:"POST",body:JSON.stringify({obligationId,amount})});}
}
export const creditService=new CreditService();
