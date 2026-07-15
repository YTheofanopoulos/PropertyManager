
import { rentStatusService } from "../../services/rentStatusService";
import type {
  RentStatusMonth,
  RentStatusRow,
} from "../../services/rentStatusService";
import { currency } from "../shared/format";

const DEFAULT_MONTH_COUNT = 4;
const MONTH_COUNTS = [4, 6, 9, 12];

function periodFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function addMonths(period: string, amount: number): string {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return periodFromDate(date);
}

function monthLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function parseParameters(): {
  endPeriod: string;
  monthCount: number;
} {
  const params = new URLSearchParams(
    location.hash.split("?")[1] ?? "",
  );
  const currentPeriod = periodFromDate(new Date());
  const latestAllowed = addMonths(currentPeriod, 1);
  const requestedEnd = params.get("end") ?? latestAllowed;
  const monthCount = Number(params.get("months") ?? DEFAULT_MONTH_COUNT);

  return {
    endPeriod:
      requestedEnd > latestAllowed
        ? latestAllowed
        : requestedEnd,
    monthCount: MONTH_COUNTS.includes(monthCount)
      ? monthCount
      : DEFAULT_MONTH_COUNT,
  };
}

function statusClass(state: RentStatusMonth["state"]): string {
  switch (state) {
    case "Paid":
      return "rent-paid";
    case "Paid Ahead":
      return "rent-ahead";
    case "Partial":
    case "Partial Prepayment":
      return "rent-partial";
    case "Unpaid":
      return "rent-unpaid";
    case "Not Yet Due":
      return "rent-future";
    default:
      return "rent-na";
  }
}

function statusIcon(state: RentStatusMonth["state"]): string {
  switch (state) {
    case "Paid":
      return "✓";
    case "Paid Ahead":
      return "↗";
    case "Partial":
    case "Partial Prepayment":
      return "◐";
    case "Unpaid":
      return "!";
    case "Not Yet Due":
      return "·";
    default:
      return "—";
  }
}

function routeFor(
  endPeriod: string,
  monthCount: number,
): string {
  return `#/rent-status?end=${endPeriod}&months=${monthCount}`;
}

