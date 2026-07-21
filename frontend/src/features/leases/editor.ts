import type {
  ChargeType,
  Lease,
  LeaseStatus,
  RenewalStatus,
  LeaseTermType,
  Tenant,
} from "../../models/domain";
import { leaseRepository } from "../../repositories/leaseRepository";
import { unitRepository } from "../../repositories/unitRepository";
import { buildingRepository } from "../../repositories/buildingRepository";
import { locationRepository } from "../../repositories/locationRepository";
import { tenantRepository } from "../../repositories/tenantRepository";
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
  renewalSourceId?: number,
): Promise<void> {
  const [units, buildings, locations, tenants] = await Promise.all([
    unitRepository.getAll(),
    buildingRepository.getAll(),
    locationRepository.getAll(),
    tenantRepository.getAll().then((rows) => rows.sort((left, right) =>
      left.lastName.localeCompare(right.lastName) || left.firstName.localeCompare(right.firstName))),
  ]);

  const buildingMap = new Map(buildings.map((item) => [item.id, item]));
  const locationMap = new Map(locations.map((item) => [item.id, item]));
  const tenantMap = new Map(
    tenants
      .filter((tenant): tenant is Tenant & { id: number } => tenant.id !== undefined)
      .map((tenant) => [tenant.id, tenant]),
  );

  const renewalDraft = renewalSourceId
    ? await leaseService.renewalDraft(renewalSourceId)
    : undefined;
  const lease = leaseId
    ? await leaseRepository.getById(leaseId)
    : renewalDraft?.renewal;
  if (leaseId && !lease) {
    container.innerHTML = `<div class="alert alert-danger">Lease not found.</div>`;
    return;
  }

  const participants = renewalDraft
    ? renewalDraft.renewal.participantIds.map((tenantId, index) => ({
        id: undefined, leaseId: renewalSourceId!, tenantId, primary: tenantId === renewalDraft.renewal.primaryTenantId,
        sortOrder: index,
      }))
    : leaseId
    ? await leaseRepository.getParticipants(leaseId)
    : [];
  const charges = renewalDraft
    ? renewalDraft.renewal.charges.map((charge) => ({...charge, leaseId: renewalSourceId!, frequency: "Monthly" as const,
        startDate: renewalDraft.renewal.startDate, endDate: renewalDraft.renewal.endDate}))
    : leaseId
    ? await leaseRepository.getCharges(leaseId)
    : [];
  const concessions = renewalDraft
    ? renewalDraft.renewal.concessions.map((item) => ({...item, leaseId: renewalSourceId!}))
    : leaseId
    ? await leaseRepository.getConcessions(leaseId)
    : [];
  const history = leaseId || renewalSourceId
    ? await leaseRepository.getHistory(leaseId ?? renewalSourceId!)
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
        <h1>${renewalDraft ? "Renew Lease" : lease ? "Edit Lease" : "Create Lease"}</h1>
        <p class="text-body-secondary mb-0">
          ${renewalDraft ? `Create a successor to Lease #${renewalSourceId}. Every copied value can be reviewed and edited.` : lease ? "The leased unit is locked; terms and participants remain editable." : "Create a time-bound agreement for an active unit."}
        </p>
      </div>
      <a class="btn btn-outline-secondary" href="#/leases">Back to Leases</a>
    </div>

    ${renewalDraft ? `<input type="hidden" id="renewal-source-rent" value="${renewalDraft.currentRent}">` : ""}
    <form id="lease-form">
      <div class="row g-4">
        <div class="col-xl-8">
          <div class="card mb-4">
            <div class="card-header fw-semibold">1. Unit</div>
            <div class="card-body">
              <label class="form-label">Unit</label>
              <select id="lease-unit" class="form-select" ${leaseId ? "disabled" : ""} required>
                <option value="">Choose a unit...</option>
                ${unitOptions}
              </select>
              ${leaseId ? `<input type="hidden" id="lease-unit-hidden" value="${lease!.unitId}">` : ""}
              <div class="form-text">${renewalDraft ? "The existing unit is selected, but can be changed before the successor is created." : "Existing leases remain attached to their original unit."}</div>
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
            <div class="card-header fw-semibold">4. Renewal Tracking</div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label">Renewal Status</label>
                  <select id="renewal-status" class="form-select">
                    ${(["Not Started", "Renewal Letter Sent", "Accepted", "Renewed", "Under Dispute", "Non-Renewal"] as RenewalStatus[]).map((status) =>
                      `<option ${lease?.renewalStatus === status || (!lease?.renewalStatus && status === "Not Started") ? "selected" : ""}>${status}</option>`,
                    ).join("")}
                  </select>
                </div>
                <div class="col-md-4"><label class="form-label">Proposed Renewal Rent</label>
                  <div class="input-group"><span class="input-group-text">$</span><input id="renewal-proposed-rent" type="number" min="0.01" step="0.01" class="form-control" value="${lease?.renewalProposedRent ?? ""}"></div></div>
                <div class="col-md-4"><label class="form-label">Renewal Letter Sent Date</label>
                  <input id="renewal-letter-date" type="date" class="form-control" value="${lease?.renewalLetterSentDate ?? ""}"></div>
                <div class="col-md-4"><label class="form-label">Response / Resolution Date</label>
                  <input id="renewal-response-date" type="date" class="form-control" value="${lease?.renewalResponseDate ?? ""}"></div>
                <div class="col-12"><label class="form-label">Renewal Notes</label>
                  <textarea id="renewal-notes" class="form-control" rows="2">${escapeHtml(lease?.renewalNotes ?? "")}</textarea></div>
                ${leaseId && lease?.renewalStatus === "Accepted" && !(lease as Lease).successorLeaseId
                  ? `<div class="col-12"><a class="btn btn-success" href="#/leases/${leaseId}/renew"><i class="fa-solid fa-rotate me-1"></i>Start Renewal</a></div>`
                  : leaseId && (lease as Lease)?.successorLeaseId
                    ? `<div class="col-12"><a class="btn btn-outline-success" href="#/leases/${(lease as Lease).successorLeaseId}">View Renewal Lease #${(lease as Lease).successorLeaseId}</a></div>`
                    : ""}
              </div>
            </div>
          </div>

          <div class="card mb-4">
            <div class="card-header fw-semibold">5. Recurring Charges</div>
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

          <div class="card mb-4">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span class="fw-semibold">6. Lease Concessions</span>
              <button class="btn btn-sm btn-outline-primary" type="button" id="add-concession">
                <i class="fa-solid fa-plus me-1"></i>Add Concession
              </button>
            </div>
            <div class="card-body">
              <p class="text-body-secondary">
                Concessions reduce the rent obligation for the selected month or range while preserving the contractual recurring rent.
              </p>
              <div id="concession-list">
                ${concessions.map((concession) => concessionRow(
                  concession.description,
                  concession.amount,
                  concession.startPeriod,
                  concession.endPeriod,
                  concession.comment ?? "",
                  concession.id,
                )).join("")}
              </div>
              <div id="no-concessions" class="text-body-secondary small ${concessions.length ? "d-none" : ""}">No concessions defined.</div>
            </div>
          </div>
        </div>

        <div class="col-xl-4">
          <div class="card sticky-xl-top lease-review-card">
            <div class="card-header fw-semibold">${renewalDraft ? "Renewal Review" : "Review"}</div>
            <div class="card-body">
              <dl class="row mb-0">
                <dt class="col-5">Unit</dt><dd class="col-7" id="review-unit">—</dd>
                <dt class="col-5">Term</dt><dd class="col-7" id="review-term">—</dd>
                <dt class="col-5">People</dt><dd class="col-7" id="review-people">0</dd>
                <dt class="col-5">Monthly</dt><dd class="col-7" id="review-total">${currency(0)}</dd>
                ${renewalDraft ? `
                  <dt class="col-5 border-top pt-3 mt-2">Current term</dt><dd class="col-7 border-top pt-3 mt-2">${renewalDraft.sourceLease.startDate} to ${renewalDraft.sourceLease.endDate}</dd>
                  <dt class="col-5">Current rent</dt><dd class="col-7">${currency(renewalDraft.currentRent)}</dd>
                  <dt class="col-5">New rent</dt><dd class="col-7" id="review-new-rent">—</dd>
                  <dt class="col-5">Increase</dt><dd class="col-7" id="review-increase">—</dd>
                ` : ""}
              </dl>
              <button class="btn btn-primary w-100 mt-4" type="submit">
                ${renewalDraft ? "Review and Create Renewal" : lease ? "Save Lease" : "Create Lease"}
              </button>
            </div>
          </div>
          ${history.length ? `<div class="card mt-4"><div class="card-header fw-semibold">Lease History</div><div class="list-group list-group-flush">
            ${history.map(item=>`<a class="list-group-item list-group-item-action ${item.id===(leaseId??renewalSourceId)?"active":""}" href="#/leases/${item.id}">
              <div class="d-flex justify-content-between"><strong>Lease #${item.id}</strong><span>${currency(item.monthlyTotal)}</span></div>
              <div class="small">${item.startDate} – ${item.endDate || "Open-ended"} · ${escapeHtml(item.status)}</div>
            </a>`).join("")}
          </div></div>` : ""}
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

  bindEditor(container, leaseId, renewalSourceId, renewalDraft?.currentRent, lease?.renewalStatus,
    tenants, tenantMap, selectedTenantIds);
}

