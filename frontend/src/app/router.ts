
import { renderBuildings } from "../features/buildings/page";
import { renderDashboard } from "../features/dashboard/page";
import { renderLeases } from "../features/leases/page";
import { renderLocations } from "../features/locations/page";
import { renderPlaceholder } from "../features/placeholder/page";
import { renderTenants } from "../features/tenants/page";
import { renderUnits } from "../features/units/page";

const placeholders: Record<string, [string, string]> = {
  "/payments": ["Payments", "Review and record rent payments and payment history."],
  "/bank-import": ["Import Bank Statement", "Import electronic transactions and match deposits to tenants and leases."],
  "/rent-roll": ["Rent Roll", "Review current rents, occupancy, leaseholders, and balances."],
  "/reports": ["Reports", "Run portfolio, occupancy, delinquency, income, and lease reports."],
  "/settings": ["Settings", "Configure application defaults and future integration options."],
};

export async function route(container: HTMLElement): Promise<void> {
  const path = location.hash.replace(/^#/, "") || "/";
  document.querySelectorAll<HTMLElement>("[data-route]").forEach((element) => {
    element.classList.toggle("active", element.dataset.route === path);
  });

  if (path === "/locations") return renderLocations(container);
  if (path === "/buildings") return renderBuildings(container);
  if (path === "/units") return renderUnits(container);
  if (path === "/tenants") return renderTenants(container);
  if (path === "/leases") return renderLeases(container);

  const placeholder = placeholders[path];
  if (placeholder) {
    renderPlaceholder(container, placeholder[0], placeholder[1]);
    return;
  }
  await renderDashboard(container);
}
