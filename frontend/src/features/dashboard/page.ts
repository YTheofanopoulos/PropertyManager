import { Chart } from "chart.js/auto";
import { dashboardService } from "../../services/dashboardService";
import { currency } from "../shared/format";

export async function renderDashboard(
  container: HTMLElement,
): Promise<void> {
  const summary = await dashboardService.getSummary();
  const statusTotal =
    summary.rentStatus.current +
    summary.rentStatus.oneMonthBehind +
    summary.rentStatus.twoPlusMonthsBehind +
    summary.rentStatus.notDueOrNoLease;

  container.innerHTML = `
    <div class="dashboard-page">
      <div class="row g-3 mb-4">
        ${metricCard("Total Units", String(summary.totalUnits),
          `${summary.occupiedUnits} Occupied / ${summary.vacantUnits} Vacant`,
          "house", "success")}
        ${metricCard("Monthly Rent (Current Period)", currency(summary.monthlyRent),
          "Contractual Rent", "circle-dollar-to-slot", "primary")}
        ${metricCard("Collected (Current Period)",
          currency(summary.collectedCurrentPeriod),
          `${summary.collectionRate.toFixed(1)}% of Contractual`,
          "wallet", "info")}
        ${metricCard("Outstanding Balance", currency(summary.totalOutstanding),
          "All Periods", "circle-exclamation", "warning")}
      </div>

      <div class="row g-4 mb-4">
        <div class="col-xl-7">
          <div class="card h-100 dashboard-card">
            <div class="card-header d-flex flex-wrap justify-content-between gap-2">
              <span class="fw-semibold">
                Monthly Rent Collected
                <span class="text-body-secondary fw-normal">
                  — through ${formatPeriod(summary.currentPeriod)}
                </span>
              </span>
              <span class="small text-body-secondary">
                Application Date: ${formatDate(summary.applicationDate)}
              </span>
            </div>
            <div class="card-body">
              <div class="dashboard-chart-wrap">
                <canvas id="income-chart"></canvas>
              </div>
              <div class="alert alert-primary py-2 px-3 mb-0 mt-3 small">
                Amounts are based on payment received date and the selected application date.
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-5">
          <div class="card h-100 dashboard-card">
            <div class="card-header d-flex justify-content-between gap-2">
              <span class="fw-semibold">Rent Status (All Units)</span>
              <span class="small text-body-secondary">
                As of ${formatDate(summary.applicationDate)}
              </span>
            </div>
            <div class="card-body">
              <div class="row align-items-center h-100">
                <div class="col-md-6">
                  <div class="dashboard-donut-wrap">
                    <canvas id="rent-status-chart"></canvas>
                  </div>
                </div>
                <div class="col-md-6">
                  ${statusLine("Current", summary.rentStatus.current, statusTotal, "success")}
                  ${statusLine("1 Month Behind", summary.rentStatus.oneMonthBehind, statusTotal, "warning")}
                  ${statusLine("2+ Months Behind", summary.rentStatus.twoPlusMonthsBehind, statusTotal, "danger")}
                  ${statusLine("Not Due / No Lease", summary.rentStatus.notDueOrNoLease, statusTotal, "secondary")}
                  <hr>
                  <div class="d-flex justify-content-between fw-semibold">
                    <span>Total</span><span>${statusTotal}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-xl-7">
          <div class="card dashboard-card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span class="fw-semibold">Recent Payments</span>
              <a class="btn btn-sm btn-outline-primary" href="#/payments">View All</a>
            </div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0 dashboard-table">
                <thead><tr><th>Date</th><th>Unit</th><th>Tenant</th>
                <th class="text-end">Amount</th><th>Method</th></tr></thead>
                <tbody>
                  ${summary.recentPayments.length > 0
                    ? summary.recentPayments.map((payment) => `
                      <tr>
                        <td>${payment.receivedDate}</td>
                        <td>${escapeHtml(payment.unitLabel)}</td>
                        <td>${escapeHtml(payment.tenantName)}</td>
                        <td class="text-end fw-semibold">${currency(payment.amount)}</td>
                        <td>${escapeHtml(payment.method)}</td>
                      </tr>`).join("")
                    : emptyRow(5, "No payments have been recorded.")}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="col-xl-5">
          <div class="card dashboard-card mb-4">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span class="fw-semibold">Lease Renewal Pipeline (Next 180 Days)</span>
              <a class="btn btn-sm btn-outline-primary" href="#/leases">View Leases</a>
            </div>
            <div class="card-body">
              <div class="dashboard-chart-wrap"><canvas id="renewal-chart"></canvas></div>
              <div class="small text-body-secondary mt-2">Click a bar to open the lease list.</div>
            </div>
          </div>
          <div class="card dashboard-card">
            <div class="card-header fw-semibold">Renewals Requiring Attention</div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0 dashboard-table">
                <thead><tr><th>Unit</th><th>Expires</th><th>Priority</th></tr></thead>
                <tbody>
                  ${summary.urgentRenewals.length > 0
                    ? summary.urgentRenewals.map((lease) => `
                      <tr>
                        <td><a href="#/leases/${lease.leaseId}">${escapeHtml(lease.unitLabel)}</a><div class="small text-body-secondary">${escapeHtml(lease.tenantNames)}</div></td>
                        <td>${lease.endDate}<div class="small text-body-secondary">${lease.daysLeft} days</div></td>
                        <td><span class="badge ${lease.attentionLevel === "Deadline Passed" ? "text-bg-danger" : lease.attentionLevel === "Urgent" ? "text-bg-warning" : "text-bg-info"}">${escapeHtml(lease.attentionLevel)}</span></td>
                      </tr>`).join("")
                    : emptyRow(3, "No renewal letters currently require attention.")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  `;

  new Chart(document.getElementById("income-chart") as HTMLCanvasElement, {
    type: "line",
    data: {
      labels: summary.monthlyCollections.map((item) => item.label),
      datasets: [{
        label: "Collected",
        data: summary.monthlyCollections.map((item) => item.collectedAmount),
        borderColor: "#198754",
        backgroundColor: "rgba(25,135,84,.12)",
        fill: true,
        tension: .28,
        pointRadius: 4,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `Collected: ${currency(Number(context.raw ?? 0))}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (value) => currency(Number(value)) },
        },
      },
    },
  });

  new Chart(document.getElementById("rent-status-chart") as HTMLCanvasElement, {
    type: "doughnut",
    data: {
      labels: ["Current", "1 Month Behind", "2+ Months Behind", "Not Due / No Lease"],
      datasets: [{
        data: [
          summary.rentStatus.current,
          summary.rentStatus.oneMonthBehind,
          summary.rentStatus.twoPlusMonthsBehind,
          summary.rentStatus.notDueOrNoLease,
        ],
        backgroundColor: ["#198754", "#ffc107", "#fd7e14", "#adb5bd"],
        borderWidth: 1,
      }],
    },
    options: {
      maintainAspectRatio: false,
      cutout: "58%",
      plugins: { legend: { display: false } },
    },
  });

  const renewalChart = new Chart(document.getElementById("renewal-chart") as HTMLCanvasElement, {
    type: "bar",
    data: {
      labels: summary.renewalPipeline.map((item) => item.window),
      datasets: [
        { label: "Set to Expire", data: summary.renewalPipeline.map((item) => item.notStarted), backgroundColor: "#6c757d" },
        { label: "Renewal Letter Sent", data: summary.renewalPipeline.map((item) => item.letterSent), backgroundColor: "#0d6efd" },
        { label: "Renewed", data: summary.renewalPipeline.map((item) => item.renewed), backgroundColor: "#198754" },
        { label: "Under Dispute", data: summary.renewalPipeline.map((item) => item.underDispute), backgroundColor: "#dc3545" },
      ],
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      onClick: () => { location.hash = "#/leases"; },
      plugins: { legend: { position: "bottom" } },
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
  void renewalChart;
}

function metricCard(title: string, value: string, subtitle: string,
  icon: string, tone: string): string {
  return `<div class="col-sm-6 col-xl-3">
    <div class="card h-100 dashboard-metric border-start border-${tone} border-4">
      <div class="card-body d-flex justify-content-between align-items-center">
        <div><div class="small text-body-secondary mb-2">${title}</div>
        <div class="metric-value">${value}</div>
        <div class="small text-body-secondary mt-2">${subtitle}</div></div>
        <i class="fa-solid fa-${icon} fs-2 text-${tone}"></i>
      </div>
    </div>
  </div>`;
}

function statusLine(label: string, count: number, total: number, tone: string): string {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return `<div class="d-flex justify-content-between align-items-center py-2">
    <span><span class="badge rounded-pill bg-${tone} me-2">&nbsp;</span>${label}</span>
    <strong>${count} (${pct.toFixed(1)}%)</strong>
  </div>`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "long", day: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "long",
  }).format(new Date(year, month - 1, 1));
}

function emptyRow(columns: number, message: string): string {
  return `<tr><td colspan="${columns}" class="text-center text-body-secondary py-4">
    ${message}</td></tr>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
