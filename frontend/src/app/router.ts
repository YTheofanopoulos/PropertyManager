import { renderDashboard } from "../features/dashboard/page";
import { renderLeases } from "../features/leases/page";
import { renderTenants } from "../features/tenants/page";
import { renderUnits } from "../features/units/page";

export function route(container: HTMLElement): void {
  const path = location.hash.replace(/^#/, "") || "/";

  document.querySelectorAll<HTMLElement>("[data-route]").forEach((element) => {
    element.classList.toggle("active", element.dataset.route === path);
  });

  if (path === "/units") return renderUnits(container);
  if (path === "/tenants") return renderTenants(container);
  if (path === "/leases") return renderLeases(container);
  renderDashboard(container);
}
