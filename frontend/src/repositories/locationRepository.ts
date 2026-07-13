import { db } from "../db/database";
import type { Location } from "../models/domain";
import type { Repository } from "./repository";

export class DexieLocationRepository implements Repository<Location> {
  getAll(): Promise<Location[]> { return db.locations.toArray(); }
  getById(id: number): Promise<Location | undefined> { return db.locations.get(id); }
  async add(entity: Omit<Location, "id">): Promise<number> {
    const id = await db.locations.add(entity);
    if (id === undefined) throw new Error("IndexedDB did not return a location ID.");
    return id;
  }
  async update(id: number, changes: Partial<Omit<Location, "id">>): Promise<void> {
    await db.locations.update(id, changes);
  }
  async delete(id: number): Promise<void> { await db.locations.delete(id); }
}
export const locationRepository = new DexieLocationRepository();
