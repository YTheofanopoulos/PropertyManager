
import { renderDashboard } from "../features/dashboard/page";
import { renderLeases } from "../features/leases/page";
import { renderPlaceholder } from "../features/placeholder/page";
import { renderTenants } from "../features/tenants/page";
import { renderUnits } from "../features/units/page";
const placeholders:Record<string,[string,string]>={"/locations":["Locations","Manage streets, complexes, and portfolio-level information."],"/buildings":["Buildings","Manage civic addresses and the apartments contained in each building."],"/payments":["Payments","Review and record rent payments and payment history."],"/bank-import":["Import Bank Statement","Import electronic transactions and match deposits to tenants and leases."],"/rent-roll":["Rent Roll","Review current rents, occupancy, leaseholders, and balances."],"/reports":["Reports","Run portfolio, occupancy, delinquency, income, and lease reports."],"/settings":["Settings","Configure application defaults and future integration options."]};
export async function route(container:HTMLElement):Promise<void>{const path=location.hash.replace(/^#/,"")||"/"; document.querySelectorAll<HTMLElement>("[data-route]").forEach(e=>e.classList.toggle("active",e.dataset.route===path)); if(path==="/units")return renderUnits(container); if(path==="/tenants")return renderTenants(container); if(path==="/leases")return renderLeases(container); const p=placeholders[path]; if(p){renderPlaceholder(container,p[0],p[1]);return;} await renderDashboard(container);}
