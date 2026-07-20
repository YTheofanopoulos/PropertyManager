
import { db } from "../db/database";
import type { Building } from "../models/domain";
import type { Repository } from "./repository";
import { apiRequest } from "./apiClient";
import { repositoryConfiguration } from "./repositoryConfiguration";

export interface BuildingListItem extends Building {
  street: string;
  unitCount: number;
}

export interface BuildingRepository extends Repository<Building> {
  getListItems(): Promise<BuildingListItem[]>;
}

export class DexieBuildingRepository implements BuildingRepository {
  getAll(): Promise<Building[]> { return db.buildings.toArray(); }
  getById(id: number): Promise<Building | undefined> { return db.buildings.get(id); }
  async add(entity: Omit<Building, "id">): Promise<number> { const id = await db.buildings.add(entity); if (id === undefined) throw new Error("IndexedDB did not return a building ID."); return id; }
  async update(id: number, changes: Partial<Omit<Building, "id">>): Promise<void> {
    await db.buildings.update(id, changes);
  }
  async delete(id: number): Promise<void> { await db.buildings.delete(id); }

  async getListItems(): Promise<BuildingListItem[]> {
    const [buildings, locations, units] = await Promise.all([
      db.buildings.toArray(),
      db.locations.toArray(),
      db.units.toArray(),
    ]);
    const locationMap = new Map(locations.map((location) => [location.id, location]));
    return buildings.map((building) => ({
      ...building,
      street: locationMap.get(building.locationId)?.name ?? "Unknown",
      unitCount: units.filter((unit) => unit.buildingId === building.id).length,
    }));
  }
}

export class ApiBuildingRepository implements BuildingRepository {
  getAll(): Promise<Building[]> {
    return apiRequest<BuildingListItem[]>("/api/v1/buildings");
  }

  getById(id: number): Promise<Building | undefined> {
    return apiRequest<Building>(`/api/v1/buildings/${id}`);
  }

  async add(entity: Omit<Building, "id">): Promise<number> {
    const created = await apiRequest<Building>("/api/v1/buildings", {
      method: "POST",
      body: JSON.stringify(entity),
    });
    if (created.id === undefined) {
      throw new Error("The backend did not return a building identifier.");
    }
    return created.id;
  }

  async update(
    id: number,
    changes: Partial<Omit<Building, "id">>,
  ): Promise<void> {
    const current = await this.getById(id);
    if (!current) throw new Error("Building not found.");
    await apiRequest<Building>(`/api/v1/buildings/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...current, ...changes }),
    });
  }

  delete(id: number): Promise<void> {
    return apiRequest<void>(`/api/v1/buildings/${id}`, { method: "DELETE" });
  }

  getListItems(): Promise<BuildingListItem[]> {
    return apiRequest<BuildingListItem[]>("/api/v1/buildings");
  }
}

export const buildingRepository: BuildingRepository =
  repositoryConfiguration.buildings === "api"
    ? new ApiBuildingRepository()
    : new DexieBuildingRepository();
