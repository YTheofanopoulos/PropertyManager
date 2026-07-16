
import type {
  PaymentReceiptReport,
  PaymentReceiptTransaction,
} from "../../services/paymentReceiptReportService";
import { paymentReceiptReportService } from "../../services/paymentReceiptReportService";
import { createTable } from "../shared/table";

type OutputMode = "combined" | "separate";

function periodFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function addMonths(period: string, amount: number): string {
  const [year, month] = period.split("-").map(Number);
  return periodFromDate(
    new Date(year, month - 1 + amount, 1),
  );
}

function periodsBetween(
  startPeriod: string,
  endPeriod: string,
): string[] {
  if (startPeriod > endPeriod) return [];

  const periods: string[] = [];
  let period = startPeriod;
  while (period <= endPeriod && periods.length < 60) {
    periods.push(period);
    period = addMonths(period, 1);
  }
  return periods;
}

function monthLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function accountingCurrency(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function escapeHtml(value: string): string {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function currentParameters(): {
  startPeriod: string;
  endPeriod: string;
  locationId?: number;
  buildingId?: number;
  outputMode: OutputMode;
} {
  const params = new URLSearchParams(
    location.hash.split("?")[1] ?? "",
  );
  const currentPeriod = periodFromDate(new Date());

  const locationValue = Number(
    params.get("location") ?? 0,
  );
  const buildingValue = Number(
    params.get("building") ?? 0,
  );
  const output =
    params.get("output") === "separate"
      ? "separate"
      : "combined";

  return {
    startPeriod:
      params.get("start") ?? addMonths(currentPeriod, -2),
    endPeriod: params.get("end") ?? currentPeriod,
    locationId: locationValue || undefined,
    buildingId: buildingValue || undefined,
    outputMode: output,
  };
}

export async function renderPaymentReceiptsReport(
  container: HTMLElement,
): Promise<void> {
  const {
    startPeriod,
    endPeriod,
    locationId,
    buildingId,
    outputMode,
  } = currentParameters();

  const periods = periodsBetween(startPeriod, endPeriod);

  const [locations, buildings] = await Promise.all([
    paymentReceiptReportService.locationOptions(),
    paymentReceiptReportService.buildingOptions(locationId),
  ]);

  const selectedLocationIds =
    outputMode === "separate"
      ? locationId
        ? [locationId]
        : locations.map((location) => location.id)
      : [];

  const reports =
    periods.length === 0
      ? []
      : outputMode === "separate"
        ? await Promise.all(
            selectedLocationIds.map((id) =>
              paymentReceiptReportService.generate(
                periods,
                undefined,
                id,
              ),
            ),
          )
        : [
            await paymentReceiptReportService.generate(
              periods,
              buildingId,
              locationId,
            ),
          ];

  container.innerHTML = `
    <style>
      .payment-report-scroll {
        overflow-x: auto;
      }

      .payment-receipts-table th,
      .payment-receipts-table td {
        white-space: nowrap;
        vertical-align: middle;
      }

      .payment-receipts-table thead th {
        position: sticky;
        top: 0;
        z-index: 2;
        background: var(--bs-body-bg);
      }

      .payment-report-unit {
        min-width: 190px;
        font-weight: 600;
      }

      .payment-report-amount {
        text-align: right;
        min-width: 120px;
      }

      .payment-report-link {
        border: 0;
        padding: 0;
        background: transparent;
        color: var(--bs-body-color);
        text-decoration: none;
      }

      .payment-report-link:hover,
      .payment-report-link:focus-visible {
        text-decoration: underline;
      }

      .payment-report-zero {
        color: var(--bs-secondary-color);
      }

      .payment-report-total-row > * {
        font-weight: 700;
        border-top-width: 2px;
      }

      .location-report-section + .location-report-section {
        margin-top: 2rem;
      }

      @media print {
        .sidebar,
        .topbar,
        .page-heading p,
        .report-controls,
        .dt-layout-row,
        .btn,
        .modal {
          display: none !important;
        }

        .main-panel,
        .content-area {
          margin: 0 !important;
          padding: 0 !important;
        }

        .card {
          border: 0 !important;
        }

        .payment-report-scroll {
          overflow: visible !important;
        }

        .location-report-section {
          break-after: page;
          page-break-after: always;
        }

        .location-report-section:last-child {
          break-after: auto;
          page-break-after: auto;
        }
      }
    </style>

    <div class="page-heading d-flex flex-wrap justify-content-between align-items-end gap-3">
      <div>
        <h1>Payment Receipts by Transaction Month</h1>
        <p class="text-body-secondary mb-0">
          Accounting view grouped by the date each payment was processed—not by the rent month it satisfied.
        </p>
      </div>
      <button id="print-payment-report" class="btn btn-outline-primary" type="button">
        <i class="fa-solid fa-print me-2"></i>Print Report
      </button>
    </div>

    <div class="card mb-4 report-controls">
      <div class="card-header fw-semibold">Report Range and Scope</div>
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-sm-6 col-xl-2">
            <label for="payment-report-start" class="form-label">Start month</label>
            <input id="payment-report-start" type="month" class="form-control" value="${startPeriod}">
          </div>

          <div class="col-sm-6 col-xl-2">
            <label for="payment-report-end" class="form-label">End month</label>
            <input id="payment-report-end" type="month" class="form-control" value="${endPeriod}">
          </div>

          <div class="col-sm-6 col-xl-2">
            <label for="payment-report-location" class="form-label">Location</label>
            <select id="payment-report-location" class="form-select">
              <option value="">All locations</option>
              ${locations
                .map(
                  (location) => `
                    <option value="${location.id}" ${
                      location.id === locationId ? "selected" : ""
                    }>${escapeHtml(location.label)}</option>
                  `,
                )
                .join("")}
            </select>
          </div>

          <div class="col-sm-6 col-xl-2">
            <label for="payment-report-building" class="form-label">Building</label>
            <select id="payment-report-building" class="form-select" ${
              outputMode === "separate" ? "disabled" : ""
            }>
              <option value="">All buildings</option>
              ${buildings
                .map(
                  (building) => `
                    <option value="${building.id}" ${
                      building.id === buildingId ? "selected" : ""
                    }>${escapeHtml(building.label)}</option>
                  `,
                )
                .join("")}
            </select>
          </div>

          <div class="col-sm-6 col-xl-2">
            <label for="payment-report-output" class="form-label">Output</label>
            <select id="payment-report-output" class="form-select">
              <option value="combined" ${
                outputMode === "combined" ? "selected" : ""
              }>One combined report</option>
              <option value="separate" ${
                outputMode === "separate" ? "selected" : ""
              }>Separate report per location</option>
            </select>
          </div>

          <div class="col-sm-6 col-xl-2">
            <button id="run-payment-report" class="btn btn-primary w-100" type="button">
              Generate
            </button>
          </div>
        </div>

        ${
          outputMode === "separate"
            ? `
              <div class="form-text mt-3">
                Each location is generated independently and begins on a new page when printed.
              </div>
            `
            : ""
        }
      </div>
    </div>

    ${
      periods.length === 0
        ? `
          <div class="alert alert-warning">
            The start month must not be after the end month.
          </div>
        `
        : reports.length === 0
          ? `
            <div class="alert alert-secondary">
              No locations are available for this report.
            </div>
          `
          : reports
              .map((report, index) =>
                renderReport(
                  report,
                  periods,
                  index,
                  outputMode,
                ),
              )
              .join("")
    }

    <div class="modal fade" id="payment-receipt-detail" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <div>
              <h5 class="modal-title" id="payment-receipt-detail-title">Payment Details</h5>
              <div class="small text-body-secondary" id="payment-receipt-detail-subtitle"></div>
            </div>
            <button type="button" class="btn-close" data-report-modal-close aria-label="Close"></button>
          </div>
          <div class="modal-body" id="payment-receipt-detail-body"></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" data-report-modal-close>Close</button>
          </div>
        </div>
      </div>
    </div>
  `;

  reports.forEach((report, index) => {
    const tableId = `#payment-receipts-table-${index}`;
    createTable(tableId, {
      pageLength: outputMode === "separate" ? 50 : 10,
      lengthMenu: [10, 25, 50],
      paging: outputMode !== "separate",
      searching: outputMode !== "separate",
      info: outputMode !== "separate",
      order: [[0, "asc"]],
      columnDefs: [
        {
          targets: Array.from(
            { length: periods.length + 1 },
            (_value, columnIndex) => columnIndex + 1,
          ),
          className: "text-end",
        },
      ],
    });
  });

  document
    .getElementById("payment-report-location")
    ?.addEventListener("change", () => {
      const locationValue = (
        document.getElementById(
          "payment-report-location",
        ) as HTMLSelectElement
      ).value;

      const params = new URLSearchParams({
        start: startPeriod,
        end: endPeriod,
        output: outputMode,
      });
      if (locationValue) {
        params.set("location", locationValue);
      }
      location.hash = `/reports?${params.toString()}`;
    });

  document
    .getElementById("payment-report-output")
    ?.addEventListener("change", () => {
      const output = (
        document.getElementById(
          "payment-report-output",
        ) as HTMLSelectElement
      ).value;

      const params = new URLSearchParams({
        start: startPeriod,
        end: endPeriod,
        output,
      });
      if (locationId) {
        params.set("location", String(locationId));
      }
      location.hash = `/reports?${params.toString()}`;
    });

  document
    .getElementById("run-payment-report")
    ?.addEventListener("click", () => {
      const start = (
        document.getElementById(
          "payment-report-start",
        ) as HTMLInputElement
      ).value;
      const end = (
        document.getElementById(
          "payment-report-end",
        ) as HTMLInputElement
      ).value;
      const locationValue = (
        document.getElementById(
          "payment-report-location",
        ) as HTMLSelectElement
      ).value;
      const building = (
        document.getElementById(
          "payment-report-building",
        ) as HTMLSelectElement
      ).value;
      const output = (
        document.getElementById(
          "payment-report-output",
        ) as HTMLSelectElement
      ).value;

      const params = new URLSearchParams({
        start,
        end,
        output,
      });

      if (locationValue) {
        params.set("location", locationValue);
      }
      if (building && output === "combined") {
        params.set("building", building);
      }

      location.hash = `/reports?${params.toString()}`;
    });

  document
    .getElementById("print-payment-report")
    ?.addEventListener("click", () => window.print());

  const modalElement = document.getElementById(
    "payment-receipt-detail",
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

  container.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>(
      ".payment-report-link",
    );
    if (!button) return;

    event.preventDefault();
    const reportIndex = Number(button.dataset.reportIndex);
    const unitId = Number(button.dataset.unitId);
    const period = button.dataset.period ?? "";
    const report = reports[reportIndex];
    const row = report?.rows.find(
      (item) => item.unitId === unitId,
    );
    const transactions =
      row?.transactionsByPeriod[period] ?? [];

    if (!row || transactions.length === 0) return;

    showTransactionDetails(
      row.unitLabel,
      period,
      transactions,
    );

    if (modal) modal.show();
    else if (modalElement) showFallbackModal(modalElement);
  });

  modalElement?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (!target.closest("[data-report-modal-close]")) return;

    event.preventDefault();
    if (modal) modal.hide();
    else if (modalElement) hideFallbackModal(modalElement);
  });

  function showTransactionDetails(
    unitLabel: string,
    period: string,
    transactions: PaymentReceiptTransaction[],
  ): void {
    const title = document.getElementById(
      "payment-receipt-detail-title",
    );
    const subtitle = document.getElementById(
      "payment-receipt-detail-subtitle",
    );
    const body = document.getElementById(
      "payment-receipt-detail-body",
    );

    if (title) title.textContent = unitLabel;
    if (subtitle) subtitle.textContent = monthLabel(period);
    if (!body) return;

    const total = transactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );

    body.innerHTML = `
      <div class="table-responsive">
        <table class="table align-middle">
          <thead>
            <tr>
              <th>Transaction Date</th>
              <th>Source</th>
              <th>Method</th>
              <th>Reference</th>
              <th class="text-end">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${transactions
              .map(
                (transaction) => `
                  <tr>
                    <td>${transaction.transactionDate}</td>
                    <td>${escapeHtml(transaction.source)}</td>
                    <td>${escapeHtml(transaction.method)}</td>
                    <td>
                      ${escapeHtml(transaction.reference || "—")}
                      ${
                        transaction.notes
                          ? `<div class="small text-body-secondary">${escapeHtml(transaction.notes)}</div>`
                          : ""
                      }
                    </td>
                    <td class="text-end">${accountingCurrency(transaction.amount)}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="4">Total</th>
              <th class="text-end">${accountingCurrency(total)}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }
}