export async function renderRentStatus(
  container: HTMLElement,
): Promise<void> {
  const currentPeriod = periodFromDate(new Date());
  const { endPeriod, monthCount } = parseParameters();
  const startPeriod = addMonths(
    endPeriod,
    -(monthCount - 1),
  );
  const periods = Array.from(
    { length: monthCount },
    (_value, index) =>
      addMonths(startPeriod, index),
  );

  const rows = await rentStatusService.getStatus(
    periods,
    currentPeriod,
  );

  const currentMonthIndex = periods.indexOf(currentPeriod);
  const currentExpected = rows.reduce(
    (total, row) =>
      total +
      (currentMonthIndex >= 0
        ? row.months[currentMonthIndex]?.expected ?? 0
        : 0),
    0,
  );
  const currentCollected = rows.reduce(
    (total, row) =>
      total +
      (currentMonthIndex >= 0
        ? row.months[currentMonthIndex]?.paid ?? 0
        : 0),
    0,
  );
  const totalOutstanding = rows.reduce(
    (total, row) =>
      total + row.outstandingToday,
    0,
  );
  const collectionRate =
    currentExpected > 0
      ? Math.min(
          (currentCollected / currentExpected) * 100,
          100,
        )
      : 0;

  const monthSummaries = periods.map(
    (period, index) => {
      const expected = rows.reduce(
        (total, row) =>
          total + (row.months[index]?.expected ?? 0),
        0,
      );
      const paid = rows.reduce(
        (total, row) =>
          total + (row.months[index]?.paid ?? 0),
        0,
      );
      return {
        period,
        expected,
        paid,
        rate:
          expected > 0
            ? Math.min((paid / expected) * 100, 100)
            : 0,
      };
    },
  );

  container.innerHTML = `
    <style>
      .rent-status-table th,
      .rent-status-table td {
        vertical-align: middle;
      }

      .rent-month-header {
        min-width: 92px;
        text-align: center;
      }

      .rent-month-rate {
        display: block;
        font-size: .75rem;
        font-weight: 400;
        color: var(--bs-secondary-color);
      }

      .rent-indicator {
        --progress: 0deg;
        width: 38px;
        height: 38px;
        border: 0;
        border-radius: 50%;
        display: inline-grid;
        place-items: center;
        position: relative;
        font-weight: 700;
        color: var(--bs-body-color);
        background:
          radial-gradient(
            circle at center,
            var(--bs-body-bg) 55%,
            transparent 57%
          ),
          conic-gradient(
            currentColor var(--progress),
            var(--bs-border-color) 0
          );
      }

      .rent-indicator:hover,
      .rent-indicator:focus-visible {
        transform: scale(1.08);
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }

      .rent-paid { color: var(--bs-success); }
      .rent-ahead { color: var(--bs-primary); }
      .rent-partial { color: var(--bs-warning); }
      .rent-unpaid { color: var(--bs-danger); }
      .rent-future { color: var(--bs-secondary); }
      .rent-na { color: var(--bs-tertiary-color); }

      .rent-window-controls {
        gap: .5rem;
      }

      .rent-status-scroll {
        overflow-x: auto;
      }

      .rent-unit-column {
        min-width: 190px;
      }

      .rent-tenant-column {
        min-width: 190px;
      }

      .rent-balance-column {
        min-width: 135px;
        text-align: right;
      }

      .rent-legend {
        display: flex;
        flex-wrap: wrap;
        gap: .75rem 1.25rem;
      }

      .rent-legend-item {
        display: inline-flex;
        align-items: center;
        gap: .4rem;
        font-size: .875rem;
      }

      .rent-legend-dot {
        width: .8rem;
        height: .8rem;
        border-radius: 50%;
        background: currentColor;
      }
    </style>

    <div class="page-heading d-flex flex-wrap justify-content-between align-items-end gap-3">
      <div>
        <h1>Rent Status</h1>
        <p class="text-body-secondary mb-0">
          Scan paid, partial, overdue, and prepaid rent across a rolling month window.
        </p>
      </div>

      <div class="d-flex flex-wrap align-items-end rent-window-controls">
        <a class="btn btn-outline-secondary"
           href="${routeFor(addMonths(endPeriod, -1), monthCount)}"
           title="Move the window one month earlier">
          <i class="fa-solid fa-chevron-left"></i>
          Earlier
        </a>

        <div>
          <label for="rent-status-months" class="form-label mb-1">
            Months shown
          </label>
          <select id="rent-status-months" class="form-select">
            ${MONTH_COUNTS.map(
              (count) =>
                `<option value="${count}" ${
                  count === monthCount ? "selected" : ""
                }>${count}</option>`,
            ).join("")}
          </select>
        </div>

        <a class="btn btn-outline-secondary ${
          endPeriod >= addMonths(currentPeriod, 1)
            ? "disabled"
            : ""
        }"
           href="${routeFor(addMonths(endPeriod, 1), monthCount)}"
           title="Move the window one month later">
          Later
          <i class="fa-solid fa-chevron-right"></i>
        </a>

        <a class="btn btn-primary"
           href="${routeFor(addMonths(currentPeriod, 1), DEFAULT_MONTH_COUNT)}">
          Today
        </a>
      </div>
    </div>

    <div class="row g-3 mb-4">
      ${metricCard(
        "Expected This Month",
        currency(currentExpected),
      )}
      ${metricCard(
        "Collected This Month",
        currency(currentCollected),
      )}
      ${metricCard(
        "Outstanding Today",
        currency(totalOutstanding),
      )}
      ${metricCard(
        "Collection Rate",
        `${collectionRate.toFixed(1)}%`,
      )}
    </div>

    <div class="card">
      <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span class="fw-semibold">
          ${monthLabel(startPeriod)} – ${monthLabel(endPeriod)}
        </span>

        <div class="rent-legend">
          ${legend("rent-paid", "Paid")}
          ${legend("rent-partial", "Partial")}
          ${legend("rent-unpaid", "Unpaid")}
          ${legend("rent-ahead", "Paid Ahead")}
          ${legend("rent-future", "Not Yet Due")}
          ${legend("rent-na", "No Lease / Vacant")}
        </div>
      </div>

      <div class="card-body rent-status-scroll">
        <table class="table table-hover align-middle rent-status-table">
          <thead>
            <tr>
              <th class="rent-unit-column">Unit</th>
              <th class="rent-tenant-column">Tenant(s)</th>
              ${monthSummaries
                .map(
                  (summary) => `
                    <th class="rent-month-header">
                      ${monthLabel(summary.period)}
                      <span class="rent-month-rate">
                        ${summary.rate.toFixed(0)}% collected
                      </span>
                    </th>
                  `,
                )
                .join("")}
              <th class="rent-balance-column">Outstanding Today</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, rowIndex) =>
              renderRow(row, rowIndex),
            ).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div class="modal fade" id="rent-period-detail" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <div>
              <h5 class="modal-title" id="rent-period-title">
                Rent Period
              </h5>
              <div class="small text-body-secondary" id="rent-period-unit"></div>
            </div>
            <button type="button" class="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"></button>
          </div>
          <div class="modal-body" id="rent-period-body"></div>
          <div class="modal-footer" id="rent-period-footer"></div>
        </div>
      </div>
    </div>
  `;

  const modalElement = document.getElementById(
    "rent-period-detail",
  );
  const ModalClass = (
    window as typeof window & {
      bootstrap?: {
        Modal: new (
          element: Element,
        ) => {
          show(): void;
        };
      };
    }
  ).bootstrap?.Modal;

  const modal =
    modalElement && ModalClass
      ? new ModalClass(modalElement)
      : undefined;

  document
    .querySelectorAll<HTMLButtonElement>(".rent-indicator")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const rowIndex = Number(button.dataset.rowIndex);
        const monthIndex = Number(button.dataset.monthIndex);
        const row = rows[rowIndex];
        const month = row?.months[monthIndex];

        if (!row || !month) return;
        showMonthDetail(row, month);
        modal?.show();
      });
    });

  document
    .getElementById("rent-status-months")
    ?.addEventListener("change", (event) => {
      const count = Number(
        (event.target as HTMLSelectElement).value,
      );
      location.hash = routeFor(endPeriod, count).slice(1);
    });

  function showMonthDetail(
    row: RentStatusRow,
    month: RentStatusMonth,
  ): void {
    const title = document.getElementById(
      "rent-period-title",
    );
    const unit = document.getElementById(
      "rent-period-unit",
    );
    const body = document.getElementById(
      "rent-period-body",
    );
    const footer = document.getElementById(
      "rent-period-footer",
    );

    if (!title || !unit || !body || !footer) return;

    title.textContent = monthLabel(month.period);
    unit.textContent = row.unitLabel;

    if (month.state === "Not Applicable") {
      body.innerHTML = `
        <div class="alert alert-secondary mb-0">
          No lease obligation applies to this unit for this month.
        </div>
      `;
      footer.innerHTML = `
        <button class="btn btn-secondary"
                type="button"
                data-bs-dismiss="modal">
          Close
        </button>
      `;
      return;
    }

    body.innerHTML = `
      <dl class="row mb-3">
        <dt class="col-6">Status</dt>
        <dd class="col-6">${month.state}</dd>
        <dt class="col-6">Expected</dt>
        <dd class="col-6">${currency(month.expected)}</dd>
        <dt class="col-6">Paid</dt>
        <dd class="col-6">${currency(month.paid)}</dd>
        <dt class="col-6">Remaining</dt>
        <dd class="col-6">${currency(month.remaining)}</dd>
      </dl>

      <h6>Payments and Allocations</h6>
      ${
        month.allocations.length
          ? `
            <div class="list-group">
              ${month.allocations.map(
                (allocation) => `
                  <div class="list-group-item">
                    <div class="d-flex justify-content-between">
                      <strong>${currency(allocation.amount)}</strong>
                      <span>${allocation.receivedDate}</span>
                    </div>
                    <div class="small text-body-secondary">
                      ${allocation.source}
                      ${
                        allocation.reference
                          ? ` · ${allocation.reference}`
                          : ""
                      }
                    </div>
                  </div>
                `,
              ).join("")}
            </div>
          `
          : `
            <div class="text-body-secondary">
              No payments are allocated to this month.
            </div>
          `
      }
    `;

    const returnHash = encodeURIComponent(
      routeFor(endPeriod, monthCount),
    );

    footer.innerHTML = `
      <button class="btn btn-secondary"
              type="button"
              data-bs-dismiss="modal">
        Close
      </button>
      ${
        row.leaseId
          ? `
            <a class="btn btn-primary"
               href="#/payments/new?leaseId=${row.leaseId}&returnTo=rent-status&period=${month.period}&returnHash=${returnHash}">
              Record Payment
            </a>
          `
          : ""
      }
    `;
  }
}

