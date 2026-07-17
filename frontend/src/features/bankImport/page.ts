
import { Modal } from "bootstrap";
import { db } from "../../db/database";
import type { BankTransaction } from "../../models/domain";
import type { ImportPreview } from "../../services/bankImportService";
import { bankImportService } from "../../services/bankImportService";
import { parseQfx } from "../../services/qfxParser";
import { reconciliationService } from "../../services/reconciliationService";
import { rentLedgerService } from "../../services/rentLedgerService";
import { createTable } from "../shared/table";
import { currency } from "../shared/format";

import { applicationClock } from "../../services/applicationClockService";
import { busyOverlay } from "../../services/busyOverlayService";
let currentPreview: ImportPreview | undefined;

type QueueFilter =
  | "needs-attention"
  | "suggested"
  | "ambiguous"
  | "manual-review"
  | "ignored"
  | "reconciled"
  | "all";

interface QueueTransaction extends BankTransaction {
  queueClassification: string;
}

function filterFromHash(): QueueFilter {
  const value = new URLSearchParams(
    location.hash.split("?")[1] ?? "",
  ).get("filter");

  const allowed: QueueFilter[] = [
    "needs-attention",
    "suggested",
    "ambiguous",
    "manual-review",
    "ignored",
    "reconciled",
    "all",
  ];

  return allowed.includes(value as QueueFilter)
    ? (value as QueueFilter)
    : "needs-attention";
}

function badgeClass(value: string): string {
  if (
    value === "Reconciled" ||
    value === "Strong Candidate" ||
    value === "Good Candidate"
  ) {
    return "success";
  }
  if (value === "Possible Match" || value === "Ambiguous") return "warning";
  if (value === "Ignored") return "secondary";
  if (value === "Manual Review") return "dark";
  return "primary";
}

