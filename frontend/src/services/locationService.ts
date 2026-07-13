
import { db } from "../db/database";
import type { Location } from "../models/domain";
import { locationRepository } from "../repositories/locationRepository";

export class LocationService {
  async save(location: Omit<Location, "id"> & { id?: number }): Promise<number> {
    const name = location.name.trim();
    const city = location.city.trim();
    if (!name || !city) throw new Error("Location name and city are required.");

    const duplicate = (await locationRepository.getAll()).find(
      (item) => item.name.toLowerCase() === name.toLowerCase() && item.id !== location.id,
    );
    if (duplicate) throw new Error("A location with that name already exists.");

    const { id, ...payload } = { ...location, name, city };
    if (id) {
      await locationRepository.update(id, payload);
      return id;
    }
    return locationRepository.add(payload);
  }

  async remove(id: number): Promise<void> {
    if (await db.buildings.where("locationId").equals(id).count()) {
      throw new Error("Delete or move the buildings before deleting this location.");
    }
    await locationRepository.delete(id);
  }
}
export const locationService = new LocationService();
