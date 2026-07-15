
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
        <a href="#/rent-status" data-route="/rent-status"><i class="fa-solid fa-calendar-check"></i><span>Rent Status</span></a>
        <a href="#/reports" data-route="/reports"><i class="fa-solid fa-chart-column"></i><span>Reports</span></a>

        <div class="nav-heading">Administration</div>
        <a href="#/settings" data-route="/settings"><i class="fa-solid fa-gear"></i><span>Settings</span></a>
        <button class="nav-button" id="export-data"><i class="fa-solid fa-download"></i><span>Export JSON</span></button>
        <button class="nav-button" id="import-data"><i class="fa-solid fa-upload"></i><span>Import JSON</span></button>
        <input id="import-data-file" type="file" accept="application/json,.json" class="d-none">
        <button class="nav-button" id="reset-data"><i class="fa-solid fa-rotate-left"></i><span>Reset Sample Data</span></button>
      </nav>

      <div class="px-3 pb-3 mt-auto">
        <button
          class="btn btn-sm btn-outline-light w-100 text-start"
          type="button"
          data-bs-toggle="modal"
          data-bs-target="#about-property-manager"
        >
          <i class="fa-solid fa-circle-info me-2"></i>
          <span>v0.5.4.2</span>
        </button>
      </div>
    </aside>
    <main class="main-panel">
      <header class="topbar d-flex justify-content-between align-items-center">
        <span class="fw-semibold">PropertyManager</span>
        <span class="small text-body-secondary">Baseline 5.4.2 · DB Schema 7</span>
      </header>
      <section id="page-content" class="content"></section>
    </main>
  </div>

  <div class="modal fade" id="about-property-manager" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="fa-solid fa-building me-2"></i>
            PropertyManager
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <dl class="row mb-0">
            <dt class="col-5">Application Version</dt>
            <dd class="col-7">0.5.4.2</dd>

            <dt class="col-5">Baseline</dt>
            <dd class="col-7">5.4.2</dd>

            <dt class="col-5">Database Schema</dt>
            <dd class="col-7">7</dd>

            <dt class="col-5">Sample Data</dt>
            <dd class="col-7">Baseline 5.3.1 controlled fixtures</dd>

            <dt class="col-5">Build Date</dt>
            <dd class="col-7">2026-07-15</dd>
          </dl>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>

  <div class="toast-container position-fixed top-0 end-0 p-3" id="toast-container"></div>`;
  return document.getElementById("page-content") as HTMLElement;
}
