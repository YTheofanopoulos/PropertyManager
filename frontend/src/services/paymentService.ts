import type { PaymentMethod } from "../models/domain";
import { apiRequest } from "../repositories/apiClient";
export interface PaymentAllocationInput { obligationId:number; amount:number; }
export interface PaymentSaveInput { leaseId:number; tenantId?:number; receivedDate:string; amount:number; paymentMethod:PaymentMethod; reference:string; notes:string; allocations:PaymentAllocationInput[]; }
export interface PaymentListRow { id:number;leaseId:number;tenantId?:number;receivedDate:string;amount:number;paymentMethod:PaymentMethod;reference:string;notes:string;source:string;status:string;voidedAt?:string;voidReason?:string;createdAt:string;unitLabel:string;allocated:number;unapplied:number;effectiveStatus:string; }
export class PaymentService {
  list(){return apiRequest<PaymentListRow[]>("/api/v1/payments");}
  async save(input:PaymentSaveInput):Promise<number>{const row=await apiRequest<{id:number}>("/api/v1/payments",{method:"POST",body:JSON.stringify(input)});return row.id;}
  voidPayment(paymentId:number,reason:string){return apiRequest<void>(`/api/v1/payments/${paymentId}/void`,{method:"POST",body:JSON.stringify({reason})});}
}
export const paymentService=new PaymentService();
