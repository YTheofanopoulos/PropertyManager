import type {BankImportBatch,BankTransaction,Building,Lease,LeaseParticipant,Location,Payment,PaymentAllocation,RecurringCharge,ReconciliationHistory,RentObligation,Tenant,Unit} from "../models/domain";
import {apiRequest} from "../repositories/apiClient";
export interface FinancialContext{units:Unit[];buildings:Building[];locations:Location[];leases:Lease[];recurringCharges:RecurringCharge[];participants:LeaseParticipant[];tenants:Tenant[];payments:Payment[];obligations:Array<RentObligation&{paid:number;remaining:number;balance:number}>;allocations:PaymentAllocation[];history:ReconciliationHistory[];}
export const financialContextService={get:(throughPeriod:string)=>apiRequest<FinancialContext>(`/api/v1/financial/context?throughPeriod=${encodeURIComponent(throughPeriod)}`)};
export interface BankData{batches:BankImportBatch[];transactions:BankTransaction[];}
