import { db } from "../db/database";

const tableNames = [
  "locations",
  "buildings",
  "units",
  "tenants",
  "leases",
  "leaseParticipants",
  "recurringCharges",
  "rentObligations",
  "payments",
  "paymentAllocations",
  "bankImportBatches",
  "bankTransactions",
] as const;

type TableName = (typeof tableNames)[number];
type BackupData = Record<TableName, unknown[]> & {
  backupVersion?: number;
  exportedAt?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateBackup(value: unknown): BackupData {
  if (!isRecord(value)) {
    throw new Error("The selected file is not a valid PropertyManager backup.");
  }

  for (const tableName of tableNames) {
    if (!Array.isArray(value[tableName])) {
      throw new Error(`The backup is missing the ${tableName} data collection.`);
    }
  }

  return value as BackupData;
}

export class BackupService {
  async exportBackup(): Promise<void> {
    const backup: BackupData = {
      backupVersion: 1,
      exportedAt: new Date().toISOString(),
      locations: await db.locations.toArray(),
      buildings: await db.buildings.toArray(),
      units: await db.units.toArray(),
      tenants: await db.tenants.toArray(),
      leases: await db.leases.toArray(),
      leaseParticipants: await db.leaseParticipants.toArray(),
      recurringCharges: await db.recurringCharges.toArray(),
      rentObligations: await db.rentObligations.toArray(),
      payments: await db.payments.toArray(),
      paymentAllocations: await db.paymentAllocations.toArray(),
      bankImportBatches: await db.bankImportBatches.toArray(),
      bankTransactions: await db.bankTransactions.toArray(),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `property-manager-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  async importBackup(file: File): Promise<void> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(await file.text());
    } catch {
      throw new Error("The selected file is not valid JSON.");
    }

    const backup = validateBackup(parsed);

    await db.transaction(
      "rw",
      [
        db.locations,
        db.buildings,
        db.units,
        db.tenants,
        db.leases,
        db.leaseParticipants,
        db.recurringCharges,
        db.rentObligations,
        db.payments,
        db.paymentAllocations,
        db.bankImportBatches,
        db.bankTransactions,
      ],
      async () => {
        // Clear child/financial records first for readability. IndexedDB does not
        // enforce relational foreign keys, but the ordering documents intent.
        for (const tableName of [...tableNames].reverse()) {
          await db.table(tableName).clear();
        }

        for (const tableName of tableNames) {
          const rows = backup[tableName];
          if (rows.length > 0) {
            await db.table(tableName).bulkPut(rows);
          }
        }
      },
    );
  }
}

export const backupService = new BackupService();
