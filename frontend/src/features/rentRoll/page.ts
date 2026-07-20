
import { rentLedgerService } from "../../services/rentLedgerService";
import { createTable } from "../shared/table";
import { currency } from "../shared/format";

import { applicationClock } from "../../services/applicationClockService";
import type { RentRollRow } from "../../models/domain";
const currentPeriod = (): string => applicationClock.currentPeriod();

export async function renderRentRoll(container: HTMLElement): Promise<void> {
  const period =
    new URLSearchParams(location.hash.split("?")[1] ?? "").get("period") ??
    currentPeriod();
  let rows: RentRollRow[];
  try { rows = await rentLedgerService.getRentRoll(period); }
  catch (error) { container.innerHTML=`<div class="alert alert-danger">${(error as Error).message}</div>`; return; }

  container.innerHTML = `
    <div class="page-heading d-flex justify-content-between align-items-end">
      <div>
        <h1>Rent Roll</h1>
        <p class="text-body-secondary mb-0">
          Current month plus all prior unpaid rent.
        </p>
      </div>
      <div>
        <label class="form-label">Rent Period</label>
        <input type="month" id="rent-period" class="form-control" value="${period}">
      </div>
    </div>

    <div class="row g-3 mb-4">
      ${card("Expected This Month", rows.reduce((total, row) => total + row.currentMonthDue, 0))}
      ${card("Paid This Month", rows.reduce((total, row) => total + row.currentMonthPaid, 0))}
      ${card("Prior Arrears", rows.reduce((total, row) => total + row.priorBalance, 0))}
      ${card("Total Outstanding", rows.reduce((total, row) => total + row.totalOutstanding, 0))}
    </div>

    <div class="card">
      <div class="card-body">
        <table id="rent-roll-table" class="table table-hover align-middle w-100">
          <thead>
            <tr>
              <th>Unit</th>
              <th>Primary Tenant</th>
              <th>Current Due</th>
              <th>Current Paid</th>
              <th>Prior Balance</th>
              <th>Total Outstanding</th>
              <th>Oldest Unpaid</th>
              <th>Months Behind</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
        </table>
      </div>
    </div>
  `;

  createTable("#rent-roll-table", {
    data: rows,
    columns: [
      { data: "unitLabel" },
      { data: "primaryTenant" },
      {
        data: "currentMonthDue",
        render: (value: number) => currency(value),
      },
      {
        data: "currentMonthPaid",
        render: (value: number) => currency(value),
      },
      {
        data: "priorBalance",
        render: (value: number) => currency(value),
      },
      {
        data: "totalOutstanding",
        render: (value: number) => currency(value),
      },
      {
        data: "oldestUnpaidPeriod",
        render: (value: string) => value || "—",
      },
      { data: "monthsInArrears" },
      {
        data: "status",
        render: (value: string) =>
          `<span class="badge text-bg-${
            value === "Current"
              ? "success"
              : value === "Partial"
                ? "warning"
                : "danger"
          }">${value}</span>`,
      },
      {
        data: "leaseId",
        orderable: false,
        searchable: false,
        render: (id: number) =>
          `<a class="btn btn-sm btn-outline-primary"
              href="#/payments/new?leaseId=${id}&returnTo=rent-roll&period=${period}">
              Record Payment
            </a>`,
      },
    ],
  });

  document.getElementById("rent-period")?.addEventListener("change", (event) => {
    location.hash = `#/rent-roll?period=${
      (event.target as HTMLInputElement).value
    }`;
  });
}

function card(label: string, value: number): string {
  return `
    <div class="col-sm-6 col-xl-3">
      <div class="card h-100">
        <div class="card-body">
          <div class="small text-uppercase text-body-secondary fw-semibold">
            ${label}
          </div>
          <div class="metric-value">${currency(value)}</div>
        </div>
      </div>
    </div>
  `;
}
