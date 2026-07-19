import { busyOverlay } from "../services/busyOverlayService";

import { renderBuildings } from "../features/buildings/page";
import { renderBankImport, renderReconciliation } from "../features/bankImport/page";
import { renderDashboard } from "../features/dashboard/page";
import { renderLeaseEditor } from "../features/leases/editor";
import { renderLeases } from "../features/leases/page";
import { renderLocations } from "../features/locations/page";
import { renderPlaceholder } from "../features/placeholder/page";
import { renderSettings } from "../features/settings/page";
import { renderPayments, renderPaymentEditor } from "../features/payments/page";
import { renderRentRoll } from "../features/rentRoll/page";
import { renderRentStatus } from "../features/rentStatus/page";
import { renderPaymentReceiptsReport } from "../features/reports/paymentReceiptsPage";
import { renderTenants } from "../features/tenants/page";
import { renderUnits } from "../features/units/page";

const placeholders: Record<string, [string, string]> = {};

export async function route(container: HTMLElement): Promise<void> {
  busyOverlay.forceHide();
  const hashRoute = location.hash.replace(/^#/, "") || "/";
  const [path] = hashRoute.split("?", 1);

  document.querySelectorAll<HTMLElement>("[data-route]").forEach((element) => {
    const routePath = element.dataset.route;
    const active =
      routePath === "/leases"
        ? path === "/leases" || path.startsWith("/leases/")
        : routePath === "/bank-import"
          ? path === "/bank-import" || path.startsWith("/bank-import/")
          : routePath === path;
    element.classList.toggle("active", active);
    if (active) {
      const section = element.closest<HTMLElement>(".nav-section");
      const toggle = section?.querySelector<HTMLButtonElement>(".nav-section-toggle");
      const items = section?.querySelector<HTMLElement>(".nav-section-items");
      if (toggle && items) {
        toggle.setAttribute("aria-expanded", "true");
        items.hidden = false;
      }
    }
  });

  if (path === "/settings") return renderSettings(container);
  if (path === "/locations") return renderLocations(container);
  if (path === "/buildings") return renderBuildings(container);
  if (path === "/units") return renderUnits(container);
  if (path === "/tenants") return renderTenants(container);
  if (path === "/leases") return renderLeases(container);
  if (path.startsWith("/rent-roll")) return renderRentRoll(container);
  if (path === "/rent-status") return renderRentStatus(container);
  if (path === "/reports") return renderPaymentReceiptsReport(container);
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