function renderRow(
  row: RentStatusRow,
  rowIndex: number,
): string {
  return `
    <tr>
      <td class="rent-unit-column">
        <strong>${row.unitLabel}</strong>
      </td>
      <td class="rent-tenant-column">
        ${row.tenantNames || '<span class="text-body-secondary">Vacant</span>'}
      </td>
      ${row.months
        .map(
          (month, monthIndex) => `
            <td class="text-center">
              <button
                type="button"
                class="rent-indicator ${statusClass(month.state)}"
                style="--progress: ${
                  month.expected > 0
                    ? Math.round(month.collectionRate * 3.6)
                    : 0
                }deg"
                data-row-index="${rowIndex}"
                data-month-index="${monthIndex}"
                title="${month.state}: ${currency(month.paid)} of ${currency(month.expected)}"
                aria-label="${monthLabel(month.period)} ${month.state}, ${currency(month.paid)} paid of ${currency(month.expected)}"
              >
                ${statusIcon(month.state)}
              </button>
            </td>
          `,
        )
        .join("")}
      <td class="rent-balance-column">
        <strong>${currency(row.outstandingToday)}</strong>
        ${
          row.monthsBehind > 0
            ? `<div class="small text-danger">${row.monthsBehind} month${row.monthsBehind === 1 ? "" : "s"} behind</div>`
            : ""
        }
      </td>
      <td>
        ${
          row.leaseId
            ? `<a class="btn btn-sm btn-outline-primary"
                  href="#/payments/new?leaseId=${row.leaseId}&returnTo=rent-status&period=${new Date().toISOString().slice(0, 7)}">
                  Record Payment
                </a>`
            : '<span class="text-body-secondary small">No active lease</span>'
        }
      </td>
    </tr>
  `;
}

function metricCard(
  label: string,
  value: string,
): string {
  return `
    <div class="col-sm-6 col-xl-3">
      <div class="card h-100">
        <div class="card-body">
          <div class="small text-uppercase text-body-secondary fw-semibold">
            ${label}
          </div>
          <div class="metric-value">${value}</div>
        </div>
      </div>
    </div>
  `;
}

function legend(
  className: string,
  label: string,
): string {
  return `
    <span class="rent-legend-item ${className}">
      <span class="rent-legend-dot"></span>
      <span class="text-body-secondary">${label}</span>
    </span>
  `;
}
