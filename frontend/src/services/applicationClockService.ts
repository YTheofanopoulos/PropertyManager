
export type ApplicationClockMode = "system" | "simulated";

export interface ApplicationClockSettings {
  mode: ApplicationClockMode;
  simulatedDate: string;
}

const STORAGE_KEY = "propertyManager.applicationClock";
const DEFAULT_SIMULATED_DATE = "2025-07-01";

function systemDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
}

class ApplicationClockService {
  getSettings(): ApplicationClockSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          mode: "system",
          simulatedDate: DEFAULT_SIMULATED_DATE,
        };
      }

      const parsed = JSON.parse(raw) as Partial<ApplicationClockSettings>;
      return {
        mode: parsed.mode === "simulated" ? "simulated" : "system",
        simulatedDate:
          typeof parsed.simulatedDate === "string" &&
          validDate(parsed.simulatedDate)
            ? parsed.simulatedDate
            : DEFAULT_SIMULATED_DATE,
      };
    } catch {
      return {
        mode: "system",
        simulatedDate: DEFAULT_SIMULATED_DATE,
      };
    }
  }

  today(): string {
    const settings = this.getSettings();
    return settings.mode === "simulated"
      ? settings.simulatedDate
      : systemDateString();
  }

  currentPeriod(): string {
    return this.today().slice(0, 7);
  }

  date(): Date {
    return new Date(`${this.today()}T12:00:00`);
  }

  isSimulated(): boolean {
    return this.getSettings().mode === "simulated";
  }

  setSimulatedDate(value: string): void {
    if (!validDate(value)) {
      throw new Error("Enter a valid simulated application date.");
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mode: "simulated",
        simulatedDate: value,
      } satisfies ApplicationClockSettings),
    );
  }

  useSystemDate(): void {
    const settings = this.getSettings();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mode: "system",
        simulatedDate: settings.simulatedDate,
      } satisfies ApplicationClockSettings),
    );
  }

  formatToday(): string {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(this.date());
  }
}

export const applicationClock = new ApplicationClockService();
