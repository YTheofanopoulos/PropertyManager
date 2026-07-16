import { db } from "../../db/database";
import type {
  ChargeType,
  LeaseStatus,
  LeaseTermType,
  Tenant,
} from "../../models/domain";
import { leaseRepository } from "../../repositories/leaseRepository";
import { leaseService } from "../../services/leaseService";
import { tenantService } from "../../services/tenantService";
import { currency, escapeHtml } from "../shared/format";
import { modal, notify } from "../shared/ui";

import { applicationClock } from "../../services/applicationClockService";
const chargeTypes: ChargeType[] = [
  "Apartment Rent",
  "Parking",
  "Storage",
  "Other",
];

export async function renderLeaseEditor(
  container: HTMLElement,
  leaseId?: number,
): Promise<void> {
  const [units, buildings, locations, tenants] = await Promise.all([
    db.units.toArray(),
    db.buildings.toArray(),
    db.locations.toArray(),
    db.tenants.orderBy("lastName").toArray(),
  ]);

  const buildingMap = new Map(buildings.map((item) => [item.id, item]));
  const locationMap = new Map(locations.map((item) => [item.id, item]));
  const tenantMap = new Map(
    tenants
      .filter((tenant): tenant is Tenant & { id: number } => tenant.id !== undefined)
      .map((tenant) => [tenant.id, tenant]),
  );

  const lease = leaseId ? await leaseRepository.getById(leaseId) : undefined;
  if (leaseId && !lease) {
    container.innerHTML = `<div class="alert alert-danger">Lease not found.</div>`;
    return;
  }

  const participants = leaseId
    ? await leaseRepository.getParticipants(leaseId)
    : [];
  const charges = leaseId
    ? await leaseRepository.getCharges(leaseId)
    : [];

  const selectedTenantIds = participants
    .sort((left, right) =>
      Number(right.primary) - Number(left.primary) ||
      (left.sortOrder ?? Number.MAX_SAFE_INTEGER) -
        (right.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
      Number(left.id ?? 0) - Number(right.id ?? 0),
    )
    .map((participant) => participant.tenantId);

  const unitOptions = units
    .filter((unit) => unit.active !== false)
    .map((unit) => {
      const building = buildingMap.get(unit.buildingId);
      const location = building ? locationMap.get(building.locationId) : undefined;
      const label = `${building?.civicAddress ?? "?"}${unit.apartmentNumber ? ` ${unit.apartmentNumber}` : ""} ${location?.name ?? ""}`;
      return `<option value="${unit.id}" ${lease?.unitId === unit.id ? "selected" : ""}>${escapeHtml(label)}</option>`;
    })
    .join("");

  container.innerHTML = `
    <div class="page-heading d-flex justify-content-between align-items-center">
      <div>
        <h1>${lease ? "Edit Lease" : "Create Lease"}</h1>
        <p class="text-body-secondary mb-0">
          ${lease ? "The leased unit is locked; terms and participants remain editable." : "Create a time-bound agreement for an active unit."}
        </p>
      </div>
      <a class="btn btn-outline-secondary" href="#/leases">Back to Leases</a>
    </div>

    <form id="lease-form">
      <div class="row g-4">
        <div class="col-xl-8">
          <div class="card mb-4">
            <div class="card-header fw-semibold">1. Unit</div>
            <div class="card-body">
              <label class="form-label">Unit</label>
              <select id="lease-unit" class="form-select" ${lease ? "disabled" : ""} required>
                <option value="">Choose a unit...</option>
                ${unitOptions}
              </select>
              ${lease ? `<input type="hidden" id="lease-unit-hidden" value="${lease.unitId}">` : ""}
              <div class="form-text">Existing leases remain attached to their original unit.</div>
            </div>
          </div>

          <div class="card mb-4">
            <div class="card-header d-flex justify-content-between align-items-center gap-2 flex-wrap">
              <span class="fw-semibold">2. Leaseholders</span>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-primary" type="button" id="add-existing-tenant">
                  <i class="fa-solid fa-user-check me-1"></i>Add Existing Tenant
                </button>
                <button class="btn btn-sm btn-outline-secondary" type="button" id="show-new-tenant">
                  <i class="fa-solid fa-user-plus me-1"></i>New Tenant
                </button>
              </div>
            </div>
            <div class="card-body">
              <p class="text-body-secondary mb-3">
                The first leaseholder is primary. Removing the primary automatically promotes the first secondary.
              </p>
              <div id="selected-leaseholders"></div>
            </div>
          </div>

          <div class="card mb-4">
            <div class="card-header fw-semibold">3. Lease Term</div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label">Term Type</label>
                  <select id="lease-term" class="form-select">
                    <option value="Fixed" ${(lease?.termType ?? "Fixed") === "Fixed" ? "selected" : ""}>Fixed</option>
                    <option value="Month-to-Month" ${lease?.termType === "Month-to-Month" ? "selected" : ""}>Month-to-Month</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Start Date</label>
                  <input id="lease-start" type="date" class="form-control"
                         value="${lease?.startDate ?? applicationClock.today()}" required>
                </div>
                <div class="col-md-4" id="end-date-column">
                  <label class="form-label">End Date</label>
                  <input id="lease-end" type="date" class="form-control"
                         value="${lease?.endDate ?? defaultEndDate()}">
                </div>
                <div class="col-md-4">
                  <label class="form-label">Status</label>
                  <select id="lease-status" class="form-select">
                    ${(["Future", "Active", "Expired", "Terminated"] as LeaseStatus[]).map((status) =>
                      `<option ${lease?.status === status || (!lease && status === "Active") ? "selected" : ""}>${status}</option>`,
                    ).join("")}
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label">Notes</label>
                  <textarea id="lease-notes" class="form-control" rows="3">${escapeHtml(lease?.notes ?? "")}</textarea>
                </div>
              </div>
            </div>
          </div>

          <div class="card mb-4">
            <div class="card-header fw-semibold">4. Recurring Charges</div>
            <div class="card-body">
              <p class="text-body-secondary">
                Apartment rent is required. Market Rent is used only as the initial suggestion; the saved lease rent becomes authoritative.
              </p>
              <div id="charge-list">
                ${chargeTypes.map((type) => chargeRow(
                  type,
                  charges.find((charge) => charge.chargeType === type)?.amount ??
                    (type === "Apartment Rent"
                      ? units.find((unit) => unit.id === lease?.unitId)?.monthlyRent ?? 0
                      : 0),
                  charges.find((charge) => charge.chargeType === type)?.description ?? type,
                )).join("")}
              </div>
              <div class="border-top pt-3 mt-3 d-flex justify-content-between">
                <strong>Monthly Total</strong>
                <strong id="monthly-total">${currency(0)}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-4">
          <div class="card sticky-xl-top lease-review-card">
            <div class="card-header fw-semibold">Review</div>
            <div class="card-body">
              <dl class="row mb-0">
                <dt class="col-5">Unit</dt><dd class="col-7" id="review-unit">—</dd>
                <dt class="col-5">Term</dt><dd class="col-7" id="review-term">—</dd>
                <dt class="col-5">People</dt><dd class="col-7" id="review-people">0</dd>
                <dt class="col-5">Monthly</dt><dd class="col-7" id="review-total">${currency(0)}</dd>
              </dl>
              <button class="btn btn-primary w-100 mt-4" type="submit">
                ${lease ? "Save Lease" : "Create Lease"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>

    <div class="modal fade" id="tenant-picker-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title fs-5" id="tenant-picker-title">Add Existing Tenant</h2>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <label class="form-label" for="tenant-search">Search tenants</label>
            <div class="input-group mb-3">
              <span class="input-group-text"><i class="fa-solid fa-magnifying-glass"></i></span>
              <input id="tenant-search" class="form-control" placeholder="Name, email, or phone" autocomplete="off">
            </div>
            <div id="tenant-picker-results" class="tenant-picker-results"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="new-tenant-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <form id="new-tenant-form">
            <div class="modal-header">
              <h2 class="modal-title fs-5">New Tenant</h2>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p class="text-body-secondary">The tenant will be saved and added to this lease.</p>
              <div class="row g-3">
                <div class="col-md-6"><label class="form-label">First Name</label><input id="new-first" class="form-control" required></div>
                <div class="col-md-6"><label class="form-label">Last Name</label><input id="new-last" class="form-control" required></div>
                <div class="col-md-6"><label class="form-label">Email</label><input id="new-email" type="email" class="form-control" required></div>
                <div class="col-md-6"><label class="form-label">Phone</label><input id="new-phone" class="form-control"></div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Create and Add</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  bindEditor(container, leaseId, tenants, tenantMap, selectedTenantIds);
}

function chargeRow(type: ChargeType, amount: number, description: string): string {
  return `
    <div class="row g-2 align-items-end charge-row mb-3" data-type="${type}">
      <div class="col-md-4"><label class="form-label">${type}</label><input class="form-control charge-description" value="${escapeHtml(description)}"></div>
      <div class="col-md-4"><label class="form-label">Monthly Amount</label><input class="form-control charge-amount" type="number" min="0" step="0.01" value="${amount}"></div>
      <div class="col-md-4 small text-body-secondary pb-2">${type === "Apartment Rent" ? "Required base rent" : "Optional"}</div>
    </div>
  `;
}

function defaultEndDate(): string {
  const date = applicationClock.date();
  date.setFullYear(date.getFullYear() + 1);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function bindEditor(
  container: HTMLElement,
  leaseId: number | undefined,
  tenants: Tenant[],
  tenantMap: Map<number, Tenant & { id: number }>,
  selectedTenantIds: number[],
): void {
  let replacementIndex: number | null = null;

  const renderSelected = (): void => {
    const host = document.getElementById("selected-leaseholders");
    if (!host) return;

    if (selectedTenantIds.length === 0) {
      host.innerHTML = `
        <div class="leaseholder-empty text-center">
          <i class="fa-regular fa-user fs-3 d-block mb-2"></i>
          <strong>No leaseholders selected</strong>
          <div class="small text-body-secondary">Use Add Existing Tenant or New Tenant to begin.</div>
        </div>`;
    } else {
      host.innerHTML = `<div class="selected-leaseholder-list">${selectedTenantIds.map((tenantId, index) => {
        const tenant = tenantMap.get(tenantId);
        if (!tenant) return "";
        return `
          <div class="selected-leaseholder-card">
            <div class="leaseholder-avatar" aria-hidden="true">${escapeHtml(tenant.firstName.charAt(0))}${escapeHtml(tenant.lastName.charAt(0))}</div>
            <div class="flex-grow-1 min-width-0">
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <strong>${escapeHtml(tenant.firstName)} ${escapeHtml(tenant.lastName)}</strong>
                <span class="badge ${index === 0 ? "text-bg-primary" : "text-bg-secondary"}">${index === 0 ? "Primary" : "Secondary"}</span>
              </div>
              <div class="small text-body-secondary text-truncate">${escapeHtml(tenant.email)}</div>
              ${tenant.phone ? `<div class="small text-body-secondary">${escapeHtml(tenant.phone)}</div>` : ""}
            </div>
            <div class="d-flex gap-2 flex-wrap justify-content-end">
              <button type="button" class="btn btn-sm btn-outline-secondary change-leaseholder" data-index="${index}">Change</button>
              <button type="button" class="btn btn-sm btn-outline-danger remove-leaseholder" data-index="${index}">Remove</button>
            </div>
          </div>`;
      }).join("")}</div>`;
    }

    host.querySelectorAll<HTMLButtonElement>(".change-leaseholder").forEach((button) => {
      button.addEventListener("click", () => openPicker(Number(button.dataset.index)));
    });
    host.querySelectorAll<HTMLButtonElement>(".remove-leaseholder").forEach((button) => {
      button.addEventListener("click", () => {
        selectedTenantIds.splice(Number(button.dataset.index), 1);
        renderSelected();
        refreshReview(selectedTenantIds.length);
      });
    });
  };

  const renderPickerResults = (): void => {
    const host = document.getElementById("tenant-picker-results");
    const search = (document.getElementById("tenant-search") as HTMLInputElement | null)?.value.trim().toLowerCase() ?? "";
    if (!host) return;

    const currentReplacementId = replacementIndex === null ? undefined : selectedTenantIds[replacementIndex];
    const unavailableIds = new Set(selectedTenantIds.filter((id) => id !== currentReplacementId));
    const matches = tenants
      .filter((tenant): tenant is Tenant & { id: number } => tenant.id !== undefined && tenant.active !== false)
      .filter((tenant) => !unavailableIds.has(tenant.id))
      .filter((tenant) => `${tenant.firstName} ${tenant.lastName} ${tenant.email} ${tenant.phone}`.toLowerCase().includes(search));

    host.innerHTML = matches.length === 0
      ? `<div class="alert alert-light border mb-0">No available tenants match this search.</div>`
      : matches.map((tenant) => `
          <button type="button" class="tenant-picker-row" data-tenant-id="${tenant.id}">
            <span class="leaseholder-avatar">${escapeHtml(tenant.firstName.charAt(0))}${escapeHtml(tenant.lastName.charAt(0))}</span>
            <span class="text-start flex-grow-1 min-width-0">
              <strong class="d-block">${escapeHtml(tenant.firstName)} ${escapeHtml(tenant.lastName)}</strong>
              <span class="small text-body-secondary d-block text-truncate">${escapeHtml(tenant.email)}${tenant.phone ? ` · ${escapeHtml(tenant.phone)}` : ""}</span>
            </span>
            <span class="btn btn-sm btn-primary">Select</span>
          </button>`).join("");

    host.querySelectorAll<HTMLButtonElement>(".tenant-picker-row").forEach((button) => {
      button.addEventListener("click", () => {
        const tenantId = Number(button.dataset.tenantId);
        if (replacementIndex === null) selectedTenantIds.push(tenantId);
        else selectedTenantIds[replacementIndex] = tenantId;
        modal("tenant-picker-modal").hide();
        renderSelected();
        refreshReview(selectedTenantIds.length);
      });
    });
  };

  const openPicker = (index: number | null): void => {
    replacementIndex = index;
    const title = document.getElementById("tenant-picker-title");
    const search = document.getElementById("tenant-search") as HTMLInputElement;
    if (title) title.textContent = index === null ? "Add Existing Tenant" : "Change Leaseholder";
    search.value = "";
    renderPickerResults();
    modal("tenant-picker-modal").show();
    setTimeout(() => search.focus(), 150);
  };

  document.getElementById("add-existing-tenant")?.addEventListener("click", () => openPicker(null));
  document.getElementById("tenant-search")?.addEventListener("input", renderPickerResults);

  document.querySelectorAll<HTMLInputElement>(".charge-amount").forEach((input) => input.addEventListener("input", () => refreshReview(selectedTenantIds.length)));
  document.getElementById("lease-unit")?.addEventListener("change", () => refreshReview(selectedTenantIds.length));
  document.getElementById("lease-term")?.addEventListener("change", () => {
    const term = (document.getElementById("lease-term") as HTMLSelectElement).value;
    document.getElementById("end-date-column")?.classList.toggle("d-none", term === "Month-to-Month");
    refreshReview(selectedTenantIds.length);
  });
  document.getElementById("lease-start")?.addEventListener("change", () => refreshReview(selectedTenantIds.length));
  document.getElementById("lease-end")?.addEventListener("change", () => refreshReview(selectedTenantIds.length));

  document.getElementById("show-new-tenant")?.addEventListener("click", () => {
    (document.getElementById("new-tenant-form") as HTMLFormElement).reset();
    modal("new-tenant-modal").show();
  });

  document.getElementById("new-tenant-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const tenantId = await tenantService.save({
        firstName: (document.getElementById("new-first") as HTMLInputElement).value,
        lastName: (document.getElementById("new-last") as HTMLInputElement).value,
        email: (document.getElementById("new-email") as HTMLInputElement).value,
        phone: (document.getElementById("new-phone") as HTMLInputElement).value,
        active: true,
      });
      const tenant = await db.tenants.get(tenantId);
      if (!tenant || tenant.id === undefined) throw new Error("The tenant was saved but could not be added to the lease.");
      tenants.push(tenant);
      tenants.sort((left, right) => left.lastName.localeCompare(right.lastName) || left.firstName.localeCompare(right.firstName));
      tenantMap.set(tenant.id, tenant as Tenant & { id: number });
      selectedTenantIds.push(tenant.id);
      modal("new-tenant-modal").hide();
      renderSelected();
      refreshReview(selectedTenantIds.length);
      notify("Tenant created and added to the lease.");
    } catch (error) {
      notify((error as Error).message, "danger");
    }
  });

  document.getElementById("lease-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const charges = Array.from(document.querySelectorAll<HTMLElement>(".charge-row")).map((row) => ({
        chargeType: row.dataset.type as ChargeType,
        description: (row.querySelector(".charge-description") as HTMLInputElement).value,
        amount: Number((row.querySelector(".charge-amount") as HTMLInputElement).value || 0),
      }));
      const unitId = Number(leaseId
        ? (document.getElementById("lease-unit-hidden") as HTMLInputElement).value
        : (document.getElementById("lease-unit") as HTMLSelectElement).value);

      await leaseService.save({
        id: leaseId,
        unitId,
        startDate: (document.getElementById("lease-start") as HTMLInputElement).value,
        endDate: (document.getElementById("lease-end") as HTMLInputElement).value,
        termType: (document.getElementById("lease-term") as HTMLSelectElement).value as LeaseTermType,
        status: (document.getElementById("lease-status") as HTMLSelectElement).value as LeaseStatus,
        notes: (document.getElementById("lease-notes") as HTMLTextAreaElement).value,
        participantIds: [...selectedTenantIds],
        primaryTenantId: selectedTenantIds[0] ?? 0,
        charges,
      });

      notify("Lease saved.");
      location.hash = "#/leases";
    } catch (error) {
      notify((error as Error).message, "danger");
    }
  });

  const term = (document.getElementById("lease-term") as HTMLSelectElement).value;
  document.getElementById("end-date-column")?.classList.toggle("d-none", term === "Month-to-Month");
  renderSelected();
  refreshReview(selectedTenantIds.length);
}

function refreshReview(selectedPeople: number): void {
  const unitSelect = document.getElementById("lease-unit") as HTMLSelectElement | null;
  const hiddenUnit = document.getElementById("lease-unit-hidden") as HTMLInputElement | null;
  const unitLabel = unitSelect?.selectedOptions[0]?.textContent ?? (hiddenUnit ? "Locked unit" : "—");
  const total = Array.from(document.querySelectorAll<HTMLInputElement>(".charge-amount")).reduce((sum, input) => sum + Number(input.value || 0), 0);
  const term = (document.getElementById("lease-term") as HTMLSelectElement | null)?.value ?? "Fixed";
  const start = (document.getElementById("lease-start") as HTMLInputElement | null)?.value ?? "";
  const end = (document.getElementById("lease-end") as HTMLInputElement | null)?.value ?? "";
  const totalText = currency(total);

  document.getElementById("monthly-total")!.textContent = totalText;
  document.getElementById("review-total")!.textContent = totalText;
  document.getElementById("review-unit")!.textContent = unitLabel;
  document.getElementById("review-people")!.textContent = String(selectedPeople);
  document.getElementById("review-term")!.textContent = term === "Month-to-Month"
    ? `${start || "Start date"} onward`
    : `${start || "Start"} to ${end || "End"}`;
}
