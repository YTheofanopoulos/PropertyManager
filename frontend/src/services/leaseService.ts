
import { db } from "../db/database";
import type {
  ChargeType,
  Lease,
  LeaseParticipant,
  RecurringCharge,
} from "../models/domain";

export interface LeaseChargeInput {
  chargeType: ChargeType;
  description: string;
  amount: number;
}

export interface LeaseSaveInput {
  id?: number;
  unitId: number;
  startDate: string;
  endDate: string;
  termType: "Fixed" | "Month-to-Month";
  status: "Active" | "Expired" | "Future" | "Terminated";
  notes: string;
  participantIds: number[];
  primaryTenantId: number;
  charges: LeaseChargeInput[];
}

function datesOverlap(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string,
): boolean {
  const effectiveLeftEnd = leftEnd || "9999-12-31";
  const effectiveRightEnd = rightEnd || "9999-12-31";
  return leftStart <= effectiveRightEnd && rightStart <= effectiveLeftEnd;
}

export class LeaseService {
  async save(input: LeaseSaveInput): Promise<number> {
    if (!input.unitId) throw new Error("Select a unit.");
    if (!input.startDate) throw new Error("A lease start date is required.");
    if (input.termType === "Fixed" && !input.endDate) {
      throw new Error("A fixed-term lease requires an end date.");
    }
    if (input.endDate && input.endDate < input.startDate) {
      throw new Error("The lease end date cannot be before the start date.");
    }
    if (input.participantIds.length === 0) {
      throw new Error("Select at least one leaseholder.");
    }
    if (!input.participantIds.includes(input.primaryTenantId)) {
      throw new Error("The primary leaseholder must be one of the selected people.");
    }

    const apartmentRent = input.charges.find(
      (charge) => charge.chargeType === "Apartment Rent",
    );
    if (!apartmentRent || apartmentRent.amount <= 0) {
      throw new Error("Apartment rent must be greater than zero.");
    }
    if (input.charges.some((charge) => charge.amount < 0)) {
      throw new Error("Charge amounts cannot be negative.");
    }

    const leases = await db.leases.where("unitId").equals(input.unitId).toArray();
    const overlap = leases.find(
      (lease) =>
        lease.id !== input.id &&
        lease.status !== "Terminated" &&
        datesOverlap(
          input.startDate,
          input.termType === "Month-to-Month" ? "" : input.endDate,
          lease.startDate,
          lease.termType === "Month-to-Month" ? "" : lease.endDate,
        ),
    );
    if (overlap) {
      throw new Error("These dates overlap another lease for the selected unit.");
    }

    const participantLinks = await db.leaseParticipants
      .where("tenantId")
      .anyOf(input.participantIds)
      .toArray();

    const otherLeaseIds = Array.from(
      new Set(
        participantLinks
          .map((participant) => participant.leaseId)
          .filter((leaseId) => leaseId !== input.id),
      ),
    );

    const otherLeases = otherLeaseIds.length > 0
      ? await db.leases.bulkGet(otherLeaseIds)
      : [];

    const selectedTenants = await db.tenants.bulkGet(input.participantIds);
    const tenants = new Map(
      selectedTenants
        .filter((tenant): tenant is NonNullable<typeof tenant> => Boolean(tenant))
        .map((tenant) => [tenant.id, tenant]),
    );

    for (const participantId of input.participantIds) {
      const conflictingLink = participantLinks.find((participant) => {
        if (participant.tenantId !== participantId || participant.leaseId === input.id) {
          return false;
        }

        const existingLease = otherLeases.find(
          (lease) => lease?.id === participant.leaseId,
        );

        if (!existingLease || existingLease.status === "Terminated") {
          return false;
        }

        return datesOverlap(
          input.startDate,
          input.termType === "Month-to-Month" ? "" : input.endDate,
          existingLease.startDate,
          existingLease.termType === "Month-to-Month" ? "" : existingLease.endDate,
        );
      });

      if (conflictingLink) {
        const conflictingLease = otherLeases.find(
          (lease) => lease?.id === conflictingLink.leaseId,
        );
        const tenant = tenants.get(participantId);
        const tenantName = tenant
          ? `${tenant.firstName} ${tenant.lastName}`
          : "The selected tenant";

        throw new Error(
          `${tenantName} already belongs to another lease covering this timeframe ` +
          `(${conflictingLease?.startDate ?? "unknown start"} to ` +
          `${conflictingLease?.termType === "Month-to-Month"
            ? "month-to-month"
            : conflictingLease?.endDate ?? "unknown end"}).`,
        );
      }
    }

    return db.transaction(
      "rw",
      db.leases,
      db.leaseParticipants,
      db.recurringCharges,
      db.units,
      async () => {
        const leasePayload: Omit<Lease, "id"> = {
          unitId: input.unitId,
          startDate: input.startDate,
          endDate: input.termType === "Month-to-Month" ? "" : input.endDate,
          termType: input.termType,
          status: input.status,
          notes: input.notes.trim(),
        };

        let leaseId = input.id;

        if (leaseId) {
          await db.leases.update(leaseId, leasePayload);
          await db.leaseParticipants.where("leaseId").equals(leaseId).delete();
          await db.recurringCharges.where("leaseId").equals(leaseId).delete();
        } else {
          leaseId = Number(await db.leases.add(leasePayload));
        }

        await db.leaseParticipants.bulkAdd(
          input.participantIds.map((tenantId) => ({
            leaseId: leaseId as number,
            tenantId,
            primary: tenantId === input.primaryTenantId,
          } satisfies LeaseParticipant)),
        );

        const effectiveEnd = input.termType === "Month-to-Month" ? "" : input.endDate;
        await db.recurringCharges.bulkAdd(
          input.charges
            .filter((charge) => charge.amount > 0)
            .map((charge) => ({
              leaseId: leaseId as number,
              chargeType: charge.chargeType,
              description: charge.description.trim() || charge.chargeType,
              amount: charge.amount,
              frequency: "Monthly",
              startDate: input.startDate,
              endDate: effectiveEnd,
            } satisfies RecurringCharge)),
        );

        await this.refreshUnitOccupancy(input.unitId);
        return leaseId;
      },
    );
  }

  async terminate(leaseId: number): Promise<void> {
    const lease = await db.leases.get(leaseId);
    if (!lease) throw new Error("Lease not found.");

    await db.transaction("rw", db.leases, db.units, async () => {
      await db.leases.update(leaseId, { status: "Terminated" });
      await this.refreshUnitOccupancy(lease.unitId);
    });
  }

  async refreshUnitOccupancy(unitId: number): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const leases = await db.leases.where("unitId").equals(unitId).toArray();
    const occupied = leases.some((lease) => {
      if (lease.status === "Terminated") return false;
      const afterStart = lease.startDate <= today;
      const beforeEnd =
        lease.termType === "Month-to-Month" ||
        !lease.endDate ||
        lease.endDate >= today;
      return afterStart && beforeEnd;
    });

    await db.units.update(unitId, {
      status: occupied ? "Occupied" : "Vacant",
    });
  }
}

export const leaseService = new LeaseService();
