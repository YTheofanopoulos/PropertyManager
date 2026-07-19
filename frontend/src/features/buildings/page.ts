
import { db } from "../../db/database";
import { buildingRepository } from "../../repositories/buildingRepository";
import { buildingService } from "../../services/buildingService";
import { createTable } from "../shared/table";
import { modal, notify } from "../shared/ui";

let table: ReturnType<typeof createTable> | undefined;

export async function renderBuildings(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="page-heading d-flex justify-content-between align-items-center">
      <div><h1>Buildings</h1><p class="text-body-secondary mb-0">Civic addresses within each location</p></div>
      <button class="btn btn-primary" id="add-building"><i class="fa-solid fa-plus me-1"></i>Add Building</button>
    </div>
    <div class="card"><div class="card-body">
      <table id="buildings-table" class="table table-hover align-middle w-100">
        <thead><tr><th>Street</th><th>Civic Address</th><th>City</th><th>State / Province</th><th>ZIP / Postal Code</th><th>Units</th><th>Actions</th></tr></thead>
      </table>
    </div></div>${editor()}
  `;

  await populateLocations();
  await refresh();
  document.getElementById("add-building")?.addEventListener("click", () => openEditor());
  document.getElementById("building-form")?.addEventListener("submit", save);
  document.getElementById("buildings-table")?.addEventListener("click", action);
}

async function dataRows() {
  const buildings = await db.buildings.toArray();
  const locations = new Map((await db.locations.toArray()).map((x) => [x.id, x]));
  const units = await db.units.toArray();
  return buildings.map((building) => ({
    ...building,
    street: locations.get(building.locationId)?.name ?? "Unknown",
    unitCount: units.filter((unit) => unit.buildingId === building.id).length,
  }));
}

async function refresh(): Promise<void> {
  table?.destroy();
  table = createTable("#buildings-table", {
    data: await dataRows(),
    columns: [
      { data: "street" }, { data: "civicAddress" }, { data: "city", defaultContent: "" },
      { data: "stateProvince", defaultContent: "" }, { data: "postalCode", defaultContent: "" }, { data: "unitCount" },
      { data: "id", orderable: false, searchable: false, render: buttons },
    ],
  });
}

async function populateLocations(): Promise<void> {
  const select = document.getElementById("building-location") as HTMLSelectElement;
  const locations = await db.locations.orderBy("name").toArray();
  select.innerHTML = locations.map((x) => `<option value="${x.id}">${x.name}</option>`).join("");
}

async function openEditor(id?: number): Promise<void> {
  (document.getElementById("building-form") as HTMLFormElement).reset();
  (document.getElementById("building-id") as HTMLInputElement).value = "";
  if (id) {
    const item = await buildingRepository.getById(id);
    if (!item) return;
    (document.getElementById("building-id") as HTMLInputElement).value = String(id);
    (document.getElementById("building-location") as HTMLSelectElement).value = String(item.locationId);
    (document.getElementById("building-address") as HTMLInputElement).value = item.civicAddress;
    (document.getElementById("building-city") as HTMLInputElement).value = item.city ?? "";
    (document.getElementById("building-state") as HTMLInputElement).value = item.stateProvince ?? "";
    (document.getElementById("building-postal") as HTMLInputElement).value = item.postalCode ?? "";
  }
  modal("building-modal").show();
}

async function save(event: Event): Promise<void> {
  event.preventDefault();
  try {
    const value = (document.getElementById("building-id") as HTMLInputElement).value;
    await buildingService.save({
      id: value ? Number(value) : undefined,
      locationId: Number((document.getElementById("building-location") as HTMLSelectElement).value),
      civicAddress: (document.getElementById("building-address") as HTMLInputElement).value,
      city: (document.getElementById("building-city") as HTMLInputElement).value,
      stateProvince: (document.getElementById("building-state") as HTMLInputElement).value,
      postalCode: (document.getElementById("building-postal") as HTMLInputElement).value,
    });
    modal("building-modal").hide();
    await refresh();
    notify("Building saved.");
  } catch (error) { notify((error as Error).message, "danger"); }
}

async function action(event: Event): Promise<void> {
  const target = event.target as HTMLElement;
  const id = Number(target.dataset.id);
  if (!id) return;
  if (target.classList.contains("edit-record")) await openEditor(id);
  if (target.classList.contains("delete-record") && confirm("Delete this building?")) {
    try { await buildingService.remove(id); await refresh(); notify("Building deleted."); }
    catch (error) { notify((error as Error).message, "danger"); }
  }
}

function buttons(id: number): string {
  return `<button class="btn btn-sm btn-outline-primary edit-record" data-id="${id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger delete-record" data-id="${id}">Delete</button>`;
}

function editor(): string {
  return `<div class="modal fade" id="building-modal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
    <form id="building-form"><div class="modal-header"><h5 class="modal-title">Building</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
    <div class="modal-body"><input type="hidden" id="building-id">
      <div class="mb-3"><label class="form-label">Location</label><select class="form-select" id="building-location" required></select></div>
      <div class="mb-3"><label class="form-label">Civic address</label><input class="form-control" id="building-address" required></div>
      <div class="row g-3">
        <div class="col-md-6"><label class="form-label">City</label><input class="form-control" id="building-city"></div>
        <div class="col-md-6"><label class="form-label">State / Province</label><input class="form-control" id="building-state"></div>
        <div class="col-md-6"><label class="form-label">ZIP / Postal Code</label><input class="form-control" id="building-postal"></div>
      </div>
    </div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button class="btn btn-primary">Save</button></div>
    </form></div></div></div>`;
}
