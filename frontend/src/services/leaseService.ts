import type { ChargeType, Lease, RenewalStatus } from "../models/domain";
import { apiRequest } from "../repositories/apiClient";

export interface LeaseChargeInput { chargeType:ChargeType; description:string; amount:number; }
export interface LeaseConcessionInput { id?:number; description:string; amount:number; startPeriod:string; endPeriod:string; comment?:string; }
export interface LeaseSaveInput {
  id?:number; unitId:number; startDate:string; endDate:string;
  termType:"Fixed"|"Month-to-Month";
  status:"Active"|"Expired"|"Future"|"Terminated";
  notes:string; renewalStatus:RenewalStatus; renewalLetterSentDate:string;
  renewalProposedRent?:number|null;
  renewalResponseDate:string; renewalNotes:string; participantIds:number[];
  primaryTenantId:number; charges:LeaseChargeInput[];
  concessions:LeaseConcessionInput[];
}

export class LeaseService {
  async save(input:LeaseSaveInput):Promise<number>{
    const lease=await apiRequest<{id:number}>(input.id?`/api/v1/leases/${input.id}`:"/api/v1/leases",{
      method:input.id?"PUT":"POST",body:JSON.stringify(input),
    });
    return lease.id;
  }
  terminate(leaseId:number):Promise<void>{
    return apiRequest<void>(`/api/v1/leases/${leaseId}/terminate`,{method:"POST"});
  }
  renewalDraft(leaseId:number):Promise<{
    sourceLease:Lease; currentRent:number; currentMonthlyTotal:number;
    renewal:LeaseSaveInput;
  }>{return apiRequest(`/api/v1/leases/${leaseId}/renewal-draft`);}
  async createRenewal(leaseId:number,input:LeaseSaveInput):Promise<number>{
    const lease=await apiRequest<{id:number}>(`/api/v1/leases/${leaseId}/renewal`,{
      method:"POST",body:JSON.stringify(input),
    });
    return lease.id;
  }
}
export const leaseService=new LeaseService();
