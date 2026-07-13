
import { db } from "../db/database";
import type { Tenant } from "../models/domain";
import { tenantRepository } from "../repositories/tenantRepository";

export class TenantService {
  async save(tenant: Omit<Tenant, "id"> & { id?: number }): Promise<number> {
    const firstName = tenant.firstName.trim();
    const lastName = tenant.lastName.trim();
    const email = tenant.email.trim();

    if (!firstName || !lastName) throw new Error("First and last name are required.");
    if (!email.includes("@")) throw new Error("Enter a valid email address.");

    const duplicate = (await tenantRepository.getAll()).find(
      (item) => item.email.toLowerCase() === email.toLowerCase() && item.id !== tenant.id,
    );
    if (duplicate) throw new Error("A tenant with that email already exists.");

    const { id, ...payload } = { ...tenant, firstName, lastName, email };
    if (id) {
      await tenantRepository.update(id, payload);
      return id;
    }
    return tenantRepository.add(payload);
  }

  async remove(id: number): Promise<void> {
    if (await db.leaseParticipants.where("tenantId").equals(id).count()) {
      throw new Error("A leaseholder cannot be deleted. Mark the tenant inactive instead.");
    }
    await tenantRepository.delete(id);
  }
}
export const tenantService = new TenantService();
