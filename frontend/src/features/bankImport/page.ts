
import { db } from "../../db/database";
import type { ImportPreview } from "../../services/bankImportService";
import { bankImportService } from "../../services/bankImportService";
import { parseQfx } from "../../services/qfxParser";
import { reconciliationService } from "../../services/reconciliationService";
import { rentLedgerService } from "../../services/rentLedgerService";
import { createTable } from "../shared/table";
import { currency } from "../shared/format";

let currentPreview: ImportPreview | undefined;

export async function renderBankImport(container: HTMLElement): Promise<void> {
  const [batches, transactions] = await Promise.all([
    db.bankImportBatches.orderBy("importedAt").reverse().toArray(),
    db.bankTransactions.orderBy("postedDate").reverse().toArray(),
  ]);

  const batchMap = new Map(batches.map((batch) => [batch.id, batch]));

  container.innerHTML = `
    <div class="page-heading">
      <h1>Import Bank Statement</h1>
      <p class="text-body-secondary mb-0">
        Import QFX transactions, detect duplicates, and reconcile deposits to rent.
      </p>
    </div>

    <div class="card mb-4">
      <div class="card-header fw-semibold">QFX Import</div>
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-lg-8">
            <label class="form-label">QFX statement</label>
            <input id="qfx-file" type="file" accept=".qfx,.ofx" class="form-control">
          </div>
          <div class="col-lg-4">
            <button id="preview-qfx" class="btn btn-primary w-100">
              Preview Statement
            </button>
          </div>
        </div>
        <div id="import-preview" class="mt-4"></div>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-header fw-semibold">Imported Transactions</div>
      <div class="card-body">
        <table id="bank-transactions-table" class="table table-hover align-middle w-100">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Reference</th>
              <th>Batch</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header fw-semibold">Import History</div>
      <div class="card-body">
        <table id="import-history-table" class="table table-sm w-100">
          <thead>
            <tr>
              <th>Imported</th>
              <th>File</th>
              <th>Period</th>
              <th>Account</th>
              <th>Transactions</th>
              <th>New</th>
              <th>Duplicates</th>
            </tr>
          </thead>
        </table>
      </div>
    </div>
  `;

  createTable("#bank-transactions-table", {
    data: transactions,
    columns: [
      { data: "postedDate" },
      {
        data: "name",
        render: (value: string, _type: unknown, row: typeof transactions[number]) =>
          `${value || "Bank transaction"}${row.memo ? `<div class="small text-body-secondary">${row.memo}</div>` : ""}`,
      },
      { data: "amount", render: (value: number) => currency(value) },
      { data: "externalId" },
      {
        data: "importBatchId",
        render: (value: number) => batchMap.get(value)?.filename ?? "Unknown",
      },
      {
        data: "status",
        render: (value: string) =>
          `<span class="badge text-bg-${
            value === "Reconciled"
              ? "success"
              : value === "Ignored"
                ? "secondary"
                : "warning"
          }">${value}</span>`,
      },
      {
        data: "id",
        orderable: false,
        searchable: false,
        render: (id: number, _type: unknown, row: typeof transactions[number]) => {
          if (row.status === "Reconciled") {
            return '<span class="text-body-secondary small">Complete</span>';
          }
          if (row.status === "Ignored") {
            return '<span class="text-body-secondary small">Ignored</span>';
          }
          if (row.amount <= 0) {
            return '<span class="text-body-secondary small">Debit</span>';
          }
          return `
            <a class="btn btn-sm btn-outline-primary" href="#/bank-import/reconcile/${id}">
              Reconcile
            </a>
            <button class="btn btn-sm btn-outline-secondary ignore-bank-transaction" data-id="${id}">
              Ignore
            </button>
          `;
        },
      },
    ],
  });

  createTable("#import-history-table", {
    data: batches,
    columns: [
      { data: "importedAt", render: (value: string) => value.slice(0, 19).replace("T", " ") },
      { data: "filename" },
      {
        data: null,
        render: (_value: unknown, _type: unknown, row: typeof batches[number]) =>
          `${row.statementStart || "?"} to ${row.statementEnd || "?"}`,
      },
      { data: "accountLastFour", render: (value: string) => value ? `…${value}` : "Unknown" },
      { data: "transactionCount" },
      { data: "newTransactionCount" },
      { data: "duplicateCount" },
    ],
  });

  document.getElementById("preview-qfx")?.addEventListener("click", async () => {
    const input = document.getElementById("qfx-file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      window.alert("Choose a QFX file.");
      return;
    }

    try {
      const statement = parseQfx(await file.text());
      currentPreview = await bankImportService.preview(file.name, statement);
      renderPreview();
    } catch (error) {
      window.alert((error as Error).message);
    }
  });

  document.getElementById("bank-transactions-table")?.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains("ignore-bank-transaction")) return;
    const id = Number(target.dataset.id);
    const reason = window.prompt("Reason this transaction is not rent:");
    if (reason === null) return;
    try {
      await bankImportService.ignore(id, reason);
      await renderBankImport(container);
    } catch (error) {
      window.alert((error as Error).message);
    }
  });

  function renderPreview(): void {
    const previewElement = document.getElementById("import-preview");
    if (!previewElement || !currentPreview) return;

    previewElement.innerHTML = `
      <div class="alert alert-light border">
        <div class="row g-3">
          <div class="col-md-3"><strong>Account</strong><br>…${currentPreview.statement.accountLastFour || "Unknown"}</div>
          <div class="col-md-3"><strong>Period</strong><br>${currentPreview.statement.statementStart} to ${currentPreview.statement.statementEnd}</div>
          <div class="col-md-2"><strong>New</strong><br>${currentPreview.newCount}</div>
          <div class="col-md-2"><strong>Duplicates</strong><br>${currentPreview.duplicateCount}</div>
          <div class="col-md-2"><strong>Credits</strong><br>${currency(currentPreview.totalCredits)}</div>
        </div>
      </div>
      <div class="table-responsive">
        <table class="table table-sm">
          <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>FITID</th><th>Result</th></tr></thead>
          <tbody>
            ${currentPreview.rows.map((row) => `
              <tr>
                <td>${row.postedDate}</td>
                <td>${row.name || row.memo}</td>
                <td>${currency(row.amount)}</td>
                <td>${row.externalId}</td>
                <td><span class="badge text-bg-${row.result === "New" ? "success" : "secondary"}">${row.result}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <button id="commit-import" class="btn btn-success" ${currentPreview.newCount === 0 ? "disabled" : ""}>
        Import ${currentPreview.newCount} New Transactions
      </button>
    `;

    document.getElementById("commit-import")?.addEventListener("click", async () => {
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

export async function renderReconciliation(
  container: HTMLElement,
  transactionId: number,
): Promise<void> {
  const transaction = await db.bankTransactions.get(transactionId);
  if (!transaction) {
    container.innerHTML = '<div class="alert alert-danger">Transaction not found.</div>';
    return;
  }

  const bankTransaction = transaction;
  const suggestions = await reconciliationService.suggestions(transactionId);

  container.innerHTML = `
    <div class="page-heading d-flex justify-content-between align-items-center">
      <div>
        <h1>Reconcile Bank Transaction</h1>
        <p class="text-body-secondary mb-0">Confirm the unit and rent-period allocation.</p>
      </div>
      <a class="btn btn-outline-secondary" href="#/bank-import">Back to Import</a>
    </div>

    <div class="row g-4">
      <div class="col-lg-5">
        <div class="card">
          <div class="card-header fw-semibold">Bank Transaction</div>
          <div class="card-body">
            <dl class="row mb-0">
              <dt class="col-5">Posted</dt><dd class="col-7">${bankTransaction.postedDate}</dd>
              <dt class="col-5">Amount</dt><dd class="col-7 fs-4">${currency(bankTransaction.amount)}</dd>
              <dt class="col-5">Description</dt><dd class="col-7">${bankTransaction.name || "—"}</dd>
              <dt class="col-5">Memo</dt><dd class="col-7">${bankTransaction.memo || "—"}</dd>
              <dt class="col-5">Reference</dt><dd class="col-7 text-break">${bankTransaction.externalId}</dd>
            </dl>
          </div>
        </div>
      </div>

      <div class="col-lg-7">
        <div class="card mb-4">
          <div class="card-header fw-semibold">Suggested Units</div>
          <div class="card-body">
            <div class="list-group" id="suggestion-list">
              ${suggestions.map((suggestion, index) => `
                <button type="button"
                        class="list-group-item list-group-item-action suggestion-item ${index === 0 ? "active" : ""}"
                        data-lease-id="${suggestion.leaseId}">
                  <div class="d-flex justify-content-between gap-3">
                    <strong>${suggestion.unitLabel}</strong>
                    <span class="badge text-bg-${
                      suggestion.classification === "High Confidence"
                        ? "success"
                        : suggestion.classification === "Suggested"
                          ? "primary"
                          : suggestion.classification === "Ambiguous"
                            ? "warning"
                            : "secondary"
                    }">${suggestion.classification}</span>
                  </div>
                  <div class="small mt-1">
                    Score ${suggestion.score} · Outstanding ${currency(suggestion.amountDue)} · Oldest ${suggestion.oldestPeriod}
                  </div>
                  <ul class="small mb-0 mt-2 text-start">
                    ${suggestion.reasons.map((reason) => `<li>${reason}</li>`).join("")}
                  </ul>
                </button>
              `).join("") || '<div class="alert alert-warning mb-0">No outstanding leases found.</div>'}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header fw-semibold">Allocate</div>
          <div class="card-body">
            <div id="reconcile-allocation-list">Select a unit.</div>
            <div class="border-top mt-3 pt-3 d-flex justify-content-between">
              <span>Unapplied credit</span>
              <strong id="reconcile-unapplied">${currency(bankTransaction.amount)}</strong>
            </div>
            <button id="confirm-reconciliation" class="btn btn-primary w-100 mt-3">
              Confirm Reconciliation
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  let selectedLeaseId = suggestions[0]?.leaseId ?? 0;

  document.querySelectorAll<HTMLElement>(".suggestion-item").forEach((item) => {
    item.addEventListener("click", async () => {
      document.querySelectorAll(".suggestion-item").forEach((row) => row.classList.remove("active"));
      item.classList.add("active");
      selectedLeaseId = Number(item.dataset.leaseId);
      await loadAllocations();
    });
  });

  document.getElementById("confirm-reconciliation")?.addEventListener("click", async () => {
    try {
      const allocations = Array.from(
        document.querySelectorAll<HTMLElement>(".reconcile-allocation-row"),
      ).map((row) => ({
        obligationId: Number(row.dataset.obligationId),
        amount: Number((row.querySelector(".reconcile-allocation-amount") as HTMLInputElement).value || 0),
      })).filter((item) => item.amount > 0);

      await reconciliationService.reconcile(
        transactionId,
        selectedLeaseId,
        allocations,
      );
      location.hash = "#/bank-import";
    } catch (error) {
      window.alert((error as Error).message);
    }
  });

  if (selectedLeaseId) await loadAllocations();

  async function loadAllocations(): Promise<void> {
    const obligations = await rentLedgerService.getOutstandingObligations(selectedLeaseId);
    let remaining = bankTransaction.amount;

    const element = document.getElementById("reconcile-allocation-list");
    if (!element) return;

    element.innerHTML = obligations.map((obligation) => {
      const suggested = Math.min(remaining, obligation.balance);
      remaining -= suggested;
      return `
        <div class="row g-2 align-items-center mb-2 reconcile-allocation-row"
             data-obligation-id="${obligation.id}">
          <div class="col-4"><strong>${obligation.rentPeriod}</strong></div>
          <div class="col-3 text-end">Due ${currency(obligation.balance)}</div>
          <div class="col-5">
            <input class="form-control reconcile-allocation-amount"
                   type="number" min="0" max="${obligation.balance}" step=".01"
                   value="${suggested > 0 ? suggested : ""}">
          </div>
        </div>
      `;
    }).join("") || '<div class="alert alert-success">No outstanding rent.</div>';

    document.querySelectorAll<HTMLInputElement>(".reconcile-allocation-amount")
      .forEach((input) => input.addEventListener("input", updateUnapplied));
    updateUnapplied();
  }

  function updateUnapplied(): void {
    const allocated = Array.from(
      document.querySelectorAll<HTMLInputElement>(".reconcile-allocation-amount"),
    ).reduce((total, input) => total + Number(input.value || 0), 0);
    const element = document.getElementById("reconcile-unapplied");
    if (element) element.textContent = currency(Math.max(bankTransaction.amount - allocated, 0));
  }
}
