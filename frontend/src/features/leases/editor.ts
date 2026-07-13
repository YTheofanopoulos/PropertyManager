
import { db } from "../../db/database";
import type { ChargeType, LeaseStatus, LeaseTermType } from "../../models/domain";
import { leaseRepository } from "../../repositories/leaseRepository";
import { leaseService } from "../../services/leaseService";
import { tenantService } from "../../services/tenantService";
import { currency, escapeHtml } from "../shared/format";
import { notify } from "../shared/ui";

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

  const unitOptions = units
    .filter((unit) => unit.active !== false)
    .map((unit) => {
      const building = buildingMap.get(unit.buildingId);
      const location = building ? locationMap.get(building.locationId) : undefined;
      const label = `${building?.civicAddress ?? "?"}${unit.apartmentNumber ? ` ${unit.apartmentNumber}` : ""} ${location?.name ?? ""}`;
      return `<option value="${unit.id}" ${lease?.unitId === unit.id ? "selected" : ""}>${escapeHtml(label)}</option>`;
    })
    .join("");

  const selectedTenantIds = new Set(participants.map((item) => item.tenantId));
  const primaryTenantId = participants.find((item) => item.primary)?.tenantId;

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
              <div class="form-text">
                Existing leases remain attached to their original unit.
              </div>
            </div>
          </div>

          <div class="card mb-4">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span class="fw-semibold">2. Leaseholders</span>
              <button class="btn btn-sm btn-outline-primary" type="button" id="show-new-tenant">
                Add New Person
              </button>
            </div>
            <div class="card-body">
              <div class="alert alert-light border">
                Select one or more people and choose exactly one primary leaseholder.
              </div>
              <div class="leaseholder-list">
                ${tenants.map((tenant) => {
                  const checked = selectedTenantIds.has(tenant.id as number);
                  const primary = primaryTenantId === tenant.id;
                  return `
                    <div class="leaseholder-row">
                      <div class="form-check">
                        <input class="form-check-input participant-check" type="checkbox"
                               value="${tenant.id}" id="participant-${tenant.id}"
                               ${checked ? "checked" : ""}>
                        <label class="form-check-label" for="participant-${tenant.id}">
                          ${escapeHtml(tenant.firstName)} ${escapeHtml(tenant.lastName)}
                          <span class="text-body-secondary small">${escapeHtml(tenant.email)}</span>
                        </label>
                      </div>
                      <div class="form-check">
                        <input class="form-check-input primary-radio" type="radio"
                               name="primaryTenant" value="${tenant.id}"
                               ${primary ? "checked" : ""}
                               ${checked ? "" : "disabled"}>
                        <label class="form-check-label">Primary</label>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>

              <div id="new-tenant-panel" class="border rounded p-3 mt-3 d-none">
                <h3 class="h6">Create tenant during lease setup</h3>
                <div class="row g-3">
                  <div class="col-md-6"><input id="new-first" class="form-control" placeholder="First name"></div>
                  <div class="col-md-6"><input id="new-last" class="form-control" placeholder="Last name"></div>
                  <div class="col-md-6"><input id="new-email" type="email" class="form-control" placeholder="Email"></div>
                  <div class="col-md-6"><input id="new-phone" class="form-control" placeholder="Phone"></div>
                </div>
                <button class="btn btn-sm btn-primary mt-3" type="button" id="create-tenant">
                  Create and Select
                </button>
              </div>
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
                         value="${lease?.startDate ?? new Date().toISOString().slice(0, 10)}" required>
                </div>
                <div class="col-md-4" id="end-date-column">
                  <label class="form-label">End Date</label>
                  <input id="lease-end" type="date" class="form-control"
                         value="${lease?.endDate ?? defaultEndDate()}">
                </div>
                <div class="col-md-4">
                  <label class="form-label">Status</label>
                  <select id="lease-status" class="form-select">
                    ${(["Future","Active","Expired","Terminated"] as LeaseStatus[]).map((status) =>
                      `<option ${lease?.status === status || (!lease && status === "Active") ? "selected" : ""}>${status}</option>`
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
                Apartment rent is required. Parking and storage remain separate optional charges.
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
  `;

  bindEditor(container, leaseId);
  refreshReview();
}

function chargeRow(type: ChargeType, amount: number, description: string): string {
  return `
    <div class="row g-2 align-items-end charge-row mb-3" data-type="${type}">
      <div class="col-md-4">
        <label class="form-label">${type}</label>
        <input class="form-control charge-description" value="${escapeHtml(description)}">
      </div>
      <div class="col-md-4">
        <label class="form-label">Monthly Amount</label>
        <input class="form-control charge-amount" type="number" min="0" step="0.01"
               value="${amount}">
      </div>
      <div class="col-md-4 small text-body-secondary pb-2">
        ${type === "Apartment Rent" ? "Required base rent" : "Optional"}
      </div>
    </div>
  `;
}

function defaultEndDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function bindEditor(container: HTMLElement, leaseId?: number): void {
  document.querySelectorAll<HTMLInputElement>(".participant-check").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const radio = document.querySelector<HTMLInputElement>(
        `.primary-radio[value="${checkbox.value}"]`,
      );
      if (radio) {
        radio.disabled = !checkbox.checked;
        if (!checkbox.checked) radio.checked = false;
      }
      refreshReview();
    });
  });

  document.querySelectorAll<HTMLInputElement>(".primary-radio").forEach((radio) => {
    radio.addEventListener("change", refreshReview);
  });

  document.querySelectorAll<HTMLInputElement>(".charge-amount").forEach((input) => {
    input.addEventListener("input", refreshReview);
  });

  document.getElementById("lease-unit")?.addEventListener("change", refreshReview);
  document.getElementById("lease-term")?.addEventListener("change", () => {
    const term = (document.getElementById("lease-term") as HTMLSelectElement).value;
    document.getElementById("end-date-column")?.classList.toggle(
      "d-none",
      term === "Month-to-Month",
    );
    refreshReview();
  });
  document.getElementById("lease-start")?.addEventListener("change", refreshReview);
  document.getElementById("lease-end")?.addEventListener("change", refreshReview);

  document.getElementById("show-new-tenant")?.addEventListener("click", () => {
    document.getElementById("new-tenant-panel")?.classList.toggle("d-none");
  });

  document.getElementById("create-tenant")?.addEventListener("click", async () => {
    try {
      const tenantId = await tenantService.save({
        firstName: (document.getElementById("new-first") as HTMLInputElement).value,
        lastName: (document.getElementById("new-last") as HTMLInputElement).value,
        email: (document.getElementById("new-email") as HTMLInputElement).value,
        phone: (document.getElementById("new-phone") as HTMLInputElement).value,
        active: true,
      });
      notify("Tenant created. Reloading lease editor...");
      await renderLeaseEditor(container, leaseId);
      setTimeout(() => {
        const checkbox = document.getElementById(`participant-${tenantId}`) as HTMLInputElement | null;
        if (checkbox) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event("change"));
        }
      }, 0);
    } catch (error) {
      notify((error as Error).message, "danger");
    }
  });

  document.getElementById("lease-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const participantIds = Array.from(
        document.querySelectorAll<HTMLInputElement>(".participant-check:checked"),
      ).map((item) => Number(item.value));
      const primary = document.querySelector<HTMLInputElement>(".primary-radio:checked");

      const charges = Array.from(
        document.querySelectorAll<HTMLElement>(".charge-row"),
      ).map((row) => ({
        chargeType: row.dataset.type as ChargeType,
        description: (row.querySelector(".charge-description") as HTMLInputElement).value,
        amount: Number((row.querySelector(".charge-amount") as HTMLInputElement).value || 0),
      }));

      const unitId = Number(
        leaseId
          ? (document.getElementById("lease-unit-hidden") as HTMLInputElement).value
          : (document.getElementById("lease-unit") as HTMLSelectElement).value,
      );

      await leaseService.save({
        id: leaseId,
        unitId,
        startDate: (document.getElementById("lease-start") as HTMLInputElement).value,
        endDate: (document.getElementById("lease-end") as HTMLInputElement).value,
        termType: (document.getElementById("lease-term") as HTMLSelectElement).value as LeaseTermType,
        status: (document.getElementById("lease-status") as HTMLSelectElement).value as LeaseStatus,
        notes: (document.getElementById("lease-notes") as HTMLTextAreaElement).value,
        participantIds,
        primaryTenantId: Number(primary?.value ?? 0),
        charges,
      });

      notify("Lease saved.");
      location.hash = "#/leases";
    } catch (error) {
      notify((error as Error).message, "danger");
    }
  });
}