function renderReport(
  report: PaymentReceiptReport,
  periods: string[],
  reportIndex: number,
  outputMode: OutputMode,
): string {
  const title =
    outputMode === "separate"
      ? `Payment Receipts — ${escapeHtml(
          report.locationName ?? "Location",
        )}`
      : "Payment Receipts";

  return `
    <section class="location-report-section">
      <div class="d-flex justify-content-between align-items-end mb-3">
        <div>
          <h2 class="h4 mb-1">${title}</h2>
          <div class="text-body-secondary">
            ${monthLabel(periods[0]!)} – ${monthLabel(
              periods[periods.length - 1]!,
            )}
          </div>
        </div>
        ${
          outputMode === "separate"
            ? `<span class="badge text-bg-light">${report.rows.length} apartments</span>`
            : ""
        }
      </div>

      <div class="row g-3 mb-4">
        ${metricCard(
          "Total Received",
          accountingCurrency(report.grandTotal),
        )}
        ${metricCard(
          "Transactions",
          String(report.totalTransactionCount),
        )}
        ${metricCard("Apartments", String(report.rows.length))}
        ${metricCard(
          "Voided Excluded",
          `${accountingCurrency(
            report.voidedExcluded,
          )} · ${report.voidedCount}`,
        )}
      </div>

      <div class="card mb-4">
        <div class="card-header fw-semibold">Apartment Receipts</div>
        <div class="card-body payment-report-scroll">
          <table id="payment-receipts-table-${reportIndex}"
                 class="table table-hover w-100 payment-receipts-table">
            <thead>
              <tr>
                <th class="payment-report-unit">Unit</th>
                ${periods
                  .map(
                    (period) =>
                      `<th class="payment-report-amount">${monthLabel(period)}</th>`,
                  )
                  .join("")}
                <th class="payment-report-amount">Range Total</th>
              </tr>
            </thead>
            <tbody>
              ${report.rows
                .map(
                  (row) => `
                    <tr>
                      <td class="payment-report-unit">${escapeHtml(row.unitLabel)}</td>
                      ${periods
                        .map((period) => {
                          const amount = row.amounts[period] ?? 0;
                          return `
                            <td class="payment-report-amount">
                              ${
                                amount > 0.005
                                  ? `<button type="button"
                                             class="payment-report-link"
                                             data-report-index="${reportIndex}"
                                             data-unit-id="${row.unitId}"
                                             data-period="${period}">
                                       ${accountingCurrency(amount)}
                                     </button>`
                                  : `<span class="payment-report-zero">${accountingCurrency(0)}</span>`
                              }
                            </td>
                          `;
                        })
                        .join("")}
                      <td class="payment-report-amount">
                        <strong>${accountingCurrency(row.total)}</strong>
                      </td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
            <tfoot>
              <tr class="payment-report-total-row">
                <th>Monthly Total</th>
                ${report.monthlySummaries
                  .map(
                    (summary) =>
                      `<th class="payment-report-amount">${accountingCurrency(summary.total)}</th>`,
                  )
                  .join("")}
                <th class="payment-report-amount">
                  ${accountingCurrency(report.grandTotal)}
                </th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header fw-semibold">Monthly Accounting Summary</div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Transaction Month</th>
                  <th class="text-end">Bank Imported</th>
                  <th class="text-end">Manual</th>
                  <th class="text-end">Transactions</th>
                  <th class="text-end">Voided Excluded</th>
                  <th class="text-end">Total Received</th>
                </tr>
              </thead>
              <tbody>
                ${report.monthlySummaries
                  .map(
                    (summary) => `
                      <tr>
                        <td><strong>${monthLabel(summary.period)}</strong></td>
                        <td class="text-end">${accountingCurrency(summary.bankImported)}</td>
                        <td class="text-end">${accountingCurrency(summary.manual)}</td>
                        <td class="text-end">${summary.transactionCount}</td>
                        <td class="text-end">
                          ${accountingCurrency(summary.voidedExcluded)}
                          (${summary.voidedCount})
                        </td>
                        <td class="text-end">
                          <strong>${accountingCurrency(summary.total)}</strong>
                        </td>
                      </tr>
                    `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `;
}

function metricCard(label: string, value: string): string {
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
