
export function renderShell(): HTMLElement {
  const app=document.getElementById("app");
  if(!app) throw new Error("Application root not found");
  app.innerHTML=`
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><i class="fa-solid fa-building me-2"></i><span>Property Manager</span></div>
      <nav>
        <a href="#/" data-route="/"><i class="fa-solid fa-gauge"></i><span>Dashboard</span></a>

        <div class="nav-heading">Portfolio</div>
        <a href="#/locations" data-route="/locations"><i class="fa-solid fa-map-location-dot"></i><span>Locations</span></a>
        <a href="#/buildings" data-route="/buildings"><i class="fa-solid fa-building"></i><span>Buildings</span></a>
        <a href="#/units" data-route="/units"><i class="fa-solid fa-door-open"></i><span>Units</span></a>

        <div class="nav-heading">Residents</div>
        <a href="#/tenants" data-route="/tenants"><i class="fa-solid fa-users"></i><span>Tenants</span></a>
        <a href="#/leases" data-route="/leases"><i class="fa-solid fa-file-signature"></i><span>Leases</span></a>

        <div class="nav-heading">Financial</div>
        <a href="#/payments" data-route="/payments"><i class="fa-solid fa-money-check-dollar"></i><span>Payments</span></a>
        <a href="#/bank-import" data-route="/bank-import"><i class="fa-solid fa-file-import"></i><span>Import Bank Statement</span></a>
        <a href="#/rent-roll" data-route="/rent-roll"><i class="fa-solid fa-table-list"></i><span>Rent Roll</span></a>

        <div class="nav-heading">Reports</div>
        <a href="#/reports" data-route="/reports"><i class="fa-solid fa-chart-column"></i><span>Reports</span></a>

        <div class="nav-heading">Administration</div>
        <a href="#/settings" data-route="/settings"><i class="fa-solid fa-gear"></i><span>Settings</span></a>
      </nav>
    </aside>
    <main class="main-panel">
      <header class="topbar"><span class="fw-semibold">Milestone 4.1 Update</span></header>
      <section id="page-content" class="content"></section>
    </main>
  </div>`;
  return document.getElementById("page-content") as HTMLElement;
}
