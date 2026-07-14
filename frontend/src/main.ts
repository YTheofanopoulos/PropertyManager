import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "datatables.net-bs5/css/dataTables.bootstrap5.min.css";
import "./styles/app.css";
import "bootstrap";
import { route } from "./app/router";
import { renderShell } from "./app/shell";
import { seedDatabase } from "./db/seed";
import { backupService } from "./services/backupService";

async function start(): Promise<void> {
  await seedDatabase();
  const container = renderShell();

  window.addEventListener("hashchange", () => void route(container));

  document.getElementById("reset-data")?.addEventListener("click", async () => {
    if (!window.confirm("Reset browser data to the sample portfolio?")) return;
    await seedDatabase(true);
    await route(container);
    window.alert("Sample data restored.");
  });

  document.getElementById("export-data")?.addEventListener("click", async () => {
    try {
      await backupService.exportBackup();
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

    const confirmed = window.confirm(
      "Import this JSON backup?\n\n" +
        "All current PropertyManager data in this browser will be replaced. " +
        "This cannot be undone unless you export the current data first.",
    );
    if (!confirmed) return;

    try {
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
