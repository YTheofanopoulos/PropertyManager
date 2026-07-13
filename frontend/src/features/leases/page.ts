import { leases } from "../../app/sampleData";
import { createTable } from "../shared/table";
import { currency, escapeHtml } from "../shared/format";

export function renderLeases(container: HTMLElement): void {
  container.innerHTML = `
    <div class="page-heading">
      <h1>Leases</h1>
      <p class="text-body-secondary mb-0">Includes multiple leaseholders</p>
    </div>
    <div class="card">
      <div class="card-body">
        <table id="leases-table" class="table table-hover align-middle w-100">
          <thead><tr>
            <th>Leaseholders</th><th>People</th><th>Street</th><th>Apartment</th>
            <th>Start</th><th>End</th><th>Monthly Rent</th><th>Status</th>
          </tr></thead>
        </table>
      </div>
    </div>`;

  createTable("#leases-table", {
    data: leases,
    columns: [
      { data: "leaseholders", render: (value: string[]) => value.map(escapeHtml).join("<br>") },
      { data: "leaseholders", render: (value: string[]) => value.length },
      { data: "street" },
      { data: "apartment" },
      { data: "startDate" },
      { data: "endDate" },
      { data: "monthlyRent", render: (value: number) => currency(value) },
      {
        data: "status",
        render: (value: string) => `<span class="badge text-bg-success">${escapeHtml(value)}</span>`,
      },
    ],
  });
}
