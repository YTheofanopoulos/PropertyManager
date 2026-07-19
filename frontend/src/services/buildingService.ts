
import { db } from "../db/database";
import type { Building } from "../models/domain";
import { buildingRepository } from "../repositories/buildingRepository";

export class BuildingService {
  async save(building: Omit<Building, "id"> & { id?: number }): Promise<number> {
    const civicAddress = building.civicAddress.trim();
    if (!building.locationId || !civicAddress) {
      throw new Error("Location and civic address are required.");
    }

    const duplicate = (await buildingRepository.getAll()).find(
      (item) =>
        item.locationId === building.locationId &&
        item.civicAddress.toLowerCase() === civicAddress.toLowerCase() &&
        item.id !== building.id,
    );
    if (duplicate) throw new Error("That civic address already exists at this location.");

    const { id, ...payload } = {
      ...building,
      civicAddress,
      city: building.city?.trim() ?? "",
      stateProvince: building.stateProvince?.trim() ?? "",
      postalCode: building.postalCode?.trim().toUpperCase() ?? "",
    };
    if (id) {
      await buildingRepository.update(id, payload);
      return id;
    }
    return buildingRepository.add(payload);
  }

  async remove(id: number): Promise<void> {
    if (await db.units.where("buildingId").equals(id).count()) {
      throw new Error("Delete or move the units before deleting this building.");
    }
    await buildingRepository.delete(id);
  }
}
export const buildingService = new BuildingService();
