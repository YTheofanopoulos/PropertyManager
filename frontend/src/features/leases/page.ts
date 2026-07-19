
import { leaseRepository } from "../../repositories/leaseRepository";
import { leaseService } from "../../services/leaseService";
import { createTable } from "../shared/table";
import { currency, escapeHtml } from "../shared/format";
import { notify } from "../shared/ui";

export async function renderLeases(container: HTMLElement): Promise<void> {
  const rows = await leaseRepository.getListItems();

  container.innerHTML = `
    <div class="page-heading d-flex justify-content-between align-items-center">
      <div>
        <h1>Leases</h1>
        <p class="text-body-secondary mb-0">
          Lease terms, participants, recurring charges, and occupancy
        </p>
      </div>
      <a class="btn btn-primary" href="#/leases/new">
        <i class="fa-solid fa-plus me-1"></i>Create Lease
      </a>
    </div>

    <div class="card">
      <div class="card-body">
        <table id="leases-table" class="table table-hover align-middle w-100">
          <thead>
            <tr>
              <th>Leaseholders</th>
              <th>People</th>
              <th>Street</th>
              <th>Apartment</th>
              <th>Term</th>
              <th>Start</th>
              <th>End</th>
              <th>Monthly Total</th>
              <th>Status</th>
              <th>Renewal</th>
              <th>Actions</th>
            </tr>
          </thead>
        </table>
      </div>
    </div>
  `;

  createTable("#leases-table", {
    data: rows,
    columns: [
      {
        data: "leaseholders",
        render: (value: string[]) => value.map(escapeHtml).join("<br>"),
      },
      {
        data: "leaseholders",
        render: (value: string[]) => value.length,
      },
      { data: "street" },
      { data: "apartment" },
      {
        data: "termType",
        render: (value: string | undefined) => value ?? "Fixed",
      },
      { data: "startDate" },
      {
        data: "endDate",
        render: (value: string, _type: unknown, row: typeof rows[number]) =>
          row.termType === "Month-to-Month" ? "Open-ended" : value,
      },
      {
        data: "monthlyTotal",
        render: (value: number) => currency(value),
      },
      {
        data: "status",
        render: (value: string) =>
          `<span class="badge text-bg-${value === "Active" ? "success" : value === "Future" ? "info" : value === "Terminated" ? "danger" : "secondary"}">${escapeHtml(value)}</span>`,
      },
      {
        data: "renewalStatus",
        render: (value: string | undefined) => {
          const status = value ?? "Not Started";
          const badgeClass: Record<string, string> = {
            "Not Started": "secondary",
            "Planning": "primary",
            "Urgent": "warning",
            "Renewal Letter Sent": "info",
            "Awaiting Tenant Response": "info",
            "Renewed": "success",
            "Non-Renewal": "dark",
            "Under Dispute": "danger",
          };
          return `<span class="badge text-bg-${badgeClass[status] ?? "secondary"}">${escapeHtml(status)}</span>`;
        },
      },
      {
        data: "id",
        orderable: false,
        searchable: false,
        render: (id: number, _type: unknown, row: typeof rows[number]) => `
          <a class="btn btn-sm btn-outline-primary" href="#/leases/${id}">Edit</a>
          ${row.status !== "Terminated"
            ? `<button class="btn btn-sm btn-outline-danger terminate-lease" data-id="${id}">Terminate</button>`
            : ""}
        `,
      },
    ],
  });

  document.getElementById("leases-table")?.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains("terminate-lease")) return;

    const id = Number(target.dataset.id);
    if (!id || !window.confirm("Terminate this lease? The historical record will remain.")) return;

    try {
      await leaseService.terminate(id);
      notify("Lease terminated.");
      await renderLeases(container);
    } catch (error) {
      notify((error as Error).message, "danger");
    }
  });
}
