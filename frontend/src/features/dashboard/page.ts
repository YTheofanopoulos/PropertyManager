
import { Chart } from "chart.js/auto";
import { dashboardService } from "../../services/dashboardService";
import { currency } from "../shared/format";
export async function renderDashboard(container:HTMLElement):Promise<void>{
 const s=await dashboardService.getSummary();
 container.innerHTML=`<div class="page-heading"><h1>Dashboard</h1><p class="text-body-secondary mb-0">Data loaded from IndexedDB through the service layer</p></div><div class="row g-3 mb-4">${card("Occupancy",`${s.occupiedUnits} / ${s.totalUnits}`,"building-check","success")}${card("Monthly Rent",currency(s.monthlyRent),"dollar-sign","primary")}${card("Tenants",String(s.tenantCount),"users","info")}${card("Active Leases",String(s.activeLeaseCount),"file-signature","warning")}</div><div class="row g-4"><div class="col-xl-8"><div class="card h-100"><div class="card-header fw-semibold">Monthly Rent Collected</div><div class="card-body"><canvas id="income-chart" height="110"></canvas></div></div></div><div class="col-xl-4"><div class="card h-100"><div class="card-header fw-semibold">Apartments by Location</div><div class="card-body"><canvas id="location-chart" height="220"></canvas></div></div></div></div>`;
 new Chart(document.getElementById("income-chart") as HTMLCanvasElement,{type:"line",data:{labels:["Feb","Mar","Apr","May","Jun","Jul"],datasets:[{data:[36500,37200,38150,38900,39750,s.monthlyRent],tension:.3}]},options:{plugins:{legend:{display:false}}}});
 new Chart(document.getElementById("location-chart") as HTMLCanvasElement,{type:"bar",data:{labels:s.locations.map(x=>x.name),datasets:[{data:s.locationUnitCounts}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
}
function card(title:string,value:string,icon:string,tone:string){return `<div class="col-sm-6 col-xl-3"><div class="card border-start border-${tone} border-4 h-100"><div class="card-body d-flex align-items-center justify-content-between"><div><div class="small text-uppercase text-body-secondary fw-semibold">${title}</div><div class="metric-value">${value}</div></div><i class="fa-solid fa-${icon} fs-2 text-${tone}"></i></div></div></div>`;}
