
import { db } from "../db/database";
import type { Unit } from "../models/domain";
import { unitRepository } from "../repositories/unitRepository";

export class UnitService {
  async save(unit: Omit<Unit, "id"> & { id?: number }): Promise<number> {
    if (!unit.buildingId) throw new Error("A building is required.");
    if (unit.bedrooms < 0 || unit.bathrooms <= 0) {
      throw new Error("Bedroom and bathroom values are invalid.");
    }
    if (unit.monthlyRent < 0) throw new Error("Monthly rent cannot be negative.");

    const apartmentNumber = unit.apartmentNumber.trim();
    const duplicate = (await unitRepository.getAll()).find(
      (item) =>
        item.buildingId === unit.buildingId &&
        item.apartmentNumber.toLowerCase() === apartmentNumber.toLowerCase() &&
        item.id !== unit.id,
    );
    if (duplicate) throw new Error("That apartment already exists in this building.");

    const { id, ...payload } = { ...unit, apartmentNumber };
    if (id) {
      await unitRepository.update(id, payload);
      return id;
    }
    return unitRepository.add(payload);
  }

  async remove(id: number): Promise<void> {
    if (await db.leases.where("unitId").equals(id).count()) {
      throw new Error("A unit with lease history cannot be deleted.");
    }
    await unitRepository.delete(id);
  }
}
export const unitService = new UnitService();
