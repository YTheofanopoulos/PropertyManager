import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "datatables.net-bs5/css/dataTables.bootstrap5.min.css";
import "./styles/app.css";
import "bootstrap";
import { route } from "./app/router";
import { renderShell } from "./app/shell";
import { seedDatabase } from "./db/seed";
import { backupService } from "./services/backupService";
import { applicationClock } from "./services/applicationClockService";

async function start(): Promise<void> {
  await seedDatabase();
  const container = renderShell();

  window.addEventListener("hashchange", () => void route(container));

  document
    .getElementById("banner-restore-system-date")
    ?.addEventListener("click", () => {
      applicationClock.useSystemDate();
      window.location.reload();
    });

  document.getElementById("reset-data")?.addEventListener("click", async () => {
    if (!window.confirm("Reset browser data to the sample portfolio?")) return;
    await seedDatabase(true);
    await route(container);
    window.alert("Sample data restored.");
  });

  document.getElementById("export-data")?.addEventListener("click", async () => {
    try {
      const notes = window.prompt("Optional backup notes:", "") ?? "";
      await backupService.exportBackup(notes);
    } catch (error) {
      window.alert((error as Error).message);
    }
  });

  const importInput = document.getElementById(
    "import-data-file",
  ) as HTMLInputElement | null;

  document.getElementById("import-data")?.addEventListener("click", () => {
    importInput?.click();
  });

  importInput?.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    importInput.value = "";
    if (!file) return;

    try {
      const preview = await backupService.inspectBackup(file);
      const exported = preview.exportedAt === "Unknown"
        ? "Unknown"
        : new Date(preview.exportedAt).toLocaleString();
      const notes = preview.notes ? `\nNotes: ${preview.notes}` : "";
      const legacy = preview.legacy ? "\nLegacy backup: Yes" : "";
      const confirmed = window.confirm(
        `Restore this PropertyManager backup?\n\n` +
        `Created: ${exported}\n` +
        `Application: ${preview.applicationVersion}\n` +
        `Schema: ${preview.schemaVersion}\n` +
        `Records: ${preview.totalRecords}${notes}${legacy}\n\n` +
        `Locations: ${preview.counts.locations}\n` +
        `Units: ${preview.counts.units}\n` +
        `Tenants: ${preview.counts.tenants}\n` +
        `Leases: ${preview.counts.leases}\n` +
        `Payments: ${preview.counts.payments}\n` +
        `Rent obligations: ${preview.counts.rentObligations}\n\n` +
        "All current PropertyManager data in this browser will be replaced.",
      );
      if (!confirmed) return;

      await backupService.importBackup(file);
      window.alert("JSON data imported successfully. The application will reload.");
      window.location.reload();
    } catch (error) {
      window.alert(
        `Import failed. Current data was not changed.\n\n${(error as Error).message}`,
      );
    }
  });

  await route(container);
}

void start();
