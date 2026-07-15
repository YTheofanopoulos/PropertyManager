
import { rentStatusService } from "../../services/rentStatusService";
import type {
  RentStatusMonth,
  RentStatusRow,
} from "../../services/rentStatusService";
import { currency } from "../shared/format";
import { createTable } from "../shared/table";

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
        width: 20px;
        height: 20px;
        border: 0;
        border-radius: 50%;
        display: inline-block;
        padding: 0;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, .08);
      }

      .rent-indicator:hover,
      .rent-indicator:focus-visible {
        transform: scale(1.15);
        outline: 2px solid var(--bs-body-color);
        outline-offset: 3px;
      }

      .rent-paid {
        background-color: var(--bs-success);
      }

      .rent-ahead {
        background-color: var(--bs-primary);
      }

      .rent-partial {
        background-color: var(--bs-warning);
      }

      .rent-unpaid {
        background-color: var(--bs-danger);
      }

      .rent-future {
        background-color: var(--bs-secondary);
      }

      .rent-na {
        background-color: var(--bs-tertiary-bg);
        box-shadow: inset 0 0 0 1px var(--bs-border-color);
      }

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
        gap: .45rem;
        font-size: .9rem;
        color: var(--bs-body-color);
        white-space: nowrap;
        background: transparent !important;
      }

      .rent-legend-dot {
        width: .72rem;
        height: .72rem;
        border-radius: 50%;
        flex: 0 0 auto;
        display: inline-block;
      }

      .rent-legend-dot.rent-paid { background-color: var(--bs-success); }
      .rent-legend-dot.rent-partial { background-color: var(--bs-warning); }
      .rent-legend-dot.rent-unpaid { background-color: var(--bs-danger); }
      .rent-legend-dot.rent-ahead { background-color: var(--bs-primary); }
      .rent-legend-dot.rent-future { background-color: var(--bs-secondary); }

      .rent-legend-dot.rent-na {
        background-color: var(--bs-body-bg);
        box-shadow: inset 0 0 0 1px var(--bs-secondary-color);
      }

      #rent-status-table th,
      #rent-status-table td {
        padding-left: .9rem;
        padding-right: .9rem;
      }

      #rent-status-table th.text-center,
      #rent-status-table td.text-center {
        text-align: center;
      }

      #rent-status-table th.text-end,
      #rent-status-table td.text-end {
        text-align: right;
      }

      #rent-status-table thead th {
        position: sticky;
        top: 0;
        z-index: 2;
        background: var(--bs-body-bg);
        box-shadow: 0 1px 0 var(--bs-border-color);
      }

      .rent-unit-button {
        border: 0;
        padding: 0;
        background: transparent;
        color: var(--bs-body-color);
        font-weight: 600;
        text-align: left;
        cursor: pointer;
      }

      .rent-unit-button:hover,
      .rent-unit-button:focus-visible {
        text-decoration: underline;
      }

      .rent-outstanding-positive { color: var(--bs-danger); }
      .rent-outstanding-zero { color: var(--bs-body-color); }

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
        <table id="rent-status-table"
               class="table table-hover align-middle rent-status-table w-100">
          <thead>
            <tr>
              <th class="rent-unit-column">Unit</th>
              ${monthSummaries
                .map(
                  (summary) => `
                    <th class="rent-month-header">
                      ${monthLabel(summary.period)}
                      <span class="rent-month-rate">
                        ${
                          summary.period > currentPeriod
                            ? "Future"
                            : summary.period === currentPeriod
                              ? `${summary.rate.toFixed(0)}% collected · thru today`
                              : `${summary.rate.toFixed(0)}% collected`
                        }
                      </span>
                    </th>
                  `,
                )
                .join("")}
              <th class="rent-balance-column text-end">Outstanding Today</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((row, rowIndex) =>
                renderRow(row, rowIndex),
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div class="modal fade" id="unit-occupants-detail" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="unit-occupants-title">Unit Details</h5>
            <button type="button" class="btn-close unit-modal-close" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="unit-occupants-body"></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary unit-modal-close">Close</button>
          </div>
        </div>
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

  createTable("#rent-status-table", {
    pageLength: 10,
    lengthMenu: [
      [10, 25, 50],
      [10, 25, 50],
    ],
    order: [[0, "asc"]],
    columnDefs: [
      {
        targets: Array.from(
          { length: periods.length },
          (_value, index) => index + 1,
        ),
        orderable: false,
        searchable: false,
        className: "text-center",
      },
      {
        targets: periods.length + 1,
        className: "text-end",
      },
    ],
  });

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
          hide(): void;
        };
      };
    }
  ).bootstrap?.Modal;

  const modal =
    modalElement && ModalClass
      ? new ModalClass(modalElement)
      : undefined;

  const occupantModalElement = document.getElementById(
    "unit-occupants-detail",
  );
  const occupantModal =
    occupantModalElement && ModalClass
      ? new ModalClass(occupantModalElement)
      : undefined;

  function showFallbackModal(element: HTMLElement): void {
    element.classList.add("show");
    element.style.display = "block";
    element.removeAttribute("aria-hidden");
    element.setAttribute("aria-modal", "true");
    document.body.classList.add("modal-open");
  }

  function hideFallbackModal(element: HTMLElement): void {
    element.classList.remove("show");
    element.style.display = "none";
    element.setAttribute("aria-hidden", "true");
    element.removeAttribute("aria-modal");
    document.body.classList.remove("modal-open");
    document
      .querySelectorAll(".modal-backdrop")
      .forEach((backdrop) => backdrop.remove());
  }

  function openMonthDetails(
    row: RentStatusRow,
    month: RentStatusMonth,
  ): void {
    showMonthDetail(row, month);

    if (modal) {
      modal.show();
    } else if (modalElement) {
      showFallbackModal(modalElement);
    }
  }

  function occupantContactMarkup(
    iconClass: string,
    label: string,
    value: string,
    hrefPrefix: string,
  ): string {
    if (!value) {
      return `
        <div class="small text-body-secondary">
          <i class="${iconClass} me-2"></i>
          ${label}: Not provided
        </div>
      `;
    }

    return `
      <div>
        <i class="${iconClass} me-2 text-body-secondary"></i>
        <a href="${hrefPrefix}${value}">${value}</a>
      </div>
    `;
  }

  function openOccupantDetails(row: RentStatusRow): void {
    const title = document.getElementById(
      "unit-occupants-title",
    );
    const body = document.getElementById(
      "unit-occupants-body",
    );

    if (title) {
      title.textContent = row.unitLabel;
    }

    if (body) {
      body.innerHTML = row.occupants.length
        ? `
            <div class="list-group">
              ${row.occupants
                .map(
                  (occupant) => `
                    <div class="list-group-item">
                      <div class="d-flex justify-content-between align-items-start gap-3 mb-2">
                        <strong>${occupant.name}</strong>
                        <span class="badge text-bg-${
                          occupant.role === "Primary Tenant"
                            ? "primary"
                            : "secondary"
                        }">${occupant.role}</span>
                      </div>

                      <div class="d-grid gap-1">
                        ${occupantContactMarkup(
                          "fa-solid fa-envelope",
                          "Email",
                          occupant.email,
                          "mailto:",
                        )}
                        ${occupantContactMarkup(
                          "fa-solid fa-phone",
                          "Phone",
                          occupant.phone,
                          "tel:",
                        )}
                      </div>
                    </div>
                  `,
                )
                .join("")}
            </div>
          `
        : `
            <div class="alert alert-secondary mb-0">
              This unit is vacant or has no active lease or tenants.
            </div>
          `;
    }

    if (occupantModal) {
      occupantModal.show();
    } else if (occupantModalElement) {
      showFallbackModal(occupantModalElement);
    }
  }

  document
    .getElementById("rent-status-table")
    ?.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;

      const indicator = target.closest<HTMLButtonElement>(
        ".rent-indicator",
      );

      if (indicator) {
        event.preventDefault();
        event.stopPropagation();

        const rowIndex = Number(indicator.dataset.rowIndex);
        const monthIndex = Number(
          indicator.dataset.monthIndex,
        );
        const row = rows[rowIndex];
        const month = row?.months[monthIndex];

        if (row && month) {
          openMonthDetails(row, month);
        }
        return;
      }

      const unitButton = target.closest<HTMLButtonElement>(
        ".rent-unit-button",
      );

      if (unitButton) {
        event.preventDefault();
        event.stopPropagation();

        const rowIndex = Number(
          unitButton.dataset.unitRowIndex,
        );
        const row = rows[rowIndex];

        if (row) {
          openOccupantDetails(row);
        }
      }
    });

  modalElement
    ?.querySelectorAll<HTMLElement>("[data-bs-dismiss='modal']")
    .forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();

        if (modal) {
          modal.hide();
        } else if (modalElement) {
          hideFallbackModal(modalElement);
        }
      });
    });

  occupantModalElement
    ?.querySelectorAll<HTMLElement>(".unit-modal-close")
    .forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();

        if (occupantModal) {
          occupantModal.hide();
        } else if (occupantModalElement) {
          hideFallbackModal(occupantModalElement);
        }
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

      <div class="mb-4">
        <div class="d-flex justify-content-between small mb-1">
          <span>Collection</span>
          <strong>${month.collectionRate.toFixed(0)}%</strong>
        </div>
        <div class="progress" role="progressbar"
             aria-label="Rent collection progress"
             aria-valuenow="${month.collectionRate.toFixed(0)}"
             aria-valuemin="0"
             aria-valuemax="100">
          <div class="progress-bar"
               style="width: ${month.collectionRate.toFixed(0)}%"></div>
        </div>
      </div>

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

    footer.innerHTML = `
      <button class="btn btn-primary"
              type="button"
              data-bs-dismiss="modal">
        Close
      </button>
    `;
  }
}

