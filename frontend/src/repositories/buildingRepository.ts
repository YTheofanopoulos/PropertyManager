
import { db } from "../db/database";
import type { Building } from "../models/domain";
import type { Repository } from "./repository";

export class DexieBuildingRepository implements Repository<Building> {
  getAll(): Promise<Building[]> { return db.buildings.toArray(); }
  getById(id: number): Promise<Building | undefined> { return db.buildings.get(id); }
  async add(entity: Omit<Building, "id">): Promise<number> { const id = await db.buildings.add(entity); if (id === undefined) throw new Error("IndexedDB did not return a building ID."); return id; }
  async update(id: number, changes: Partial<Omit<Building, "id">>): Promise<void> {
    await db.buildings.update(id, changes);
  }
  async delete(id: number): Promise<void> { await db.buildings.delete(id); }
}
export const buildingRepository = new DexieBuildingRepository();
