import type {BankImportBatch,BankTransaction,ParsedQfxStatement} from "../models/domain";
import {apiRequest} from "../repositories/apiClient";
export interface ImportPreviewRow{externalId:string;postedDate:string;amount:number;transactionType:string;name:string;memo:string;result:"New"|"Duplicate";}
export interface ImportPreview{filename:string;statement:ParsedQfxStatement;rows:ImportPreviewRow[];newCount:number;duplicateCount:number;totalCredits:number;totalDebits:number;}
export class BankImportService{
 listBatches(){return apiRequest<BankImportBatch[]>("/api/v1/bank/batches");}
 listTransactions(){return apiRequest<BankTransaction[]>("/api/v1/bank/transactions");}
 getTransaction(id:number){return apiRequest<BankTransaction>(`/api/v1/bank/transactions/${id}`);}
 async preview(filename:string,statement:ParsedQfxStatement):Promise<ImportPreview>{
  const duplicates=await apiRequest<Record<string,boolean>>("/api/v1/bank/preview",{method:"POST",body:JSON.stringify(statement)});
  const rows=statement.transactions.map(row=>({...row,result:(duplicates[row.externalId]?"Duplicate":"New") as "Duplicate"|"New"}));
  return{filename,statement,rows,newCount:rows.filter(r=>r.result==="New").length,duplicateCount:rows.filter(r=>r.result==="Duplicate").length,totalCredits:rows.filter(r=>r.amount>0).reduce((t,r)=>t+r.amount,0),totalDebits:rows.filter(r=>r.amount<0).reduce((t,r)=>t+Math.abs(r.amount),0)};
 }
 async commit(preview:ImportPreview):Promise<number>{const result=await apiRequest<{id:number}>("/api/v1/bank/imports",{method:"POST",body:JSON.stringify(preview)});return result.id;}
 ignore(id:number,reason:string){return apiRequest<void>(`/api/v1/bank/transactions/${id}/ignore`,{method:"POST",body:JSON.stringify({reason})});}
}
export const bankImportService=new BankImportService();