function refreshReview(): void {
  const unitSelect = document.getElementById("lease-unit") as HTMLSelectElement | null;
  const hiddenUnit = document.getElementById("lease-unit-hidden") as HTMLInputElement | null;
  const unitLabel = unitSelect?.selectedOptions[0]?.textContent ??
    (hiddenUnit ? "Locked unit" : "—");

  const selectedPeople = document.querySelectorAll(".participant-check:checked").length;
  const total = Array.from(
    document.querySelectorAll<HTMLInputElement>(".charge-amount"),
  ).reduce((sum, input) => sum + Number(input.value || 0), 0);

  const term = (document.getElementById("lease-term") as HTMLSelectElement | null)?.value ?? "Fixed";
  const start = (document.getElementById("lease-start") as HTMLInputElement | null)?.value ?? "";
  const end = (document.getElementById("lease-end") as HTMLInputElement | null)?.value ?? "";

  const totalText = currency(total);
  const monthlyTotal = document.getElementById("monthly-total");
  const reviewTotal = document.getElementById("review-total");
  const reviewUnit = document.getElementById("review-unit");
  const reviewPeople = document.getElementById("review-people");
  const reviewTerm = document.getElementById("review-term");

  if (monthlyTotal) monthlyTotal.textContent = totalText;
  if (reviewTotal) reviewTotal.textContent = totalText;
  if (reviewUnit) reviewUnit.textContent = unitLabel;
  if (reviewPeople) reviewPeople.textContent = String(selectedPeople);
  if (reviewTerm) {
    reviewTerm.textContent =
      term === "Month-to-Month"
        ? `${start || "Start date"} onward`
        : `${start || "Start"} to ${end || "End"}`;
  }
}
