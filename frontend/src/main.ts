import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "datatables.net-bs5/css/dataTables.bootstrap5.min.css";
import "./styles/app.css";
import { Modal } from "bootstrap";
import { route } from "./app/router";
import { renderShell } from "./app/shell";
import { seedDatabase } from "./db/seed";
import { backupService, type BackupPreview } from "./services/backupService";
import { applicationClock } from "./services/applicationClockService";
import { escapeHtml } from "./features/shared/format";
import { authService } from "./services/authService";

function returnToMainPage(): void {
  const environment = (import.meta as ImportMeta & {
    readonly env?: { readonly VITE_PORTAL_URL?: string };
  }).env;
  window.location.replace(environment?.VITE_PORTAL_URL || "/");
}

function bindSidebarSections(): void {
  const storageKey = "propertyManager.sidebarSections";
  let saved: Record<string, boolean> = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}"); } catch { saved = {}; }

  document.querySelectorAll<HTMLElement>(".nav-section").forEach((section) => {
    const key = section.dataset.navSection;
    const toggle = section.querySelector<HTMLButtonElement>(".nav-section-toggle");
    const items = section.querySelector<HTMLElement>(".nav-section-items");
    if (!key || !toggle || !items) return;

    const defaultExpanded = toggle.getAttribute("aria-expanded") === "true";
    const expanded = saved[key] ?? defaultExpanded;
    toggle.setAttribute("aria-expanded", String(expanded));
    items.hidden = !expanded;

    toggle.addEventListener("click", () => {
      const next = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(next));
      items.hidden = !next;
      saved[key] = next;
      localStorage.setItem(storageKey, JSON.stringify(saved));
    });
  });
}

function promptForBackup(): { name: string; notes: string } | null {
  const name = window.prompt("Backup name (required):", "")?.trim();
  if (name === undefined || name === null) return null;
  if (!name) throw new Error("A backup name is required.");
  const notes = window.prompt("Backup notes (optional):", "") ?? "";
  return { name, notes };
}

function confirmRestore(preview: BackupPreview): Promise<boolean> {
  return new Promise((resolve) => {
    const old = document.getElementById("restore-preview-modal");
    old?.remove();
    const exported = preview.exportedAt === "Unknown" ? "Unknown" : new Date(preview.exportedAt).toLocaleString();
    const integrity = preview.integrityStatus === "verified" ? "Verified" : preview.integrityStatus === "unavailable" ? "Unavailable in this HTTP browser session" : "Not provided";
    const host = document.createElement("div");
    host.innerHTML = `<div class="modal fade" id="restore-preview-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"><div class="modal-content">
        <div class="modal-header"><div><div class="small text-body-secondary">Restore Backup</div><h2 class="modal-title fs-4">${escapeHtml(preview.backupName)}</h2></div><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
          <div class="row g-3 mb-3"><div class="col-md-6"><strong>Created</strong><div>${escapeHtml(exported)}</div></div><div class="col-md-3"><strong>Application</strong><div>${escapeHtml(preview.applicationVersion)}</div></div><div class="col-md-3"><strong>Schema</strong><div>${preview.schemaVersion}</div></div></div>
          <div class="border rounded bg-body-tertiary p-3 mb-3"><div class="fw-semibold mb-2"><i class="fa-regular fa-note-sticky me-2"></i>Backup Notes</div><div style="white-space:pre-wrap;max-height:12rem;overflow:auto">${preview.notes ? escapeHtml(preview.notes) : '<span class="text-body-secondary">No notes were entered for this backup.</span>'}</div></div>
          ${preview.integrityStatus === "unavailable" ? '<div class="alert alert-warning"><strong>Integrity validation unavailable.</strong> This HTTP browser session cannot use Web Crypto. The restore may continue, but the checksum could not be verified.</div>' : ''}
          <h3 class="fs-6">Contents</h3><div class="row g-2 mb-3">
            <div class="col-6 col-md-4">Locations: <strong>${preview.counts.locations}</strong></div><div class="col-6 col-md-4">Units: <strong>${preview.counts.units}</strong></div><div class="col-6 col-md-4">Tenants: <strong>${preview.counts.tenants}</strong></div>
            <div class="col-6 col-md-4">Leases: <strong>${preview.counts.leases}</strong></div><div class="col-6 col-md-4">Payments: <strong>${preview.counts.payments}</strong></div><div class="col-6 col-md-4">Obligations: <strong>${preview.counts.rentObligations}</strong></div>
          </div>
          <details><summary>Technical details</summary><div class="small mt-2">Format version: ${preview.formatVersion}<br>Integrity: ${escapeHtml(integrity)}<br>Total records: ${preview.totalRecords}${preview.legacy ? '<br>Legacy backup: Yes' : ''}</div></details>
          <div class="alert alert-danger mt-3 mb-0">All current PropertyManager data in this browser will be replaced.</div>
        </div>
        <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button type="button" class="btn btn-danger" id="confirm-restore">Restore Backup</button></div>
      </div></div></div>`;
    document.body.append(host.firstElementChild!);
    const element = document.getElementById("restore-preview-modal")!;
    const instance = new Modal(element);
    let accepted = false;
    document.getElementById("confirm-restore")?.addEventListener("click", () => { accepted = true; instance.hide(); });
    element.addEventListener("hidden.bs.modal", () => { element.remove(); resolve(accepted); }, { once: true });
    instance.show();
  });
}

async function startAuthenticatedApplication(): Promise<void> {
  await seedDatabase();
  const container = renderShell();
  bindSidebarSections();
  document.getElementById("main-page-button")?.addEventListener("click", returnToMainPage);
  window.addEventListener("hashchange", () => void route(container));
  document.getElementById("banner-restore-system-date")?.addEventListener("click", () => { applicationClock.useSystemDate(); window.location.reload(); });
  document.getElementById("reset-data")?.addEventListener("click", async () => { if (!window.confirm("Reset browser data to the sample portfolio?")) return; await seedDatabase(true); await route(container); window.alert("Sample data restored."); });
  document.getElementById("export-data")?.addEventListener("click", async () => {
    try { const details = promptForBackup(); if (!details) return; await backupService.exportBackup(details.name, details.notes); } catch (error) { window.alert((error as Error).message); }
  });
  const importInput = document.getElementById("import-data-file") as HTMLInputElement | null;
  document.getElementById("import-data")?.addEventListener("click", () => importInput?.click());
  importInput?.addEventListener("change", async () => {
    const file = importInput.files?.[0]; importInput.value = ""; if (!file) return;
    try {
      const preview = await backupService.inspectBackup(file);
      if (!(await confirmRestore(preview))) return;
      await backupService.importBackup(file);
      window.alert("Backup restored successfully. The application will reload.");
      window.location.reload();
    } catch (error) { window.alert(`Import failed. Current data was not changed.

${(error as Error).message}`); }
  });
  await route(container);
}

async function start(): Promise<void> {
  window.addEventListener("pm:authentication-required", returnToMainPage);
  const session = await authService.restore();
  if (!session) {
    returnToMainPage();
    return;
  }
  await startAuthenticatedApplication();
}

void start();
