import { Chart } from "chart.js/auto";
import { dashboardService } from "../../services/dashboardService";
import { currency } from "../shared/format";

export async function renderDashboard(
  container: HTMLElement,
): Promise<void> {
  const summary = await dashboardService.getSummary();

  container.innerHTML = `
    <div class="page-heading">
      <h1>Dashboard</h1>
      <p class="text-body-secondary mb-0">
        Portfolio summary as of ${formatApplicationDate(
          summary.applicationDate,
        )}
      </p>
    </div>

    <div class="row g-3 mb-4">
      ${card(
        "Occupancy",
        `${summary.occupiedUnits} / ${summary.totalUnits}`,
        "building-check",
        "success",
      )}
      ${card(
        "Monthly Rent",
        currency(summary.monthlyRent),
        "dollar-sign",
        "primary",
      )}
      ${card(
        "Active Tenants",
        String(summary.tenantCount),
        "users",
        "info",
      )}
      ${card(
        "Active Leases",
        String(summary.activeLeaseCount),
        "file-signature",
        "warning",
      )}
    </div>

    <div class="row g-4">
      <div class="col-xl-8">
        <div class="card h-100">
          <div class="card-header fw-semibold">
            Monthly Rent Collected
            <span class="text-body-secondary fw-normal">
              — through ${formatPeriod(summary.currentPeriod)}
            </span>
          </div>
          <div class="card-body">
            <canvas id="income-chart" height="110"></canvas>
          </div>
        </div>
      </div>

      <div class="col-xl-4">
        <div class="card h-100">
          <div class="card-header fw-semibold">
            Apartments by Location
          </div>
          <div class="card-body">
            <canvas id="location-chart" height="220"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;

  new Chart(
    document.getElementById("income-chart") as HTMLCanvasElement,
    {
      type: "line",
      data: {
        labels: summary.monthlyCollections.map(
          (collection) => collection.label,
        ),
        datasets: [
          {
            data: summary.monthlyCollections.map(
              (collection) => collection.collectedAmount,
            ),
            tension: 0.3,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    },
  );

  new Chart(
    document.getElementById("location-chart") as HTMLCanvasElement,
    {
      type: "bar",
      data: {
        labels: summary.locations.map((location) => location.name),
        datasets: [
          {
            data: summary.locationUnitCounts,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    },
  );
}

function formatApplicationDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, 1));
}

function card(
  title: string,
  value: string,
  icon: string,
  tone: string,
): string {
  return `
    <div class="col-sm-6 col-xl-3">
      <div class="card border-start border-${tone} border-4 h-100">
        <div class="card-body d-flex align-items-center justify-content-between">
          <div>
            <div class="small text-uppercase text-body-secondary fw-semibold">
              ${title}
            </div>
            <div class="metric-value">${value}</div>
          </div>
          <i class="fa-solid fa-${icon} fs-2 text-${tone}"></i>
        </div>
      </div>
    </div>
  `;
}
