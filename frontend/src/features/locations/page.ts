
import { db } from "../../db/database";
import { locationRepository } from "../../repositories/locationRepository";
import { locationService } from "../../services/locationService";
import { createTable } from "../shared/table";
import { modal, notify } from "../shared/ui";

let table: ReturnType<typeof createTable> | undefined;

export async function renderLocations(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="page-heading d-flex justify-content-between align-items-center">
      <div><h1>Locations</h1><p class="text-body-secondary mb-0">Streets and portfolio groupings</p></div>
      <button class="btn btn-primary" id="add-location"><i class="fa-solid fa-plus me-1"></i>Add Location</button>
    </div>
    <div class="card"><div class="card-body">
      <table id="locations-table" class="table table-hover align-middle w-100">
        <thead><tr><th>Location</th><th>City</th><th>Buildings</th><th>Units</th><th>Actions</th></tr></thead>
      </table>
    </div></div>
    ${editor()}
  `;

  await refresh();
  document.getElementById("add-location")?.addEventListener("click", () => openEditor());
  document.getElementById("location-form")?.addEventListener("submit", save);
  document.getElementById("locations-table")?.addEventListener("click", action);
}

async function rows() {
  const locations = await db.locations.toArray();
  const buildings = await db.buildings.toArray();
  const units = await db.units.toArray();
  return locations.map((location) => {
    const locationBuildings = buildings.filter((item) => item.locationId === location.id);
    const ids = locationBuildings.map((item) => item.id);
    return { ...location, buildingCount: ids.length, unitCount: units.filter((item) => ids.includes(item.buildingId)).length };
  });
}

async function refresh(): Promise<void> {
  table?.destroy();
  table = createTable("#locations-table", {
    data: await rows(),
    columns: [
      { data: "name" }, { data: "city" }, { data: "buildingCount" }, { data: "unitCount" },
      { data: "id", orderable: false, searchable: false, render: buttons },
    ],
  });
}

async function openEditor(id?: number): Promise<void> {
  (document.getElementById("location-form") as HTMLFormElement).reset();
  (document.getElementById("location-id") as HTMLInputElement).value = "";
  if (id) {
    const item = await locationRepository.getById(id);
    if (!item) return;
    (document.getElementById("location-id") as HTMLInputElement).value = String(id);
    (document.getElementById("location-name") as HTMLInputElement).value = item.name;
    (document.getElementById("location-city") as HTMLInputElement).value = item.city;
  }
  modal("location-modal").show();
}

async function save(event: Event): Promise<void> {
  event.preventDefault();
  try {
    const value = (document.getElementById("location-id") as HTMLInputElement).value;
    await locationService.save({
      id: value ? Number(value) : undefined,
      name: (document.getElementById("location-name") as HTMLInputElement).value,
      city: (document.getElementById("location-city") as HTMLInputElement).value,
    });
    modal("location-modal").hide();
    await refresh();
    notify("Location saved.");
  } catch (error) { notify((error as Error).message, "danger"); }
}

async function action(event: Event): Promise<void> {
  const target = event.target as HTMLElement;
  const id = Number(target.dataset.id);
  if (!id) return;
  if (target.classList.contains("edit-record")) await openEditor(id);
  if (target.classList.contains("delete-record") && confirm("Delete this location?")) {
    try { await locationService.remove(id); await refresh(); notify("Location deleted."); }
    catch (error) { notify((error as Error).message, "danger"); }
  }
}

function buttons(id: number): string {
  return `<button class="btn btn-sm btn-outline-primary edit-record" data-id="${id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger delete-record" data-id="${id}">Delete</button>`;
}

function editor(): string {
  return `<div class="modal fade" id="location-modal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
    <form id="location-form"><div class="modal-header"><h5 class="modal-title">Location</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
    <div class="modal-body"><input type="hidden" id="location-id">
      <div class="mb-3"><label class="form-label">Location name</label><input class="form-control" id="location-name" required></div>
      <div class="mb-3"><label class="form-label">City</label><input class="form-control" id="location-city" required></div>
    </div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button class="btn btn-primary">Save</button></div>
    </form></div></div></div>`;
}