function renderRow(
  row: RentStatusRow,
  rowIndex: number,
): string {
  const unitParts = row.unitLabel.split(" ");
  const civic = unitParts[0] ?? "";
  const apartment = unitParts[1] ?? "";
  const street = unitParts.slice(2).join(" ");

  const unitDisplay =
    apartment && street
      ? `${civic}-${apartment} ${street}`
      : row.unitLabel;

  return `
    <tr>
      <td class="rent-unit-column">
        <button
          type="button"
          class="rent-unit-button"
          data-unit-row-index="${rowIndex}"
          title="View occupants and contact information"
        >
          ${unitDisplay}
        </button>
      </td>
      ${row.months
        .map(
          (month, monthIndex) => `
            <td class="text-center">
              <button
                type="button"
                class="rent-indicator ${statusClass(month.state)}"
                data-row-index="${rowIndex}"
                data-month-index="${monthIndex}"
                title="${monthLabel(month.period)} — ${month.state}. Expected ${currency(month.expected)}, collected ${currency(month.paid)}, remaining ${currency(month.remaining)}."
                aria-label="${monthLabel(month.period)} ${month.state}, ${currency(month.paid)} paid of ${currency(month.expected)}"
              ></button>
            </td>
          `,
        )
        .join("")}
      <td class="rent-balance-column text-end">
        <strong class="${
          row.outstandingToday > 0.005
            ? "rent-outstanding-positive"
            : "rent-outstanding-zero"
        }">${currency(row.outstandingToday)}</strong>
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
    <span class="rent-legend-item">
      <span class="rent-legend-dot ${className}"></span>
      <span>${label}</span>
    </span>
  `;
}
