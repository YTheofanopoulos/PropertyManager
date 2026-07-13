import { Chart } from "chart.js/auto";
import { leases, locations, tenants, units } from "../../app/sampleData";
import { currency } from "../shared/format";

export function renderDashboard(container: HTMLElement): void {
  const occupied = units.filter((unit) => unit.status === "Occupied").length;
  const monthlyRent = units
    .filter((unit) => unit.status === "Occupied")
    .reduce((total, unit) => total + unit.monthlyRent, 0);

  container.innerHTML = `
    <div class="page-heading">
      <h1>Dashboard</h1>
      <p class="text-body-secondary mb-0">Bootstrap 5 and TypeScript foundation</p>
    </div>
    <div class="row g-3 mb-4">
      ${card("Occupancy", `${occupied} / ${units.length}`, "building-check", "success")}
      ${card("Monthly Rent", currency(monthlyRent), "dollar-sign", "primary")}
      ${card("Tenants", String(tenants.length), "users", "info")}
      ${card("Active Leases", String(leases.length), "file-signature", "warning")}
    </div>
    <div class="row g-4">
      <div class="col-xl-8">
        <div class="card h-100">
          <div class="card-header fw-semibold">Monthly Rent Collected</div>
          <div class="card-body"><canvas id="income-chart" height="110"></canvas></div>
        </div>
      </div>
      <div class="col-xl-4">
        <div class="card h-100">
          <div class="card-header fw-semibold">Apartments by Location</div>
          <div class="card-body"><canvas id="location-chart" height="220"></canvas></div>
        </div>
      </div>
    </div>`;

  new Chart(document.getElementById("income-chart") as HTMLCanvasElement, {
    type: "line",
    data: {
      labels: ["Feb","Mar","Apr","May","Jun","Jul"],
      datasets: [{ data: [36500,37200,38150,38900,39750,monthlyRent], tension: 0.3 }],
    },
    options: { plugins: { legend: { display: false } } },
  });

  new Chart(document.getElementById("location-chart") as HTMLCanvasElement, {
    type: "bar",
    data: {
      labels: locations.map((location) => location.street),
      datasets: [{ data: locations.map((location) => location.apartments) }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function card(title: string, value: string, icon: string, tone: string): string {
  return `<div class="col-sm-6 col-xl-3">
    <div class="card border-start border-${tone} border-4 h-100">
      <div class="card-body d-flex align-items-center justify-content-between">
        <div>
          <div class="small text-uppercase text-body-secondary fw-semibold">${title}</div>
          <div class="metric-value">${value}</div>
        </div>
        <i class="fa-solid fa-${icon} fs-2 text-${tone}"></i>
      </div>
    </div>
  </div>`;
}
