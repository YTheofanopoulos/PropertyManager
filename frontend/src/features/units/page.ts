import { units } from "../../app/sampleData";
import { createTable } from "../shared/table";
import { currency, escapeHtml } from "../shared/format";

export function renderUnits(container: HTMLElement): void {
  container.innerHTML = `
    <div class="page-heading">
      <h1>Units</h1>
      <p class="text-body-secondary mb-0">Read-only sample data for Milestone 4.1</p>
    </div>
    <div class="card">
      <div class="card-body">
        <table id="units-table" class="table table-hover align-middle w-100">
          <thead><tr>
            <th>Street</th><th>Civic Address</th><th>Apartment Number</th>
            <th>Bedrooms</th><th>Bathrooms</th><th>Monthly Rent</th><th>Status</th>
          </tr></thead>
        </table>
      </div>
    </div>`;

  createTable("#units-table", {
    data: units,
    columns: [
      { data: "street" },
      { data: "civicAddress" },
      { data: "apartmentNumber", render: (value: string) => value || "—" },
      { data: "bedrooms" },
      { data: "bathrooms" },
      { data: "monthlyRent", render: (value: number) => currency(value) },
      {
        data: "status",
        render: (value: string) =>
          `<span class="badge text-bg-${value === "Occupied" ? "success" : "warning"}">${escapeHtml(value)}</span>`,
      },
    ],
  });
}
