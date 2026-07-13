export function renderShell(): HTMLElement {
  const app = document.getElementById("app");
  if (!app) throw new Error("Application root was not found.");

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <i class="fa-solid fa-building me-2"></i>
          <span>Property Manager</span>
        </div>
        <nav>
          <a href="#/" data-route="/"><i class="fa-solid fa-gauge"></i><span>Dashboard</span></a>
          <div class="nav-heading">Portfolio</div>
          <a href="#/units" data-route="/units"><i class="fa-solid fa-door-open"></i><span>Units</span></a>
          <div class="nav-heading">Residents</div>
          <a href="#/tenants" data-route="/tenants"><i class="fa-solid fa-users"></i><span>Tenants</span></a>
          <a href="#/leases" data-route="/leases"><i class="fa-solid fa-file-signature"></i><span>Leases</span></a>
        </nav>
      </aside>
      <main class="main-panel">
        <header class="topbar">
          <span class="fw-semibold">Milestone 4.1</span>
          <span class="ms-auto text-body-secondary">Bootstrap 5 + TypeScript</span>
        </header>
        <section class="content" id="page-content"></section>
      </main>
    </div>`;

  const content = document.getElementById("page-content");
  if (!content) throw new Error("Page content container was not found.");
  return content;
}
