import { db } from "../db/database";

export const BACKUP_FORMAT = "PropertyManagerBackup";
export const BACKUP_VERSION = 3;
export const APPLICATION_VERSION = "6.6.2";
export const DATABASE_SCHEMA_VERSION = 9;

const tableNames = [
  "locations", "buildings", "units", "tenants", "leases", "leaseParticipants",
  "recurringCharges", "leaseConcessions", "rentObligations", "payments",
  "paymentAllocations", "bankImportBatches", "bankTransactions", "reconciliationHistory",
] as const;

type TableName = (typeof tableNames)[number];
type DatabaseSnapshot = Record<TableName, unknown[]>;

interface VersionedBackup {
  format: typeof BACKUP_FORMAT;
  backupVersion: number;
  backupName: string;
  applicationVersion: string;
  schemaVersion: number;
  exportedAt: string;
  notes: string;
  checksum?: { algorithm: "SHA-256"; value: string };
  database: DatabaseSnapshot;
}

interface LegacyBackup extends Partial<DatabaseSnapshot> { backupVersion?: number; exportedAt?: string; }

export interface BackupPreview {
  backupName: string;
  formatVersion: number;
  applicationVersion: string;
  schemaVersion: number;
  exportedAt: string;
  notes: string;
  counts: Record<TableName, number>;
  totalRecords: number;
  legacy: boolean;
  integrityStatus: "verified" | "unavailable" | "not-provided";
}

interface PreparedBackup { database: DatabaseSnapshot; preview: BackupPreview; }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateDatabase(value: unknown): DatabaseSnapshot {
  if (!isRecord(value)) throw new Error("The backup does not contain a valid database snapshot.");
  for (const tableName of tableNames) {
    if (!Array.isArray(value[tableName])) throw new Error(`The backup is missing the ${tableName} data collection.`);
  }
  return value as DatabaseSnapshot;
}

async function sha256(value: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const bytes = new TextEncoder().encode(value);
  const digest = await subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function stableDatabaseJson(database: DatabaseSnapshot): string { return JSON.stringify(database); }

function sanitizeBackupName(value: string): string {
  return value.trim().replace(/[<>:"/\|?*\x00-\x1F]/g, "").replace(/\s+/g, "_").replace(/_+/g, "_").replace(/^[_\.]+|[_\.]+$/g, "").slice(0, 80) || "Backup";
}

function previewFor(database: DatabaseSnapshot, metadata: Omit<BackupPreview, "counts" | "totalRecords">): BackupPreview {
  const counts = Object.fromEntries(tableNames.map((tableName) => [tableName, database[tableName].length])) as Record<TableName, number>;
  return { ...metadata, counts, totalRecords: Object.values(counts).reduce((total, count) => total + count, 0) };
}

export class BackupService {
  async exportBackup(backupName: string, notes = ""): Promise<void> {
    const cleanName = backupName.trim();
    if (!cleanName) throw new Error("A backup name is required.");
    const database = Object.fromEntries(await Promise.all(tableNames.map(async (tableName) => [tableName, await db.table(tableName).toArray()]))) as DatabaseSnapshot;
    const checksumValue = await sha256(stableDatabaseJson(database));
    const backup: VersionedBackup = {
      format: BACKUP_FORMAT,
      backupVersion: BACKUP_VERSION,
      backupName: cleanName,
      applicationVersion: APPLICATION_VERSION,
      schemaVersion: DATABASE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      notes: notes.trim(),
      ...(checksumValue ? { checksum: { algorithm: "SHA-256" as const, value: checksumValue } } : {}),
      database,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const filename = `PropertyManager_${sanitizeBackupName(cleanName)}_${new Date().toISOString().slice(0, 10)}.json`;
    const objectUrl = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    }
  }

  async inspectBackup(file: File): Promise<BackupPreview> { return (await this.prepareBackup(file)).preview; }

  async importBackup(file: File): Promise<void> {
    const prepared = await this.prepareBackup(file);
    await db.transaction("rw", tableNames.map((tableName) => db.table(tableName)), async () => {
      for (const tableName of [...tableNames].reverse()) await db.table(tableName).clear();
      for (const tableName of tableNames) {
        const rows = prepared.database[tableName];
        if (rows.length > 0) await db.table(tableName).bulkPut(rows);
      }
    });
  }

  private async prepareBackup(file: File): Promise<PreparedBackup> {
    let parsed: unknown;
    try { parsed = JSON.parse(await file.text()); } catch { throw new Error("The selected file is not valid JSON."); }
    if (!isRecord(parsed)) throw new Error("The selected file is not a valid PropertyManager backup.");

    if (parsed.format === BACKUP_FORMAT) {
      const schemaVersion = Number(parsed.schemaVersion);
      if (!Number.isInteger(schemaVersion) || schemaVersion < 1) throw new Error("The backup has an invalid database schema version.");
      if (schemaVersion > DATABASE_SCHEMA_VERSION) throw new Error(`This backup uses database schema ${schemaVersion}, but this application supports schema ${DATABASE_SCHEMA_VERSION}. Upgrade PropertyManager before restoring it.`);
      const database = validateDatabase(parsed.database);
      const checksum = isRecord(parsed.checksum) ? String(parsed.checksum.value ?? "") : "";
      let integrityStatus: BackupPreview["integrityStatus"] = "not-provided";
      if (checksum) {
        const actualChecksum = await sha256(stableDatabaseJson(database));
        if (actualChecksum === null) integrityStatus = "unavailable";
        else {
          if (actualChecksum !== checksum) throw new Error("The backup failed its integrity check and may be incomplete or modified.");
          integrityStatus = "verified";
        }
      }
      return { database, preview: previewFor(database, {
        backupName: String(parsed.backupName ?? file.name.replace(/\.json$/i, "")),
        formatVersion: Number(parsed.backupVersion ?? 0), applicationVersion: String(parsed.applicationVersion ?? "Unknown"),
        schemaVersion, exportedAt: String(parsed.exportedAt ?? "Unknown"), notes: String(parsed.notes ?? ""),
        legacy: false, integrityStatus,
      }) };
    }

    const legacy = parsed as LegacyBackup;
    const database = validateDatabase({ ...legacy, leaseConcessions: Array.isArray(legacy.leaseConcessions) ? legacy.leaseConcessions : [] });
    return { database, preview: previewFor(database, {
      backupName: file.name.replace(/\.json$/i, ""), formatVersion: Number(legacy.backupVersion ?? 1),
      applicationVersion: "Legacy 5.x backup", schemaVersion: 7, exportedAt: String(legacy.exportedAt ?? "Unknown"),
      notes: "", legacy: true, integrityStatus: "not-provided",
    }) };
  }
}

export const backupService = new BackupService();
