
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "datatables.net-bs5/css/dataTables.bootstrap5.min.css";
import "./styles/app.css";
import "bootstrap";
import { route } from "./app/router";
import { renderShell } from "./app/shell";
import { db } from "./db/database";
import { seedDatabase } from "./db/seed";
async function start(){await seedDatabase(); const container=renderShell(); window.addEventListener("hashchange",()=>void route(container)); document.getElementById("reset-data")?.addEventListener("click",async()=>{if(!confirm("Reset browser data to the sample portfolio?"))return; await seedDatabase(true); await route(container); alert("Sample data restored.");}); document.getElementById("export-data")?.addEventListener("click",async()=>{const backup={exportedAt:new Date().toISOString(),locations:await db.locations.toArray(),buildings:await db.buildings.toArray(),units:await db.units.toArray(),tenants:await db.tenants.toArray(),leases:await db.leases.toArray(),leaseParticipants:await db.leaseParticipants.toArray(),recurringCharges:await db.recurringCharges.toArray(),rentObligations:await db.rentObligations.toArray(),payments:await db.payments.toArray(),paymentAllocations:await db.paymentAllocations.toArray(),bankImportBatches:await db.bankImportBatches.toArray(),bankTransactions:await db.bankTransactions.toArray()}; const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`property-manager-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);}); await route(container);}
void start();
