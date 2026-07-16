
import { applicationClock } from "../../services/applicationClockService";

export function renderSettings(container: HTMLElement): void {
  const settings = applicationClock.getSettings();

  container.innerHTML = `
    <div class="page-heading">
      <h1>Settings</h1>
      <p class="text-body-secondary mb-0">
        Configure application-wide behavior and historical testing.
      </p>
    </div>

    <div class="card">
      <div class="card-header fw-semibold">
        Application Date
      </div>
      <div class="card-body">
        <p class="text-body-secondary">
          Control the date PropertyManager uses for business rules such as
          outstanding rent, overdue periods, Rent Status, and default report
          ranges. Stored transaction, QFX, lease, and audit dates are never
          rewritten.
        </p>

        <div class="form-check mb-3">
          <input class="form-check-input"
                 type="radio"
                 name="application-clock-mode"
                 id="clock-mode-system"
                 value="system"
                 ${settings.mode === "system" ? "checked" : ""}>
          <label class="form-check-label" for="clock-mode-system">
            Use system date
          </label>
        </div>

        <div class="form-check mb-3">
          <input class="form-check-input"
                 type="radio"
                 name="application-clock-mode"
                 id="clock-mode-simulated"
                 value="simulated"
                 ${settings.mode === "simulated" ? "checked" : ""}>
          <label class="form-check-label" for="clock-mode-simulated">
            Use simulated date
          </label>
        </div>

        <div class="row g-3 align-items-end">
          <div class="col-sm-6 col-lg-4">
            <label for="simulated-application-date" class="form-label">
              Simulated date
            </label>
            <input id="simulated-application-date"
                   type="date"
                   class="form-control"
                   value="${settings.simulatedDate}">
          </div>

          <div class="col-sm-6 col-lg-auto">
            <button id="apply-application-clock"
                    type="button"
                    class="btn btn-primary">
              Apply
            </button>
          </div>

          <div class="col-sm-6 col-lg-auto">
            <button id="restore-system-clock"
                    type="button"
                    class="btn btn-outline-secondary">
              Return to System Date
            </button>
          </div>
        </div>

        <div class="alert ${
          settings.mode === "simulated"
            ? "alert-warning"
            : "alert-secondary"
        } mt-4 mb-0">
          ${
            settings.mode === "simulated"
              ? `<strong>Historical Test Mode:</strong>
                 PropertyManager currently considers
                 ${applicationClock.formatToday()} to be today.`
              : `<strong>System Date Mode:</strong>
                 PropertyManager currently considers
                 ${applicationClock.formatToday()} to be today.`
          }
        </div>
      </div>
    </div>
  `;

  document
    .getElementById("apply-application-clock")
    ?.addEventListener("click", () => {
      const mode = (
        document.querySelector(
          "input[name='application-clock-mode']:checked",
        ) as HTMLInputElement | null
      )?.value;

      const date = (
        document.getElementById(
          "simulated-application-date",
        ) as HTMLInputElement
      ).value;

      try {
        if (mode === "simulated") {
          applicationClock.setSimulatedDate(date);
        } else {
          applicationClock.useSystemDate();
        }
        window.location.reload();
      } catch (error) {
        window.alert((error as Error).message);
      }
    });

  document
    .getElementById("restore-system-clock")
    ?.addEventListener("click", () => {
      applicationClock.useSystemDate();
      window.location.reload();
    });
}
