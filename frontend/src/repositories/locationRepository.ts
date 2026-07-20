import { db } from "../db/database";
import type { Location } from "../models/domain";
import type { Repository } from "./repository";
import { apiRequest } from "./apiClient";
import { repositoryConfiguration } from "./repositoryConfiguration";

export interface LocationListItem extends Location {
  buildingCount: number;
  unitCount: number;
}

export interface LocationRepository extends Repository<Location> {
  getListItems(): Promise<LocationListItem[]>;
}

export class DexieLocationRepository implements LocationRepository {
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

  async getListItems(): Promise<LocationListItem[]> {
    const [locations, buildings, units] = await Promise.all([
      db.locations.toArray(),
      db.buildings.toArray(),
      db.units.toArray(),
    ]);
    return locations.map((location) => {
      const locationBuildings = buildings.filter(
        (building) => building.locationId === location.id,
      );
      const buildingIds = new Set(locationBuildings.map((building) => building.id));
      return {
        ...location,
        buildingCount: locationBuildings.length,
        unitCount: units.filter((unit) => buildingIds.has(unit.buildingId)).length,
      };
    });
  }
}

export class ApiLocationRepository implements LocationRepository {
  getAll(): Promise<Location[]> {
    return apiRequest<LocationListItem[]>("/api/v1/locations");
  }

  getById(id: number): Promise<Location | undefined> {
    return apiRequest<Location>(`/api/v1/locations/${id}`);
  }

  async add(entity: Omit<Location, "id">): Promise<number> {
    const created = await apiRequest<Location>("/api/v1/locations", {
      method: "POST",
      body: JSON.stringify(entity),
    });
    if (created.id === undefined) {
      throw new Error("The backend did not return a location identifier.");
    }
    return created.id;
  }

  async update(
    id: number,
    changes: Partial<Omit<Location, "id">>,
  ): Promise<void> {
    const current = await this.getById(id);
    if (!current) throw new Error("Location not found.");
    await apiRequest<Location>(`/api/v1/locations/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...current, ...changes }),
    });
  }

  delete(id: number): Promise<void> {
    return apiRequest<void>(`/api/v1/locations/${id}`, { method: "DELETE" });
  }

  getListItems(): Promise<LocationListItem[]> {
    return apiRequest<LocationListItem[]>("/api/v1/locations");
  }
}

export const locationRepository: LocationRepository =
  repositoryConfiguration.locations === "api"
    ? new ApiLocationRepository()
    : new DexieLocationRepository();
