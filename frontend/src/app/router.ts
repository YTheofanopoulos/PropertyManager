
import { renderBuildings } from "../features/buildings/page";
import { renderBankImport, renderReconciliation } from "../features/bankImport/page";
import { renderDashboard } from "../features/dashboard/page";
import { renderLeaseEditor } from "../features/leases/editor";
import { renderLeases } from "../features/leases/page";
import { renderLocations } from "../features/locations/page";
import { renderPlaceholder } from "../features/placeholder/page";
import { renderPayments, renderPaymentEditor } from "../features/payments/page";
import { renderRentRoll } from "../features/rentRoll/page";
import { renderTenants } from "../features/tenants/page";
import { renderUnits } from "../features/units/page";

const placeholders: Record<string, [string, string]> = {
  "/reports": ["Reports", "Run portfolio, occupancy, delinquency, income, and lease reports."],
  "/settings": ["Settings", "Configure application defaults and future integration options."],
};

export async function route(container: HTMLElement): Promise<void> {
  const path = location.hash.replace(/^#/, "") || "/";

  document.querySelectorAll<HTMLElement>("[data-route]").forEach((element) => {
    const routePath = element.dataset.route;
    const active =
      routePath === "/leases"
        ? path === "/leases" || path.startsWith("/leases/")
        : routePath === "/bank-import"
          ? path === "/bank-import" || path.startsWith("/bank-import/")
          : routePath === path;
    element.classList.toggle("active", active);
  });

  if (path === "/locations") return renderLocations(container);
  if (path === "/buildings") return renderBuildings(container);
  if (path === "/units") return renderUnits(container);
  if (path === "/tenants") return renderTenants(container);
  if (path === "/leases") return renderLeases(container);
  if (path.startsWith("/rent-roll")) return renderRentRoll(container);
  if (path === "/payments") return renderPayments(container);
  if (path === "/bank-import") return renderBankImport(container);
  if (path.startsWith("/payments/new")) return renderPaymentEditor(container);
  if (path === "/leases/new") return renderLeaseEditor(container);

  const reconciliationMatch = path.match(/^\/bank-import\/reconcile\/(\d+)$/);
  if (reconciliationMatch) {
    return renderReconciliation(container, Number(reconciliationMatch[1]));
  }

  const leaseMatch = path.match(/^\/leases\/(\d+)$/);
  if (leaseMatch) return renderLeaseEditor(container, Number(leaseMatch[1]));

  const placeholder = placeholders[path];
  if (placeholder) {
    renderPlaceholder(container, placeholder[0], placeholder[1]);
    return;
  }

  await renderDashboard(container);
}
