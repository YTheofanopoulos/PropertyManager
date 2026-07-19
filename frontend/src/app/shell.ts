import { applicationClock } from "../services/applicationClockService";


export function renderShell(): HTMLElement {
  const app=document.getElementById("app");
  if(!app) throw new Error("Application root not found");
  app.innerHTML=`
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><i class="fa-solid fa-building me-2"></i><span>Property Manager</span></div>
      <nav class="sidebar-nav" aria-label="Primary navigation">
        <a href="#/" data-route="/"><i class="fa-solid fa-gauge"></i><span>Dashboard</span></a>

        <section class="nav-section" data-nav-section="portfolio">
          <button class="nav-section-toggle" type="button" aria-expanded="true" aria-controls="nav-section-portfolio">
            <span>Portfolio</span><i class="fa-solid fa-chevron-down nav-section-chevron"></i>
          </button>
          <div class="nav-section-items" id="nav-section-portfolio">
            <a href="#/locations" data-route="/locations"><i class="fa-solid fa-map-location-dot"></i><span>Locations</span></a>
            <a href="#/buildings" data-route="/buildings"><i class="fa-solid fa-building"></i><span>Buildings</span></a>
            <a href="#/units" data-route="/units"><i class="fa-solid fa-door-open"></i><span>Units</span></a>
          </div>
        </section>

        <section class="nav-section" data-nav-section="residents">
          <button class="nav-section-toggle" type="button" aria-expanded="true" aria-controls="nav-section-residents">
            <span>Residents</span><i class="fa-solid fa-chevron-down nav-section-chevron"></i>
          </button>
          <div class="nav-section-items" id="nav-section-residents">
            <a href="#/tenants" data-route="/tenants"><i class="fa-solid fa-users"></i><span>Tenants</span></a>
            <a href="#/leases" data-route="/leases"><i class="fa-solid fa-file-signature"></i><span>Leases</span></a>
          </div>
        </section>

        <section class="nav-section" data-nav-section="financial">
          <button class="nav-section-toggle" type="button" aria-expanded="true" aria-controls="nav-section-financial">
            <span>Financial</span><i class="fa-solid fa-chevron-down nav-section-chevron"></i>
          </button>
          <div class="nav-section-items" id="nav-section-financial">
            <a href="#/payments" data-route="/payments"><i class="fa-solid fa-money-check-dollar"></i><span>Payments</span></a>
            <a href="#/credits" data-route="/credits"><i class="fa-solid fa-circle-dollar-to-slot"></i><span>Unapplied Credits</span></a>
            <a href="#/bank-import" data-route="/bank-import"><i class="fa-solid fa-file-import"></i><span>Import Bank Statement</span></a>
            <a href="#/rent-roll" data-route="/rent-roll"><i class="fa-solid fa-table-list"></i><span>Rent Roll</span></a>
          </div>
        </section>

        <section class="nav-section" data-nav-section="reports">
          <button class="nav-section-toggle" type="button" aria-expanded="false" aria-controls="nav-section-reports">
            <span>Reports</span><i class="fa-solid fa-chevron-down nav-section-chevron"></i>
          </button>
          <div class="nav-section-items" id="nav-section-reports" hidden>
            <a href="#/rent-status" data-route="/rent-status"><i class="fa-solid fa-calendar-check"></i><span>Rent Status</span></a>
            <a href="#/reports" data-route="/reports"><i class="fa-solid fa-receipt"></i><span>Payment Receipts</span></a>
          </div>
        </section>

        <section class="nav-section" data-nav-section="administration">
          <button class="nav-section-toggle" type="button" aria-expanded="false" aria-controls="nav-section-administration">
            <span>Administration</span><i class="fa-solid fa-chevron-down nav-section-chevron"></i>
          </button>
          <div class="nav-section-items" id="nav-section-administration" hidden>
            <a href="#/settings" data-route="/settings"><i class="fa-solid fa-gear"></i><span>Settings</span></a>
            <button class="nav-button" id="export-data"><i class="fa-solid fa-download"></i><span>Create Backup</span></button>
            <button class="nav-button" id="import-data"><i class="fa-solid fa-upload"></i><span>Restore Backup</span></button>
            <input id="import-data-file" type="file" accept="application/json,.json" class="d-none">
            <button class="nav-button" id="reset-data"><i class="fa-solid fa-rotate-left"></i><span>Reset Sample Data</span></button>
          </div>
        </section>
      </nav>

      <div class="sidebar-clock-card mx-3 mt-auto mb-3">
        <div class="small fw-semibold mb-2">Application Date</div>
        <div class="fw-semibold">${applicationClock.formatToday()}</div>
        <div class="small mt-1">Period: ${applicationClock.currentPeriod()}</div>
        <a href="#/settings" class="btn btn-sm btn-outline-light mt-3">Change Date</a>
      </div>

      <div class="px-3 pb-3">
        <button
          class="btn btn-sm btn-outline-light w-100 text-start"
          type="button"
          data-bs-toggle="modal"
          data-bs-target="#about-property-manager"
        >
          <i class="fa-solid fa-circle-info me-2"></i>
          <span>v0.5.8.3.1</span>
        </button>
      </div>
    </aside>
    <main class="main-panel">
      ${
        applicationClock.isSimulated()
          ? `
            <div class="alert alert-warning rounded-0 mb-0 d-flex flex-wrap justify-content-between align-items-center gap-2"
                 id="historical-test-banner">
              <span>
                <i class="fa-solid fa-clock-rotate-left me-2"></i>
                <strong>Historical Test Mode</strong>
                — Application date: ${applicationClock.formatToday()}
              </span>
              <button id="banner-restore-system-date"
                      class="btn btn-sm btn-outline-dark"
                      type="button">
                Return to System Date
              </button>
            </div>
          `
          : ""
      }
      <header class="topbar d-flex justify-content-between align-items-center">
        <span class="fw-semibold">PropertyManager</span>
        <span class="small text-body-secondary">Baseline 5.8.3 · DB Schema 9</span>
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
            <dd class="col-7">0.5.8.3.1</dd>

            <dt class="col-5">Baseline</dt>
            <dd class="col-7">5.8.1.1</dd>

            <dt class="col-5">Database Schema</dt>
            <dd class="col-7">8</dd>

            <dt class="col-5">Sample Data</dt>
            <dd class="col-7">Historical leases: Jul 2025 – Jun 2026</dd>

            <dt class="col-5">Build Date</dt>
            <dd class="col-7">2026-07-19</dd>
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