function chargeRow(type: ChargeType, amount: number, description: string): string {
  return `
    <div class="row g-2 align-items-end charge-row mb-3" data-type="${type}">
      <div class="col-md-4"><label class="form-label">${type}</label><input class="form-control charge-description" value="${escapeHtml(description)}"></div>
      <div class="col-md-4"><label class="form-label">Monthly Amount</label><div class="input-group currency-input"><span class="input-group-text">$</span><input class="form-control charge-amount" type="number" min="0" step="0.01" inputmode="decimal" value="${amount.toFixed(2)}"></div></div>
      <div class="col-md-4 small text-body-secondary pb-2">${type === "Apartment Rent" ? "Required base rent" : "Optional"}</div>
    </div>
  `;
}

function concessionRow(description = "Move-in concession", amount = 0, startPeriod = "", endPeriod = "", comment = "", id?: number): string {
  const locked = id !== undefined;
  return `
    <div class="card concession-row mb-3" ${id !== undefined ? `data-concession-id="${id}"` : ""}>
      <div class="card-body"><div class="row g-2 align-items-end">
        <div class="col-md-4"><label class="form-label">Description</label><input class="form-control concession-description" value="${escapeHtml(description)}"></div>
        <div class="col-md-2"><label class="form-label">Credit</label><input class="form-control concession-amount" type="number" min="0.01" step="0.01" value="${amount || ""}" ${locked ? "readonly" : ""}></div>
        <div class="col-md-2"><label class="form-label">Start Month</label><input class="form-control concession-start" type="month" value="${startPeriod}" ${locked ? "readonly" : ""}></div>
        <div class="col-md-2"><label class="form-label">End Month</label><input class="form-control concession-end" type="month" value="${endPeriod}" ${locked ? "readonly" : ""}></div>
        <div class="col-md-2"><button class="btn btn-outline-danger w-100 remove-concession" type="button">Remove</button></div>
        <div class="col-12"><label class="form-label">Reason / Comment</label><textarea class="form-control concession-comment" rows="2" placeholder="Why was this concession granted?">${escapeHtml(comment)}</textarea></div>
        ${locked ? '<div class="col-12 small text-body-secondary"><i class="fa-solid fa-lock me-1"></i>Amount and effective months are locked after the concession is recorded. Description and reason remain editable.</div>' : ''}
      </div></div>
    </div>`;
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
  renewalSourceId: number | undefined,
  currentRent: number | undefined,
  originalRenewalStatus: RenewalStatus | undefined,
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

  const bindConcessionRows = (): void => {
    document.querySelectorAll<HTMLButtonElement>(".remove-concession").forEach((button) => {
      button.onclick = () => {
        button.closest(".concession-row")?.remove();
        document.getElementById("no-concessions")?.classList.toggle(
          "d-none",
          document.querySelectorAll(".concession-row").length > 0,
        );
        refreshReview(selectedTenantIds.length);
      };
    });
    document.querySelectorAll<HTMLInputElement>(".concession-amount").forEach((input) => {
      input.oninput = () => refreshReview(selectedTenantIds.length);
    });
  };
  document.getElementById("add-concession")?.addEventListener("click", () => {
    const start = (document.getElementById("lease-start") as HTMLInputElement).value.slice(0, 7);
    document.getElementById("concession-list")?.insertAdjacentHTML(
      "beforeend",
      concessionRow("Move-in concession", 0, start, start, ""),
    );
    document.getElementById("no-concessions")?.classList.add("d-none");
    bindConcessionRows();
  });
  bindConcessionRows();

  document.querySelectorAll<HTMLInputElement>(".charge-amount").forEach((input) => {
    input.addEventListener("input", () => refreshReview(selectedTenantIds.length));
    input.addEventListener("blur", () => {
      const amount = Number(input.value || 0);
      input.value = Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
      refreshReview(selectedTenantIds.length);
    });
  });
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
      const tenant = await tenantRepository.getById(tenantId);
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
      const concessions = Array.from(document.querySelectorAll<HTMLElement>(".concession-row")).map((row) => ({
        id: row.dataset.concessionId ? Number(row.dataset.concessionId) : undefined,
        description: (row.querySelector(".concession-description") as HTMLInputElement).value,
        amount: Number((row.querySelector(".concession-amount") as HTMLInputElement).value || 0),
        startPeriod: (row.querySelector(".concession-start") as HTMLInputElement).value,
        endPeriod: (row.querySelector(".concession-end") as HTMLInputElement).value,
        comment: (row.querySelector(".concession-comment") as HTMLTextAreaElement).value,
      }));
      const unitId = Number(leaseId
        ? (document.getElementById("lease-unit-hidden") as HTMLInputElement).value
        : (document.getElementById("lease-unit") as HTMLSelectElement).value);

      const payload = {
        id: leaseId,
        unitId,
        startDate: (document.getElementById("lease-start") as HTMLInputElement).value,
        endDate: (document.getElementById("lease-end") as HTMLInputElement).value,
        termType: (document.getElementById("lease-term") as HTMLSelectElement).value as LeaseTermType,
        status: (document.getElementById("lease-status") as HTMLSelectElement).value as LeaseStatus,
        notes: (document.getElementById("lease-notes") as HTMLTextAreaElement).value,
        renewalStatus: (document.getElementById("renewal-status") as HTMLSelectElement).value as RenewalStatus,
        renewalProposedRent: Number((document.getElementById("renewal-proposed-rent") as HTMLInputElement).value) || null,
        renewalLetterSentDate: (document.getElementById("renewal-letter-date") as HTMLInputElement).value,
        renewalResponseDate: (document.getElementById("renewal-response-date") as HTMLInputElement).value,
        renewalNotes: (document.getElementById("renewal-notes") as HTMLTextAreaElement).value,
        participantIds: [...selectedTenantIds],
        primaryTenantId: selectedTenantIds[0] ?? 0,
        charges,
        concessions,
      };

      if (renewalSourceId) {
        const rent = charges.find(item=>item.chargeType==="Apartment Rent")?.amount ?? 0;
        const increase = rent - (currentRent ?? 0);
        const percent = currentRent ? (increase/currentRent)*100 : 0;
        if (!window.confirm(`Create this renewal lease?\n\nCurrent rent: ${currency(currentRent ?? 0)}\nNew rent: ${currency(rent)}\nIncrease: ${currency(increase)} (${percent.toFixed(2)}%)\n\nThe current lease will remain unchanged.`)) return;
        const newId=await leaseService.createRenewal(renewalSourceId,payload);
        notify("Renewal lease created.");
        location.hash=`#/leases/${newId}`;
        return;
      }

      const savedId=await leaseService.save(payload);

      notify("Lease saved.");
      if (leaseId && originalRenewalStatus !== "Accepted" && payload.renewalStatus === "Accepted" &&
          window.confirm("The tenant accepted the renewal terms. Start the renewal now?")) {
        location.hash = `#/leases/${savedId}/renew`;
        return;
      }
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
  const rent=Number((document.querySelector<HTMLElement>('.charge-row[data-type="Apartment Rent"] .charge-amount') as HTMLInputElement|null)?.value||0);
  const current=document.getElementById("review-new-rent");
  if(current){
    current.textContent=currency(rent);
    const original=Number((document.getElementById("renewal-source-rent") as HTMLInputElement|null)?.value||0);
    const increase=rent-original;
    const percent=original?(increase/original)*100:0;
    document.getElementById("review-increase")!.textContent=`${currency(increase)} (${percent.toFixed(2)}%)`;
  }
}
