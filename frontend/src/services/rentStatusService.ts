import { apiRequest } from "../repositories/apiClient";
export type MonthCellState="Paid"|"Paid Ahead"|"Partial"|"Partial Prepayment"|"Unpaid"|"Not Yet Due"|"Not Applicable";
export interface RentStatusMonth {period:string;expected:number;paid:number;remaining:number;collectionRate:number;state:MonthCellState;obligationId?:number;allocations:Array<{paymentId:number;receivedDate:string;amount:number;paymentAmount:number;reference:string;source:string;}>;}
export interface RentStatusOccupant {tenantId:number;name:string;role:"Primary Tenant"|"Additional Tenant";email:string;phone:string;}
export interface RentStatusRow {unitId:number;leaseId?:number;unitLabel:string;tenantNames:string;occupants:RentStatusOccupant[];months:RentStatusMonth[];outstandingToday:number;monthsBehind:number;}
export class RentStatusService {getStatus(periods:string[],currentPeriod:string){return apiRequest<RentStatusRow[]>("/api/v1/rent-ledger/rent-status",{method:"POST",body:JSON.stringify({periods,currentPeriod})});}}
export const rentStatusService=new RentStatusService();