export async function renderBankImport(
  container: HTMLElement,
): Promise<void> {
  const activeFilter = filterFromHash();

  const [batches, rawTransactions] = await Promise.all([
    db.bankImportBatches.orderBy("importedAt").reverse().toArray(),
    db.bankTransactions.orderBy("postedDate").reverse().toArray(),
  ]);

  const batchMap = new Map(batches.map((batch) => [batch.id, batch]));

  const successPayload = sessionStorage.getItem(
    "bank-reconciliation-success",
  );
  if (successPayload) {
    sessionStorage.removeItem("bank-reconciliation-success");
  }

  const transactions: QueueTransaction[] = await Promise.all(
    rawTransactions.map(async (transaction) => {
      if (
        transaction.status === "Reconciled" ||
        transaction.status === "Ignored" ||
        transaction.amount <= 0
      ) {
        return {
          ...transaction,
          queueClassification: transaction.status,
        };
      }

      try {
        const suggestions =
          await reconciliationService.suggestions(
            transaction.id as number,
          );
        return {
          ...transaction,
          queueClassification:
            suggestions[0]?.classification ?? "Manual Review",
        };
      } catch {
        return {
          ...transaction,
          queueClassification: "Manual Review",
        };
      }
    }),
  );

  const counts = {
    suggested: transactions.filter(
      (item) =>
        item.queueClassification === "Strong Candidate" ||
        item.queueClassification === "Good Candidate",
    ).length,
    ambiguous: transactions.filter(
      (item) =>
        item.queueClassification === "Ambiguous" ||
        item.queueClassification === "Possible Match",
    ).length,
    manualReview: transactions.filter(
      (item) =>
        item.queueClassification === "Manual Review" ||
        item.queueClassification === "Unmatched",
    ).length,
    ignored: transactions.filter(
      (item) => item.status === "Ignored",
    ).length,
    reconciled: transactions.filter(
      (item) => item.status === "Reconciled",
    ).length,
    all: transactions.length,
  };

  const needsAttention =
    counts.suggested + counts.ambiguous + counts.manualReview;

  const visibleTransactions = transactions
    .filter((item) => {
      switch (activeFilter) {
        case "suggested":
          return (
            item.queueClassification === "Strong Candidate" ||
            item.queueClassification === "Good Candidate"
          );
        case "ambiguous":
          return (
            item.queueClassification === "Ambiguous" ||
            item.queueClassification === "Possible Match"
          );
        case "manual-review":
          return (
            item.queueClassification === "Manual Review" ||
            item.queueClassification === "Unmatched"
          );
        case "ignored":
          return item.status === "Ignored";
        case "reconciled":
          return item.status === "Reconciled";
        case "all":
          return true;
        default:
          return (
            item.status !== "Reconciled" &&
            item.status !== "Ignored" &&
            item.amount > 0
          );
      }
    })
    .sort((left, right) => {
      const rank = (item: QueueTransaction): number => {
        if (item.queueClassification === "Strong Candidate") return 1;
        if (item.queueClassification === "Good Candidate") return 2;
        if (item.queueClassification === "Ambiguous") return 3;
        if (item.queueClassification === "Possible Match") return 4;
        if (
          item.queueClassification === "Manual Review" ||
          item.queueClassification === "Unmatched"
        ) {
          return 5;
        }
        if (item.status === "Ignored") return 6;
        if (item.status === "Reconciled") return 7;
        return 8;
      };

      return (
        rank(left) - rank(right) ||
        left.postedDate.localeCompare(right.postedDate)
      );
    });

  const batchProgress = batches.map((batch) => {
    const batchTransactions = transactions.filter(
      (transaction) => transaction.importBatchId === batch.id,
    );
    const reconciled = batchTransactions.filter(
      (transaction) => transaction.status === "Reconciled",
    ).length;
    const ignored = batchTransactions.filter(
      (transaction) => transaction.status === "Ignored",
    ).length;
    const remaining = batchTransactions.filter(
      (transaction) =>
        transaction.amount > 0 &&
        transaction.status !== "Reconciled" &&
        transaction.status !== "Ignored",
    ).length;

    const actioned = reconciled + ignored;

    return {
      ...batch,
      reconciled,
      ignored,
      remaining,
      completionStatus:
        remaining === 0
          ? "Complete"
          : actioned === 0
            ? "Imported"
            : "In Progress",
    };
  });

  container.innerHTML = `
    ${
      successPayload
        ? `<div class="toast-container position-fixed top-0 end-0 p-3 bank-import-toast-container">
            <div class="toast show text-bg-success border-0" role="status" aria-live="polite" aria-atomic="true">
              <div class="d-flex">
                <div class="toast-body">
                  <strong>Payment reconciled.</strong>
                  The queue has been refreshed and your table state preserved.
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
              </div>
            </div>
          </div>`
        : ""
    }

    <div class="page-heading">
      <h1>Import Bank Statement</h1>
      <p class="text-body-secondary mb-0">
        Import statements and work only the transactions that still need attention.
      </p>
    </div>

    <div class="row g-3 mb-4">
      ${summaryCard("Needs Attention", needsAttention, "primary")}
      ${summaryCard("Suggested", counts.suggested, "success")}
      ${summaryCard("Ambiguous", counts.ambiguous, "warning")}
      ${summaryCard("Manual Review", counts.manualReview, "dark")}
    </div>

    <div class="card mb-4">
      <div class="card-header fw-semibold">QFX Import</div>
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-lg-8">
            <label class="form-label">QFX statement</label>
            <input id="qfx-file" type="file"
                   accept=".qfx,.ofx"
                   class="form-control">
          </div>
          <div class="col-lg-4">
            <button id="preview-qfx"
                    class="btn btn-primary w-100">
              Preview Statement
            </button>
          </div>
        </div>
        <div id="import-preview" class="mt-4"></div>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-header fw-semibold d-flex justify-content-between align-items-center">
        <span>Reconciliation Queue</span>
        <span class="small text-body-secondary">
          ${visibleTransactions.length} displayed
        </span>
      </div>
      <div class="card-body">
        <div class="btn-group flex-wrap mb-3" role="group" aria-label="Transaction filters">
          ${filterButton(
            "needs-attention",
            "Needs Attention",
            needsAttention,
            activeFilter,
          )}
          ${filterButton(
            "suggested",
            "Suggested",
            counts.suggested,
            activeFilter,
          )}
          ${filterButton(
            "ambiguous",
            "Ambiguous",
            counts.ambiguous,
            activeFilter,
          )}
          ${filterButton(
            "manual-review",
            "Manual Review",
            counts.manualReview,
            activeFilter,
          )}
          ${filterButton(
            "ignored",
            "Ignored",
            counts.ignored,
            activeFilter,
          )}
          ${filterButton(
            "reconciled",
            "Reconciled",
            counts.reconciled,
            activeFilter,
          )}
          ${filterButton(
            "all",
            "All",
            counts.all,
            activeFilter,
          )}
        </div>

        <table id="bank-transactions-table"
               class="table table-hover align-middle w-100">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Reference</th>
              <th>Batch</th>
              <th>Classification</th>
              <th>Action</th>
            </tr>
          </thead>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header fw-semibold">Import History</div>
      <div class="card-body">
        <table id="import-history-table"
               class="table table-sm align-middle w-100">
          <thead>
            <tr>
              <th>Imported Date</th>
              <th>Statement</th>
              <th>Status</th>
              <th>Remaining</th>
              <th>Reconciled</th>
              <th>Ignored</th>
              <th>Period</th>
              <th>Account</th>
              <th>Transactions</th>
            </tr>
          </thead>
        </table>
      </div>
    </div>


    <div class="modal fade" id="reconciliation-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <div>
              <h2 class="modal-title fs-5">Reconcile Bank Transaction</h2>
              <div class="small text-body-secondary">Confirm the unit and rent-period allocation without leaving the import queue.</div>
            </div>
            <button type="button" class="btn-close reconciliation-modal-control" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="reconciliation-modal-body">
            <div class="text-center py-5">
              <div class="spinner-border" role="status"><span class="visually-hidden">Loading…</span></div>
            </div>
          </div>
          <div class="modal-footer">
            <div id="reconciliation-modal-status" class="me-auto small text-body-secondary"></div>
            <button type="button" class="btn btn-outline-secondary reconciliation-modal-control" data-bs-dismiss="modal">Cancel</button>
            <button type="button" id="modal-ignore-transaction" class="btn btn-outline-secondary reconciliation-modal-control">Ignore Transaction</button>
            <button type="button" id="modal-confirm-reconciliation" class="btn btn-primary reconciliation-modal-control">Confirm Reconciliation</button>
          </div>
        </div>
      </div>
    </div>
  `;

  createTable("#bank-transactions-table", {
    data: visibleTransactions,
    columns: [
      { data: "postedDate" },
      {
        data: "name",
        render: (
          value: string,
          _type: unknown,
          row: QueueTransaction,
        ) =>
          `${value || "Bank transaction"}${
            row.memo
              ? `<div class="small text-body-secondary">${row.memo}</div>`
              : ""
          }`,
      },
      {
        data: "amount",
        render: (value: number) => currency(value),
      },
      { data: "externalId" },
      {
        data: "importBatchId",
        render: (value: number) =>
          batchMap.get(value)?.filename ?? "Unknown",
      },
      {
        data: "queueClassification",
        render: (value: string) =>
          `<span class="badge text-bg-${badgeClass(value)}">${value}</span>`,
      },
      {
        data: "id",
        orderable: false,
        searchable: false,
        render: (
          id: number,
          _type: unknown,
          row: QueueTransaction,
        ) => {
          if (row.status === "Reconciled") {
            return '<a class="btn btn-sm btn-outline-secondary" href="#/payments">View Payment</a>';
          }

          if (row.status === "Ignored") {
            return '<span class="text-body-secondary small">Ignored</span>';
          }

          if (row.amount <= 0) {
            return '<span class="text-body-secondary small">Debit</span>';
          }

          return `
            <button class="btn btn-sm btn-outline-primary open-reconciliation-modal"
                    data-id="${id}">
              Reconcile
            </button>
            <button class="btn btn-sm btn-outline-secondary ignore-bank-transaction"
                    data-id="${id}">
              Ignore
            </button>
          `;
        },
      },
    ],
  });

  createTable("#import-history-table", {
    data: batchProgress,
    pageLength: 5,
    lengthMenu: [
      [5, 10, 25, 50],
      [5, 10, 25, 50],
    ],
    order: [[0, "desc"]],
    columns: [
      {
        data: "importedAt",
        render: (value: string) =>
          value.slice(0, 19).replace("T", " "),
      },
      { data: "filename" },
      {
        data: "completionStatus",
        render: (value: string) => {
          const color =
            value === "Complete"
              ? "success"
              : value === "In Progress"
                ? "warning"
                : "secondary";

          return `<span class="badge text-bg-${color}">${value}</span>`;
        },
      },
      { data: "remaining" },
      { data: "reconciled" },
      { data: "ignored" },
      {
        data: null,
        render: (
          _value: unknown,
          _type: unknown,
          row: typeof batchProgress[number],
        ) =>
          `${row.statementStart || "?"} to ${
            row.statementEnd || "?"
          }`,
      },
      {
        data: "accountLastFour",
        render: (value: string) =>
          value ? `…${value}` : "Unknown",
      },
      { data: "newTransactionCount" },
    ],
  });

  document
    .getElementById("preview-qfx")
    ?.addEventListener("click", async () => {
      const input = document.getElementById(
        "qfx-file",
      ) as HTMLInputElement;
      const file = input.files?.[0];

      if (!file) {
        window.alert("Choose a QFX file.");
        return;
      }

      try {
        const statement = parseQfx(await file.text());
        currentPreview = await bankImportService.preview(
          file.name,
          statement,
        );
        renderPreview();
      } catch (error) {
        window.alert((error as Error).message);
      }
    });

  document
    .getElementById("bank-transactions-table")
    ?.addEventListener("click", async (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        "button[data-id]",
      );
      if (!target) return;

      const id = Number(target.dataset.id);

      if (target.classList.contains("open-reconciliation-modal")) {
        await openReconciliationModal(container, id);
        return;
      }

      if (!target.classList.contains("ignore-bank-transaction")) return;

      const reason = window.prompt(
        "Reason this transaction is not rent:",
      );
      if (reason === null) return;

      try {
        await bankImportService.ignore(id, reason);
        await renderBankImport(container);
      } catch (error) {
        window.alert((error as Error).message);
      }
    });

  function renderPreview(): void {
    const previewElement =
      document.getElementById("import-preview");

    if (!previewElement || !currentPreview) return;

    previewElement.innerHTML = `
      <div class="alert alert-light border">
        <div class="row g-3">
          <div class="col-md-3">
            <strong>Account</strong><br>
            …${currentPreview.statement.accountLastFour || "Unknown"}
          </div>
          <div class="col-md-3">
            <strong>Period</strong><br>
            ${currentPreview.statement.statementStart}
            to
            ${currentPreview.statement.statementEnd}
          </div>
          <div class="col-md-2">
            <strong>New</strong><br>
            ${currentPreview.newCount}
          </div>
          <div class="col-md-2">
            <strong>Duplicates</strong><br>
            ${currentPreview.duplicateCount}
          </div>
          <div class="col-md-2">
            <strong>Credits</strong><br>
            ${currency(currentPreview.totalCredits)}
          </div>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>FITID</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            ${currentPreview.rows
              .map(
                (row) => `
                  <tr>
                    <td>${row.postedDate}</td>
                    <td>${row.name || row.memo}</td>
                    <td>${currency(row.amount)}</td>
                    <td>${row.externalId}</td>
                    <td>
                      <span class="badge text-bg-${
                        row.result === "New"
                          ? "success"
                          : "secondary"
                      }">${row.result}</span>
                    </td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <button id="commit-import"
              class="btn btn-success"
              ${currentPreview.newCount === 0 ? "disabled" : ""}>
        Import ${currentPreview.newCount} New Transactions
      </button>
    `;

    document
      .getElementById("commit-import")
      ?.addEventListener("click", async () => {
        if (!currentPreview) return;

        try {
          await bankImportService.commit(currentPreview);
          currentPreview = undefined;
          await renderBankImport(container);
        } catch (error) {
          window.alert((error as Error).message);
        }
      });
  }
}


async function openReconciliationModal(
  container: HTMLElement,
  transactionId: number,
): Promise<void> {
  const modalElement = document.getElementById("reconciliation-modal");
  const modalBody = document.getElementById("reconciliation-modal-body");
  const statusElement = document.getElementById("reconciliation-modal-status");
  const confirmButton = document.getElementById(
    "modal-confirm-reconciliation",
  ) as HTMLButtonElement | null;
  const ignoreButton = document.getElementById(
    "modal-ignore-transaction",
  ) as HTMLButtonElement | null;

  if (!modalElement || !modalBody || !confirmButton || !ignoreButton) return;

  let submitting = false;
  const modal = Modal.getOrCreateInstance(modalElement, {
    backdrop: true,
    keyboard: true,
    focus: true,
  });

  const closeControls = Array.from(
    modalElement.querySelectorAll<HTMLButtonElement>("[data-bs-dismiss='modal']"),
  );

  const hideModal = (): void => {
    if (submitting) return;
    modal.hide();
  };

  const hideModalAndWait = async (): Promise<void> => {
    if (!modalElement.classList.contains("show")) return;
    await new Promise<void>((resolve) => {
      modalElement.addEventListener("hidden.bs.modal", () => resolve(), {
        once: true,
      });
      modal.hide();
    });
  };

  closeControls.forEach((control) => {
    control.onclick = hideModal;
  });

  const handleHide = (event: Event): void => {
    if (submitting) event.preventDefault();
  };

  const handleHidden = (): void => {
    closeControls.forEach((control) => {
      control.onclick = null;
      control.disabled = false;
    });
    confirmButton.onclick = null;
    ignoreButton.onclick = null;
    confirmButton.disabled = false;
    ignoreButton.disabled = false;
    confirmButton.textContent = "Confirm Reconciliation";
    ignoreButton.textContent = "Ignore Transaction";
    if (statusElement) statusElement.textContent = "";
    modalBody.innerHTML = "";
    document.body.classList.remove("modal-open");
    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => backdrop.remove());
    modalElement.removeEventListener("hide.bs.modal", handleHide);
    modalElement.removeEventListener("hidden.bs.modal", handleHidden);
  };

  modalElement.addEventListener("hide.bs.modal", handleHide);
  modalElement.addEventListener("hidden.bs.modal", handleHidden);
  modal.show();
  modalBody.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border" role="status"><span class="visually-hidden">Loading…</span></div>
      <div class="mt-2 text-body-secondary">Loading reconciliation details…</div>
    </div>`;
  if (statusElement) statusElement.textContent = "";

  const [transaction, suggestions] = await Promise.all([
    db.bankTransactions.get(transactionId),
    reconciliationService.suggestions(transactionId),
  ]);

  if (!transaction) {
    modalBody.innerHTML = '<div class="alert alert-danger">Transaction not found.</div>';
    confirmButton.disabled = true;
    ignoreButton.disabled = true;
    return;
  }

  const bankTransaction = transaction;
  let selectedLeaseId = suggestions[0]?.leaseId ?? 0;

  modalBody.innerHTML = `
    <div id="reconciliation-modal-message" class="d-none" role="alert"></div>
    <div class="row g-4">
      <div class="col-lg-6">
        <div class="card mb-3">
          <div class="card-header fw-semibold">Bank Transaction</div>
          <div class="card-body">
            <dl class="row mb-0">
              <dt class="col-5">Transaction Date</dt><dd class="col-7">${bankTransaction.postedDate}</dd>
              <dt class="col-5">Amount</dt><dd class="col-7 fs-4">${currency(bankTransaction.amount)}</dd>
              <dt class="col-5">Description</dt><dd class="col-7">${bankTransaction.name || "—"}</dd>
              <dt class="col-5">Memo</dt><dd class="col-7">${bankTransaction.memo || "—"}</dd>
              <dt class="col-5">Reference</dt><dd class="col-7 text-break">${bankTransaction.externalId}</dd>
            </dl>
          </div>
        </div>

        <div class="card">
          <div class="card-header fw-semibold">Allocation</div>
          <div class="card-body">
            <div id="modal-reconcile-allocation-list">Select a suggested unit.</div>
            <div class="border-top mt-3 pt-3 d-flex justify-content-between">
              <span>Unapplied credit</span>
              <strong id="modal-reconcile-unapplied">${currency(bankTransaction.amount)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card">
          <div class="card-header fw-semibold d-flex justify-content-between gap-3">
            <span>Suggested Units</span>
            <span class="small text-body-secondary">Outstanding as of ${applicationClock.today()}</span>
          </div>
          <div class="card-body">
            <div class="list-group" id="modal-suggestion-list">
              ${suggestions.map((suggestion, index) => `
                <button type="button"
                        class="list-group-item list-group-item-action modal-suggestion-item reconciliation-modal-control ${index === 0 ? "active" : ""}"
                        data-lease-id="${suggestion.leaseId}">
                  <div class="d-flex justify-content-between gap-3">
                    <strong>${suggestion.unitLabel}</strong>
                    <span class="badge text-bg-${badgeClass(suggestion.classification)}">${suggestion.classification}</span>
                  </div>
                  <div class="small mt-1">
                    Score ${suggestion.score} · Outstanding ${currency(suggestion.amountDue)}
                    · Oldest ${suggestion.oldestPeriod} · Target ${suggestion.targetPeriod}
                  </div>
                  <ul class="small mb-0 mt-2 text-start">
                    ${suggestion.reasons.map((reason) => `<li>${reason}</li>`).join("")}
                  </ul>
                </button>`).join("") || '<div class="alert alert-warning mb-0">No outstanding leases found.</div>'}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  confirmButton.disabled = suggestions.length === 0;
  ignoreButton.disabled = false;

  document
    .querySelectorAll<HTMLElement>(".modal-suggestion-item")
    .forEach((item) => {
      item.addEventListener("click", async () => {
        if (submitting) return;
        document
          .querySelectorAll(".modal-suggestion-item")
          .forEach((row) => row.classList.remove("active"));
        item.classList.add("active");
        selectedLeaseId = Number(item.dataset.leaseId);
        await loadAllocations();
      });
    });

  confirmButton.onclick = async () => {
    if (submitting) return;

    const allocations = Array.from(
      document.querySelectorAll<HTMLElement>(".modal-reconcile-allocation-row"),
    ).map((row) => ({
      obligationId: Number(row.dataset.obligationId),
      amount: Number(
        (row.querySelector(".modal-reconcile-allocation-amount") as HTMLInputElement).value || 0,
      ),
    })).filter((item) => item.amount > 0);

    if (!selectedLeaseId) {
      showMessage("danger", "Select a suggested unit before reconciling.");
      return;
    }
    if (allocations.length === 0) {
      showMessage("danger", "Allocate at least part of the transaction before reconciling.");
      return;
    }

    submitting = true;
    setControlsDisabled(true);
    confirmButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Reconciling…';
    if (statusElement) statusElement.textContent = "Creating payment and updating the rent ledger…";

    try {
      await reconciliationService.reconcile(transactionId, selectedLeaseId, allocations);
      sessionStorage.setItem("bank-reconciliation-success", JSON.stringify({
        amount: bankTransaction.amount,
        reference: bankTransaction.externalId,
      }));
      submitting = false;
      await hideModalAndWait();
      await renderBankImport(container);
    } catch (error) {
      submitting = false;
      setControlsDisabled(false);
      confirmButton.textContent = "Confirm Reconciliation";
      if (statusElement) statusElement.textContent = "";
      showMessage("danger", (error as Error).message || "The transaction could not be reconciled.");
    }
  };

  ignoreButton.onclick = async () => {
    if (submitting) return;
    const reason = window.prompt("Reason this transaction is not rent:");
    if (reason === null) return;

    submitting = true;
    setControlsDisabled(true);
    ignoreButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Ignoring…';
    if (statusElement) statusElement.textContent = "Updating the reconciliation queue…";

    try {
      await bankImportService.ignore(transactionId, reason);
      submitting = false;
      await hideModalAndWait();
      await renderBankImport(container);
    } catch (error) {
      submitting = false;
      setControlsDisabled(false);
      ignoreButton.textContent = "Ignore Transaction";
      if (statusElement) statusElement.textContent = "";
      showMessage("danger", (error as Error).message || "The transaction could not be ignored.");
    }
  };

  if (selectedLeaseId) await loadAllocations();

  async function loadAllocations(): Promise<void> {
    const obligations = await rentLedgerService.getOutstandingObligations(
      selectedLeaseId,
      applicationClock.currentPeriod(),
    );
    let remaining = bankTransaction.amount;
    const element = document.getElementById("modal-reconcile-allocation-list");
    if (!element) return;

    element.innerHTML = obligations.map((obligation) => {
      const suggested = Math.min(remaining, obligation.balance);
      remaining -= suggested;
      return `
        <div class="row g-2 align-items-center mb-2 modal-reconcile-allocation-row"
             data-obligation-id="${obligation.id}">
          <div class="col-4"><strong>${obligation.rentPeriod}</strong></div>
          <div class="col-3 text-end">Due ${currency(obligation.balance)}</div>
          <div class="col-5">
            <input class="form-control modal-reconcile-allocation-amount reconciliation-modal-control"
                   type="number" min="0" max="${obligation.balance}" step=".01"
                   value="${suggested > 0 ? suggested : ""}">
          </div>
        </div>`;
    }).join("") || '<div class="alert alert-success">No outstanding rent.</div>';

    document
      .querySelectorAll<HTMLInputElement>(".modal-reconcile-allocation-amount")
      .forEach((input) => input.addEventListener("input", updateUnapplied));
    updateUnapplied();
  }

  function updateUnapplied(): void {
    const allocated = Array.from(
      document.querySelectorAll<HTMLInputElement>(".modal-reconcile-allocation-amount"),
    ).reduce((total, input) => total + Number(input.value || 0), 0);
    const element = document.getElementById("modal-reconcile-unapplied");
    if (element) element.textContent = currency(Math.max(bankTransaction.amount - allocated, 0));
  }

  function setControlsDisabled(disabled: boolean): void {
    document
      .querySelectorAll<HTMLButtonElement | HTMLInputElement>(".reconciliation-modal-control")
      .forEach((control) => { control.disabled = disabled; });
    confirmButton!.disabled = disabled;
    ignoreButton!.disabled = disabled;
  }

  function showMessage(tone: "success" | "danger" | "warning", message: string): void {
    const element = document.getElementById("reconciliation-modal-message");
    if (!element) return;
    element.className = `alert alert-${tone}`;
    element.textContent = message;
  }
}

function summaryCard(
  label: string,
  value: number,
  color: string,
): string {
  return `
    <div class="col-sm-6 col-xl-3">
      <div class="card h-100">
        <div class="card-body">
          <div class="small text-uppercase text-body-secondary fw-semibold">
            ${label}
          </div>
          <div class="metric-value text-${color}">
            ${value}
          </div>
        </div>
      </div>
    </div>
  `;
}

function filterButton(
  filter: QueueFilter,
  label: string,
  count: number,
  activeFilter: QueueFilter,
): string {
  const active = filter === activeFilter;
  return `
    <a href="#/bank-import?filter=${filter}"
       class="btn btn-${
         active ? "primary" : "outline-secondary"
       }">
      ${label}
      <span class="badge text-bg-light ms-1">${count}</span>
    </a>
  `;
}


export async function renderReconciliation(
  container: HTMLElement,
  transactionId: number,
): Promise<void> {
  const transaction = await db.bankTransactions.get(transactionId);
  if (!transaction) {
    container.innerHTML =
      '<div class="alert alert-danger">Transaction not found.</div>';
    return;
  }

  const bankTransaction = transaction;
  const suggestions = await reconciliationService.suggestions(transactionId);
  const outstandingAsOf = applicationClock.today();

  container.innerHTML = `
    <div class="page-heading d-flex justify-content-between align-items-center">
      <div>
        <h1>Reconcile Bank Transaction</h1>
        <p class="text-body-secondary mb-0">
          Confirm the unit and rent-period allocation.
        </p>
      </div>
      <a class="btn btn-outline-secondary reconciliation-control"
         href="#/bank-import">
        Back to Import
      </a>
    </div>

    <div id="reconciliation-message" class="d-none" role="alert"></div>

    <div class="row g-4">
      <div class="col-lg-5">
        <div class="card sticky-lg-top reconciliation-transaction-card">
          <div class="card-header fw-semibold">Bank Transaction</div>
          <div class="card-body">
            <dl class="row mb-0">
              <dt class="col-5">Transaction Date</dt>
              <dd class="col-7">${bankTransaction.postedDate}</dd>

              <dt class="col-5">Amount</dt>
              <dd class="col-7 fs-4">${currency(bankTransaction.amount)}</dd>

              <dt class="col-5">Description</dt>
              <dd class="col-7">${bankTransaction.name || "—"}</dd>

              <dt class="col-5">Memo</dt>
              <dd class="col-7">${bankTransaction.memo || "—"}</dd>

              <dt class="col-5">Reference</dt>
              <dd class="col-7 text-break">
                ${bankTransaction.externalId}
              </dd>
            </dl>

            <div class="border-top mt-3 pt-3 d-grid gap-2">
              <button id="confirm-reconciliation"
                      class="btn btn-primary reconciliation-control"
                      ${suggestions.length === 0 ? "disabled" : ""}>
                <span class="reconcile-button-label">
                  Confirm Reconciliation
                </span>
              </button>

              <button id="ignore-reconciliation-transaction"
                      class="btn btn-outline-secondary reconciliation-control">
                Ignore Transaction
              </button>

              <div class="small text-body-secondary">
                The selected unit and allocations shown on the right will be
                used when you confirm.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-7">
        <div class="card mb-4">
          <div class="card-header fw-semibold d-flex justify-content-between">
            <span>Suggested Units</span>
            <span class="small text-body-secondary">
              Outstanding as of ${outstandingAsOf}
            </span>
          </div>
          <div class="card-body">
            <div class="list-group" id="suggestion-list">
              ${
                suggestions
                  .map(
                    (suggestion, index) => `
                    <button type="button"
                            class="list-group-item list-group-item-action
                                   suggestion-item reconciliation-control
                                   ${index === 0 ? "active" : ""}"
                            data-lease-id="${suggestion.leaseId}">
                      <div class="d-flex justify-content-between gap-3">
                        <strong>${suggestion.unitLabel}</strong>
                        <span class="badge text-bg-${
                          suggestion.classification === "Strong Candidate"
                            ? "success"
                            : suggestion.classification === "Good Candidate"
                              ? "primary"
                              : suggestion.classification ===
                                    "Possible Match" ||
                                  suggestion.classification === "Ambiguous"
                                ? "warning"
                                : "secondary"
                        }">${suggestion.classification}</span>
                      </div>
                      <div class="small mt-1">
                        Score ${suggestion.score}
                        · Outstanding ${currency(suggestion.amountDue)}
                        · Oldest ${suggestion.oldestPeriod}
                        · Target ${suggestion.targetPeriod}
                      </div>
                      <ul class="small mb-0 mt-2 text-start">
                        ${suggestion.reasons
                          .map((reason) => `<li>${reason}</li>`)
                          .join("")}
                      </ul>
                    </button>
                  `,
                  )
                  .join("") ||
                '<div class="alert alert-warning mb-0">No outstanding leases found.</div>'
              }
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header fw-semibold">Allocate</div>
          <div class="card-body">
            <div id="reconcile-allocation-list">Select a unit.</div>
            <div class="border-top mt-3 pt-3 d-flex justify-content-between">
              <span>Unapplied credit</span>
              <strong id="reconcile-unapplied">
                ${currency(bankTransaction.amount)}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  let selectedLeaseId = suggestions[0]?.leaseId ?? 0;
  let submitting = false;

  document
    .querySelectorAll<HTMLElement>(".suggestion-item")
    .forEach((item) => {
      item.addEventListener("click", async () => {
        if (submitting) return;

        document
          .querySelectorAll(".suggestion-item")
          .forEach((row) => row.classList.remove("active"));

        item.classList.add("active");
        selectedLeaseId = Number(item.dataset.leaseId);
        await loadAllocations();
      });
    });

  document
    .getElementById("confirm-reconciliation")
    ?.addEventListener("click", async () => {
      if (submitting) return;

      const allocations = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".reconcile-allocation-row",
        ),
      )
        .map((row) => ({
          obligationId: Number(row.dataset.obligationId),
          amount: Number(
            (
              row.querySelector(
                ".reconcile-allocation-amount",
              ) as HTMLInputElement
            ).value || 0,
          ),
        }))
        .filter((item) => item.amount > 0);

      if (!selectedLeaseId) {
        showMessage("danger", "Select a suggested unit before reconciling.");
        return;
      }

      if (allocations.length === 0) {
        showMessage(
          "danger",
          "Allocate at least part of the transaction before reconciling.",
        );
        return;
      }

      submitting = true;
      setControlsDisabled(true);
      busyOverlay.show(
        "Reconciling payment…",
        "Creating the payment and updating the rent ledger.",
      );

      try {
        await reconciliationService.reconcile(
          transactionId,
          selectedLeaseId,
          allocations,
        );

        busyOverlay.update(
          "Payment reconciled",
          "Loading the next transaction that needs attention.",
        );

        sessionStorage.setItem(
          "bank-reconciliation-success",
          JSON.stringify({
            amount: bankTransaction.amount,
            reference: bankTransaction.externalId,
          }),
        );

        busyOverlay.forceHide();
        window.location.hash =
          "/bank-import?filter=needs-attention";
      } catch (error) {
        submitting = false;
        setControlsDisabled(false);
        busyOverlay.forceHide();
        showMessage(
          "danger",
          (error as Error).message ||
            "The transaction could not be reconciled.",
        );
      }
    });

  document
    .getElementById("ignore-reconciliation-transaction")
    ?.addEventListener("click", async () => {
      if (submitting) return;

      const reason = window.prompt(
        "Reason this transaction is not rent:",
      );
      if (reason === null) return;

      submitting = true;
      setControlsDisabled(true);
      busyOverlay.show(
        "Ignoring transaction…",
        "Updating the reconciliation queue.",
      );

      try {
        await bankImportService.ignore(transactionId, reason);
        busyOverlay.forceHide();
        window.location.hash =
          "/bank-import?filter=needs-attention";
      } catch (error) {
        submitting = false;
        setControlsDisabled(false);
        busyOverlay.forceHide();
        showMessage(
          "danger",
          (error as Error).message ||
            "The transaction could not be ignored.",
        );
      }
    });

  if (selectedLeaseId) await loadAllocations();

  async function loadAllocations(): Promise<void> {
    const currentPeriod = applicationClock.currentPeriod();
    const obligations =
      await rentLedgerService.getOutstandingObligations(
        selectedLeaseId,
        currentPeriod,
      );

    let remaining = bankTransaction.amount;
    const element = document.getElementById(
      "reconcile-allocation-list",
    );
    if (!element) return;

    element.innerHTML =
      obligations
        .map((obligation) => {
          const suggested = Math.min(remaining, obligation.balance);
          remaining -= suggested;

          return `
            <div class="row g-2 align-items-center mb-2
                        reconcile-allocation-row"
                 data-obligation-id="${obligation.id}">
              <div class="col-4">
                <strong>${obligation.rentPeriod}</strong>
              </div>
              <div class="col-3 text-end">
                Due ${currency(obligation.balance)}
              </div>
              <div class="col-5">
                <input class="form-control reconcile-allocation-amount
                              reconciliation-control"
                       type="number"
                       min="0"
                       max="${obligation.balance}"
                       step=".01"
                       value="${suggested > 0 ? suggested : ""}">
              </div>
            </div>
          `;
        })
        .join("") ||
      '<div class="alert alert-success">No outstanding rent.</div>';

    document
      .querySelectorAll<HTMLInputElement>(
        ".reconcile-allocation-amount",
      )
      .forEach((input) =>
        input.addEventListener("input", updateUnapplied),
      );

    updateUnapplied();
  }

  function updateUnapplied(): void {
    const allocated = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        ".reconcile-allocation-amount",
      ),
    ).reduce(
      (total, input) => total + Number(input.value || 0),
      0,
    );

    const element = document.getElementById(
      "reconcile-unapplied",
    );
    if (element) {
      element.textContent = currency(
        Math.max(bankTransaction.amount - allocated, 0),
      );
    }
  }

  function setControlsDisabled(disabled: boolean): void {
    document
      .querySelectorAll<
        HTMLButtonElement | HTMLInputElement
      >(".reconciliation-control")
      .forEach((control) => {
        control.disabled = disabled;
      });

    document
      .querySelectorAll<HTMLAnchorElement>(
        "a.reconciliation-control",
      )
      .forEach((link) => {
        link.classList.toggle("disabled", disabled);
        link.setAttribute(
          "aria-disabled",
          disabled ? "true" : "false",
        );
        link.tabIndex = disabled ? -1 : 0;
      });
  }

  function showMessage(
    tone: "success" | "danger" | "warning",
    message: string,
  ): void {
    const element = document.getElementById(
      "reconciliation-message",
    );
    if (!element) return;

    element.className = `alert alert-${tone}`;
    element.textContent = message;
  }

}
