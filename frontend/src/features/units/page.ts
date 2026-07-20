
import { db } from "../../db/database";
import type { UnitListItem, UnitStatus } from "../../models/domain";
import { unitRepository } from "../../repositories/unitRepository";
import { unitService } from "../../services/unitService";
import { createTable } from "../shared/table";
import { currency } from "../shared/format";
import { modal, notify } from "../shared/ui";

let table: ReturnType<typeof createTable> | undefined;

export async function renderUnits(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="page-heading d-flex justify-content-between align-items-center">
      <div><h1>Units</h1><p class="text-body-secondary mb-0">Apartments stored in MariaDB</p></div>
      <button class="btn btn-primary" id="add-unit"><i class="fa-solid fa-plus me-1"></i>Add Unit</button>
    </div>
    <div class="card"><div class="card-body">
      <table id="units-table" class="table table-hover align-middle w-100">
        <thead><tr><th>Street</th><th>Civic Address</th><th>Apartment Number</th><th>Bedrooms</th><th>Bathrooms</th><th>Rent</th><th>Rent Source</th><th>Status</th><th>Actions</th></tr></thead>
      </table>
    </div></div>${editor()}
  `;
  await populateBuildings();
  await refresh();
  document.getElementById("add-unit")?.addEventListener("click", () => openEditor());
  document.getElementById("unit-form")?.addEventListener("submit", save);
  document.getElementById("units-table")?.addEventListener("click", action);
}

async function refresh(): Promise<void> {
  table?.destroy();
  let units: UnitListItem[];
  try {
    units = await unitRepository.getListItems();
  } catch (error) {
    notify((error as Error).message, "danger");
    units = [];
  }
  table = createTable("#units-table", {
    data: units,
    columns: [
      { data: "street" }, { data: "civicAddress" },
      { data: "apartmentNumber", render: (value: string) => value || "—" },
      { data: "bedrooms" }, { data: "bathrooms" },
      { data: "effectiveRent", render: (value: number) => currency(value) },
      {
        data: "rentSource",
        render: (value: string) =>
          `<span class="badge text-bg-${value === "Active Lease" ? "primary" : "secondary"}">${value}</span>`,
      },
      { data: "status", render: (value: string) => `<span class="badge text-bg-${value === "Occupied" ? "success" : value === "Vacant" ? "warning" : "secondary"}">${value}</span>` },
      { data: "id", orderable: false, searchable: false, render: buttons },
    ],
  });
}

async function populateBuildings(): Promise<void> {
  const select = document.getElementById("unit-building") as HTMLSelectElement;
  const buildings = await db.buildings.toArray();
  const locations = new Map((await db.locations.toArray()).map((x) => [x.id, x]));
  select.innerHTML = buildings
    .sort((a, b) => `${locations.get(a.locationId)?.name} ${a.civicAddress}`.localeCompare(`${locations.get(b.locationId)?.name} ${b.civicAddress}`))
    .map((x) => `<option value="${x.id}">${x.civicAddress} ${locations.get(x.locationId)?.name ?? ""}</option>`)
    .join("");
}

async function openEditor(id?: number): Promise<void> {
  (document.getElementById("unit-form") as HTMLFormElement).reset();
  (document.getElementById("unit-id") as HTMLInputElement).value = "";
  if (id) {
    const item = await unitRepository.getById(id);
    if (!item) return;
    (document.getElementById("unit-id") as HTMLInputElement).value = String(id);
    (document.getElementById("unit-building") as HTMLSelectElement).value = String(item.buildingId);
    (document.getElementById("unit-number") as HTMLInputElement).value = item.apartmentNumber;
    (document.getElementById("unit-bedrooms") as HTMLInputElement).value = String(item.bedrooms);
    (document.getElementById("unit-bathrooms") as HTMLInputElement).value = String(item.bathrooms);
    (document.getElementById("unit-rent") as HTMLInputElement).value = String(item.monthlyRent);
    (document.getElementById("unit-status") as HTMLSelectElement).value = item.status;
  }
  modal("unit-modal").show();
}

async function save(event: Event): Promise<void> {
  event.preventDefault();
  try {
    const value = (document.getElementById("unit-id") as HTMLInputElement).value;
    await unitService.save({
      id: value ? Number(value) : undefined,
      buildingId: Number((document.getElementById("unit-building") as HTMLSelectElement).value),
      apartmentNumber: (document.getElementById("unit-number") as HTMLInputElement).value,
      bedrooms: Number((document.getElementById("unit-bedrooms") as HTMLInputElement).value),
      bathrooms: Number((document.getElementById("unit-bathrooms") as HTMLInputElement).value),
      monthlyRent: Number((document.getElementById("unit-rent") as HTMLInputElement).value),
      status: (document.getElementById("unit-status") as HTMLSelectElement).value as UnitStatus,
    });
    modal("unit-modal").hide();
    await refresh();
    notify("Unit saved.");
  } catch (error) { notify((error as Error).message, "danger"); }
}

async function action(event: Event): Promise<void> {
  const target = event.target as HTMLElement;
  const id = Number(target.dataset.id);
  if (!id) return;
  if (target.classList.contains("edit-record")) await openEditor(id);
  if (target.classList.contains("delete-record") && confirm("Delete this unit?")) {
    try { await unitService.remove(id); await refresh(); notify("Unit deleted."); }
    catch (error) { notify((error as Error).message, "danger"); }
  }
}

function buttons(id: number): string {
  return `<button class="btn btn-sm btn-outline-primary edit-record" data-id="${id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger delete-record" data-id="${id}">Delete</button>`;
}

function editor(): string {
  return `<div class="modal fade" id="unit-modal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
    <form id="unit-form"><div class="modal-header"><h5 class="modal-title">Unit</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
    <div class="modal-body"><input type="hidden" id="unit-id">
      <div class="mb-3"><label class="form-label">Building</label><select class="form-select" id="unit-building" required></select></div>
      <div class="mb-3"><label class="form-label">Apartment number</label><input class="form-control" id="unit-number"></div>
      <div class="row g-3"><div class="col"><label class="form-label">Bedrooms</label><input type="number" min="0" class="form-control" id="unit-bedrooms" required></div>
      <div class="col"><label class="form-label">Bathrooms</label><input type="number" min=".5" step=".5" class="form-control" id="unit-bathrooms" required></div></div>
      <div class="mb-3 mt-3"><label class="form-label">Market Rent</label><input type="number" min="0" class="form-control" id="unit-rent" required>
      <div class="form-text">Used when no lease applies to the unit today.</div></div>
      <div class="mb-3"><label class="form-label">Status</label><select class="form-select" id="unit-status"><option>Occupied</option><option>Vacant</option><option>Maintenance</option></select></div>
    </div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button class="btn btn-primary">Save</button></div>
    </form></div></div></div>`;
}
