import { tenants } from "../../app/sampleData";
import { createTable } from "../shared/table";
import { escapeHtml } from "../shared/format";

export function renderTenants(container: HTMLElement): void {
  container.innerHTML = `
    <div class="page-heading">
      <h1>Tenants</h1>
      <p class="text-body-secondary mb-0">Every leaseholder appears as a tenant</p>
    </div>
    <div class="card">
      <div class="card-body">
        <table id="tenants-table" class="table table-hover align-middle w-100">
          <thead><tr>
            <th>Tenant</th><th>Apartment</th><th>Primary</th>
            <th>Phone</th><th>Email</th><th>Status</th>
          </tr></thead>
        </table>
      </div>
    </div>`;

  createTable("#tenants-table", {
    data: tenants,
    columns: [
      { data: "name" },
      { data: "apartment" },
      {
        data: "primary",
        render: (value: boolean) =>
          value ? '<span class="badge text-bg-primary">Yes</span>' : '<span class="text-body-secondary">No</span>',
      },
      { data: "phone" },
      { data: "email", render: (value: string) => escapeHtml(value) },
      {
        data: "active",
        render: (value: boolean) =>
          `<span class="badge text-bg-${value ? "success" : "secondary"}">${value ? "Active" : "Inactive"}</span>`,
      },
    ],
  });
}
