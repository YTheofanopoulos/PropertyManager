
import { db } from "../../db/database";
import type { PaymentMethod } from "../../models/domain";
import { paymentService } from "../../services/paymentService";
import { rentLedgerService } from "../../services/rentLedgerService";
import { createTable } from "../shared/table";
import { currency } from "../shared/format";

import { applicationClock } from "../../services/applicationClockService";
export async function renderPayments(container: HTMLElement): Promise<void> {
  const [payments, allocations, leases, units, buildings, locations] =
    await Promise.all([
      db.payments.orderBy("receivedDate").reverse().toArray(),
      db.paymentAllocations.toArray(),
      db.leases.toArray(),
      db.units.toArray(),
      db.buildings.toArray(),
      db.locations.toArray(),
    ]);

  const leaseMap = new Map(leases.map((item) => [item.id, item]));
  const unitMap = new Map(units.map((item) => [item.id, item]));
  const buildingMap = new Map(buildings.map((item) => [item.id, item]));
  const locationMap = new Map(locations.map((item) => [item.id, item]));

  const rows = payments.map((payment) => {
    const isVoided = (payment.status ?? "Posted") === "Voided";
    const allocated = isVoided
      ? 0
      : allocations
          .filter((allocation) => allocation.paymentId === payment.id)
          .reduce((total, allocation) => total + allocation.amount, 0);

    const lease = leaseMap.get(payment.leaseId);
    const unit = lease ? unitMap.get(lease.unitId) : undefined;
    const building = unit ? buildingMap.get(unit.buildingId) : undefined;
    const location = building ? locationMap.get(building.locationId) : undefined;
    const unitLabel =
      `${building?.civicAddress ?? "?"}` +
      `${unit?.apartmentNumber ? ` ${unit.apartmentNumber}` : ""}` +
      `${location?.name ? ` ${location.name}` : ""}`;

    return {
      ...payment,
      unitLabel: unitLabel.trim(),
      allocated,
      unapplied: isVoided ? 0 : payment.amount - allocated,
      effectiveStatus: payment.status ?? "Posted",
    };
  });

  container.innerHTML = `
    <div class="page-heading">
      <h1>Payments</h1>
      <p class="text-body-secondary mb-0">
        Review payment history, allocations, and void posted payments.
      </p>
    </div>

    <div class="card">
      <div class="card-body">
        <table id="payments-table" class="table table-hover align-middle w-100">
          <thead>
            <tr>
              <th>Received</th>
              <th>Unit</th>
              <th>Amount</th>
              <th>Allocated</th>
              <th>Unapplied</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
        </table>
      </div>
    </div>
  `;

  createTable("#payments-table", {
    data: rows,
    columns: [
      { data: "receivedDate" },
      { data: "unitLabel" },
      { data: "amount", render: (value: number) => currency(value) },
      { data: "allocated", render: (value: number) => currency(value) },
      { data: "unapplied", render: (value: number) => currency(value) },
      { data: "paymentMethod" },
      { data: "reference" },
      {
        data: "effectiveStatus",
        render: (value: string) =>
          `<span class="badge text-bg-${value === "Voided" ? "secondary" : "success"}">${value}</span>`,
      },
      {
        data: "id",
        orderable: false,
        searchable: false,
        render: (id: number, _type: unknown, row: typeof rows[number]) =>
          row.effectiveStatus === "Voided"
            ? `<span class="text-body-secondary small" title="${row.voidReason ?? ""}">Voided</span>`
            : `<button class="btn btn-sm btn-outline-danger void-payment" data-id="${id}">Void</button>`,
      },
    ],
  });

  document.getElementById("payments-table")?.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains("void-payment")) return;

    const paymentId = Number(target.dataset.id);
    const payment = rows.find((item) => item.id === paymentId);
    if (!payment) return;

    const reason = window.prompt(
      `Void this payment of ${currency(payment.amount)}?\n\n` +
      "Its rent allocations will be removed and the affected balances will become outstanding again.\n\n" +
      "Enter a reason:",
    );

    if (reason === null) return;

    try {
      await paymentService.voidPayment(paymentId, reason);
      await renderPayments(container);
    } catch (error) {
      window.alert((error as Error).message);
    }
  });
}

