
import { tenantRepository } from "../../repositories/tenantRepository";
import { tenantService } from "../../services/tenantService";
import { createTable } from "../shared/table";
import { modal, notify } from "../shared/ui";

let table: ReturnType<typeof createTable> | undefined;

export async function renderTenants(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="page-heading d-flex justify-content-between align-items-center">
      <div><h1>Tenants</h1><p class="text-body-secondary mb-0">People and leaseholder contact records</p></div>
      <button class="btn btn-primary" id="add-tenant"><i class="fa-solid fa-plus me-1"></i>Add Tenant</button>
    </div>
    <div class="card"><div class="card-body">
      <table id="tenants-table" class="table table-hover align-middle w-100">
        <thead><tr><th>Tenant</th><th>Apartment</th><th>Primary</th><th>Phone</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
      </table>
    </div></div>${editor()}
  `;
  await refresh();
  document.getElementById("add-tenant")?.addEventListener("click", () => openEditor());
  document.getElementById("tenant-form")?.addEventListener("submit", save);
  document.getElementById("tenants-table")?.addEventListener("click", action);
}

async function refresh(): Promise<void> {
  const rows = await tenantRepository.getListItems();
  table?.destroy();
  table = createTable("#tenants-table", {
    data: rows,
    columns: [
      { data: null, render: (_v: unknown, _t: unknown, row: typeof rows[number]) => `${row.firstName} ${row.lastName}` },
      { data: "apartments", render: (value: string[]) => value.join("<br>") || "—" },
      { data: "primaryLeaseCount", render: (value: number) => value ? '<span class="badge text-bg-primary">Yes</span>' : "No" },
      { data: "phone" }, { data: "email" },
      { data: "active", render: (value: boolean) => `<span class="badge text-bg-${value ? "success" : "secondary"}">${value ? "Active" : "Inactive"}</span>` },
      { data: "id", orderable: false, searchable: false, render: buttons },
    ],
  });
}

async function openEditor(id?: number): Promise<void> {
  (document.getElementById("tenant-form") as HTMLFormElement).reset();
  (document.getElementById("tenant-id") as HTMLInputElement).value = "";
  (document.getElementById("tenant-active") as HTMLInputElement).checked = true;
  if (id) {
    const item = await tenantRepository.getById(id);
    if (!item) return;
    (document.getElementById("tenant-id") as HTMLInputElement).value = String(id);
    (document.getElementById("tenant-first") as HTMLInputElement).value = item.firstName;
    (document.getElementById("tenant-last") as HTMLInputElement).value = item.lastName;
    (document.getElementById("tenant-email") as HTMLInputElement).value = item.email;
    (document.getElementById("tenant-phone") as HTMLInputElement).value = item.phone;
    (document.getElementById("tenant-active") as HTMLInputElement).checked = item.active;
  }
  modal("tenant-modal").show();
}

async function save(event: Event): Promise<void> {
  event.preventDefault();
  try {
    const value = (document.getElementById("tenant-id") as HTMLInputElement).value;
    await tenantService.save({
      id: value ? Number(value) : undefined,
      firstName: (document.getElementById("tenant-first") as HTMLInputElement).value,
      lastName: (document.getElementById("tenant-last") as HTMLInputElement).value,
      email: (document.getElementById("tenant-email") as HTMLInputElement).value,
      phone: (document.getElementById("tenant-phone") as HTMLInputElement).value,
      active: (document.getElementById("tenant-active") as HTMLInputElement).checked,
    });
    modal("tenant-modal").hide();
    await refresh();
    notify("Tenant saved.");
  } catch (error) { notify((error as Error).message, "danger"); }
}

async function action(event: Event): Promise<void> {
  const target = event.target as HTMLElement;
  const id = Number(target.dataset.id);
  if (!id) return;
  if (target.classList.contains("edit-record")) await openEditor(id);
  if (target.classList.contains("delete-record") && confirm("Delete this tenant?")) {
    try { await tenantService.remove(id); await refresh(); notify("Tenant deleted."); }
    catch (error) { notify((error as Error).message, "danger"); }
  }
}

function buttons(id: number): string {
  return `<button class="btn btn-sm btn-outline-primary edit-record" data-id="${id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger delete-record" data-id="${id}">Delete</button>`;
}

function editor(): string {
  return `<div class="modal fade" id="tenant-modal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
    <form id="tenant-form"><div class="modal-header"><h5 class="modal-title">Tenant</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
    <div class="modal-body"><input type="hidden" id="tenant-id">
      <div class="row g-3"><div class="col"><label class="form-label">First name</label><input class="form-control" id="tenant-first" required></div>
      <div class="col"><label class="form-label">Last name</label><input class="form-control" id="tenant-last" required></div></div>
      <div class="mb-3 mt-3"><label class="form-label">Email</label><input type="email" class="form-control" id="tenant-email" required></div>
      <div class="mb-3"><label class="form-label">Phone</label><input class="form-control" id="tenant-phone"></div>
      <div class="form-check"><input class="form-check-input" type="checkbox" id="tenant-active" checked><label class="form-check-label">Active</label></div>
    </div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button class="btn btn-primary">Save</button></div>
    </form></div></div></div>`;
}