export async function renderPaymentEditor(
  container: HTMLElement,
): Promise<void> {
  const params = new URLSearchParams(location.hash.split("?")[1] ?? "");
  const requestedLeaseId = Number(params.get("leaseId") ?? 0);
  const returnTo = params.get("returnTo") ?? "payments";
  const returnPeriod =
    params.get("period") ?? applicationClock.currentPeriod();
  const explicitReturnHash = params.get("returnHash");
  const requestedRentPeriod =
    returnTo === "rent-roll" || returnTo === "rent-status"
      ? returnPeriod
      : "";

  const returnHash =
    explicitReturnHash
      ? decodeURIComponent(explicitReturnHash)
      : returnTo === "rent-roll"
        ? `#/rent-roll?period=${returnPeriod}`
        : returnTo === "rent-status"
          ? "#/rent-status"
          : "#/payments";

  const currentPeriod = applicationClock.currentPeriod();
  const obligationThrough =
    requestedRentPeriod > currentPeriod
      ? requestedRentPeriod
      : currentPeriod;

  await rentLedgerService.ensureObligationsThrough(
    obligationThrough,
  );

  const [leases, units, buildings, locations, participants, tenants] =
    await Promise.all([
      db.leases.toArray(),
      db.units.toArray(),
      db.buildings.toArray(),
      db.locations.toArray(),
      db.leaseParticipants.toArray(),
      db.tenants.toArray(),
    ]);

  const unitMap = new Map(units.map((item) => [item.id, item]));
  const buildingMap = new Map(buildings.map((item) => [item.id, item]));
  const locationMap = new Map(locations.map((item) => [item.id, item]));
  const tenantMap = new Map(tenants.map((item) => [item.id, item]));

  const leaseOptions = leases.map((lease) => {
    const unit = unitMap.get(lease.unitId);
    const building = unit ? buildingMap.get(unit.buildingId) : undefined;
    const location = building ? locationMap.get(building.locationId) : undefined;
    const unitLabel =
      `${building?.civicAddress ?? "?"}` +
      `${unit?.apartmentNumber ? ` ${unit.apartmentNumber}` : ""}` +
      `${location?.name ? ` ${location.name}` : ""}`;

    const leaseholders = participants
      .filter((item) => item.leaseId === lease.id)
      .sort((left, right) => Number(right.primary) - Number(left.primary))
      .map((item) => tenantMap.get(item.tenantId))
      .filter((tenant): tenant is NonNullable<typeof tenant> => Boolean(tenant))
      .map((tenant) => `${tenant.firstName} ${tenant.lastName}`);

    return {
      leaseId: lease.id as number,
      unitLabel: unitLabel.trim(),
      leaseholders,
    };
  });

  const options = leaseOptions
    .map(
      (item) =>
        `<option value="${item.leaseId}" ${
          requestedLeaseId === item.leaseId ? "selected" : ""
        }>${item.unitLabel}</option>`,
    )
    .join("");

  container.innerHTML = `
    <div class="page-heading d-flex justify-content-between align-items-center">
      <div>
        <h1>Record Payment</h1>
        <p class="text-body-secondary mb-0">
          Received date and rent period are separate.
        </p>
      </div>
      <a class="btn btn-outline-secondary" href="${returnHash}">
        ${
          returnTo === "rent-roll"
            ? "Back to Rent Roll"
            : returnTo === "rent-status"
              ? "Back to Rent Status"
              : "Back to Payments"
        }
      </a>
    </div>

    <form id="payment-form">
      <div class="row g-4">
        <div class="col-xl-5">
          <div class="card">
            <div class="card-header fw-semibold">Payment</div>
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label">Unit</label>
                <select id="payment-lease" class="form-select" required>
                  <option value="">Choose a unit...</option>
                  ${options}
                </select>
                <div class="form-text">
                  Payments are recorded against the lease account for the unit.
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Leaseholders</label>
                <div id="payment-leaseholders" class="form-control bg-body-tertiary">
                  Select a unit to view the leaseholders.
                </div>
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Date Received</label>
                  <input id="payment-date" type="date" class="form-control"
                         value="${applicationClock.today()}" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Amount</label>
                  <input id="payment-amount" type="number" min=".01" step=".01"
                         class="form-control" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Method</label>
                  <select id="payment-method" class="form-select">
                    <option>Electronic Transfer</option>
                    <option>Cheque</option>
                    <option>Cash</option>
                    <option>Direct Deposit</option>
                    <option>Other</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Reference</label>
                  <input id="payment-reference" class="form-control">
                </div>
                <div class="col-12">
                  <label class="form-label">Notes</label>
                  <textarea id="payment-notes" class="form-control"></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-7">
          <div class="card">
            <div class="card-header fw-semibold">Allocate to Rent Periods</div>
            <div class="card-body">
              <div id="allocation-list">Select a unit.</div>
              <div class="border-top pt-3 mt-3">
                <div class="d-flex justify-content-between">
                  <span>Payment</span>
                  <strong id="review-payment">${currency(0)}</strong>
                </div>
                <div class="d-flex justify-content-between">
                  <span>Allocated</span>
                  <strong id="review-allocated">${currency(0)}</strong>
                </div>
                <div class="d-flex justify-content-between">
                  <span>Unapplied Credit</span>
                  <strong id="review-unapplied">${currency(0)}</strong>
                </div>
              </div>
              <button class="btn btn-primary w-100 mt-4">Save Payment</button>
            </div>
          </div>
        </div>
      </div>
    </form>
  `;

  const leaseSelect = document.getElementById(
    "payment-lease",
  ) as HTMLSelectElement;
  let allocationEditedByUser = false;

  const updateLeaseContext = (): void => {
    const selectedLeaseId = Number(leaseSelect.value);
    const selected = leaseOptions.find(
      (item) => item.leaseId === selectedLeaseId,
    );
    const leaseholderElement = document.getElementById(
      "payment-leaseholders",
    );

    if (leaseholderElement) {
      leaseholderElement.textContent =
        selected && selected.leaseholders.length > 0
          ? selected.leaseholders.join(", ")
          : "No leaseholders found.";
    }
  };

  leaseSelect.addEventListener("change", () => {
    updateLeaseContext();
    void loadOutstanding();
  });

  document
    .getElementById("payment-amount")
    ?.addEventListener("input", () => {
      autoAllocateRequestedPeriod();
      updateReview();
    });
  document
    .getElementById("payment-form")
    ?.addEventListener("submit", savePayment);

  if (requestedLeaseId) {
    updateLeaseContext();
    await loadOutstanding();
  }

  async function loadOutstanding(): Promise<void> {
    const leaseId = Number(leaseSelect.value);
    const list = document.getElementById("allocation-list");
    if (!list) return;

    const obligations = leaseId
      ? await rentLedgerService.getOutstandingObligations(leaseId)
      : [];

    list.innerHTML = obligations.length
      ? obligations
          .map(
            (obligation) => `
              <div class="row g-2 align-items-center mb-2 allocation-row"
                   data-obligation-id="${obligation.id}">
                <div class="col-4">
                  <strong>${obligation.rentPeriod}</strong>
                </div>
                <div class="col-3 text-end">
                  ${currency(obligation.balance)}
                </div>
                <div class="col-5">
                  <input type="number" min="0" max="${obligation.balance}"
                         step=".01" class="form-control allocation-amount">
                </div>
              </div>
            `,
          )
          .join("")
      : "<div class='alert alert-success'>No unpaid periods.</div>";

    document
      .querySelectorAll<HTMLInputElement>(".allocation-amount")
      .forEach((input) => {
        input.addEventListener("input", () => {
          allocationEditedByUser = true;
          updateReview();
        });
      });

    allocationEditedByUser = false;
    autoAllocateRequestedPeriod();
    updateReview();
  }

  function autoAllocateRequestedPeriod(): void {
    if (!requestedRentPeriod || allocationEditedByUser) {
      return;
    }

    const paymentAmount = Number(
      (document.getElementById("payment-amount") as HTMLInputElement | null)?.value || 0,
    );

    const rows = Array.from(
      document.querySelectorAll<HTMLElement>(".allocation-row"),
    );

    rows.forEach((row) => {
      const period = row.querySelector("strong")?.textContent?.trim() ?? "";
      const input = row.querySelector<HTMLInputElement>(".allocation-amount");
      if (!input) return;

      if (period === requestedRentPeriod) {
        const balance = Number(input.max || 0);
        input.value =
          paymentAmount > 0
            ? String(Math.min(paymentAmount, balance))
            : "";
      } else {
        input.value = "";
      }
    });
  }

  function updateReview(): void {
    const payment = Number(
      (document.getElementById("payment-amount") as HTMLInputElement)?.value || 0,
    );
    const allocated = Array.from(
      document.querySelectorAll<HTMLInputElement>(".allocation-amount"),
    ).reduce((total, input) => total + Number(input.value || 0), 0);

    document.getElementById("review-payment")!.textContent = currency(payment);
    document.getElementById("review-allocated")!.textContent =
      currency(allocated);
    document.getElementById("review-unapplied")!.textContent = currency(
      Math.max(payment - allocated, 0),
    );
  }

  async function savePayment(event: Event): Promise<void> {
    event.preventDefault();

    try {
      const leaseId = Number(leaseSelect.value);
      const allocations = Array.from(
        document.querySelectorAll<HTMLElement>(".allocation-row"),
      )
        .map((row) => ({
          obligationId: Number(row.dataset.obligationId),
          amount: Number(
            (row.querySelector(".allocation-amount") as HTMLInputElement).value ||
              0,
          ),
        }))
        .filter((item) => item.amount > 0);

      if (
        (returnTo === "rent-roll" ||
          returnTo === "rent-status") &&
        allocations.length === 0
      ) {
        throw new Error(
          "Enter an allocation for the selected rent period before saving.",
        );
      }

      await paymentService.save({
        leaseId,
        tenantId: undefined,
        receivedDate: (
          document.getElementById("payment-date") as HTMLInputElement
        ).value,
        amount: Number(
          (document.getElementById("payment-amount") as HTMLInputElement).value,
        ),
        paymentMethod: (
          document.getElementById("payment-method") as HTMLSelectElement
        ).value as PaymentMethod,
        reference: (
          document.getElementById("payment-reference") as HTMLInputElement
        ).value,
        notes: (
          document.getElementById("payment-notes") as HTMLTextAreaElement
        ).value,
        allocations,
      });

      location.hash = returnHash;
    } catch (error) {
      window.alert((error as Error).message);
    }
  }
}
