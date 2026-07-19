
import { db } from "../db/database";
import { applicationClock } from "./applicationClockService";
import type {
  ChargeType,
  Lease,
  LeaseParticipant,
  LeaseConcession,
  RecurringCharge,
} from "../models/domain";

export interface LeaseChargeInput {
  chargeType: ChargeType;
  description: string;
  amount: number;
}

export interface LeaseConcessionInput {
  id?: number;
  description: string;
  amount: number;
  startPeriod: string;
  endPeriod: string;
  comment?: string;
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
  concessions: LeaseConcessionInput[];
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
    if (input.concessions.some((concession) => concession.amount <= 0)) {
      throw new Error("Concession amounts must be greater than zero.");
    }
    for (const concession of input.concessions) {
      if (!/^\d{4}-\d{2}$/.test(concession.startPeriod) || !/^\d{4}-\d{2}$/.test(concession.endPeriod)) {
        throw new Error("Concession start and end periods are required.");
      }
      if (concession.endPeriod < concession.startPeriod) {
        throw new Error("A concession end period cannot be before its start period.");
      }
    }

    const existingLease = input.id
      ? await db.leases.get(input.id)
      : undefined;
    const existingParticipants = input.id
      ? await db.leaseParticipants.where("leaseId").equals(input.id).toArray()
      : [];

    const effectiveEndDate =
      input.termType === "Month-to-Month" ? "" : input.endDate;
    const existingParticipantIds = existingParticipants
      .map((participant) => participant.tenantId)
      .sort((left, right) => left - right);
    const incomingParticipantIds = [...input.participantIds]
      .sort((left, right) => left - right);

    const occupancyDefinitionChanged =
      !existingLease ||
      existingLease.unitId !== input.unitId ||
      existingLease.startDate !== input.startDate ||
      existingLease.endDate !== effectiveEndDate ||
      (existingLease.termType ?? "Fixed") !== input.termType ||
      existingParticipantIds.length !== incomingParticipantIds.length ||
      existingParticipantIds.some(
        (tenantId, index) => tenantId !== incomingParticipantIds[index],
      );

    const incomingStatusReservesOccupancy =
      input.status === "Active" || input.status === "Future";
    const existingStatusReservedOccupancy =
      existingLease?.status === "Active" || existingLease?.status === "Future";
    const leaseIsBeingReactivated =
      Boolean(existingLease) &&
      !existingStatusReservedOccupancy &&
      incomingStatusReservesOccupancy;

    const shouldValidateOverlap =
      incomingStatusReservesOccupancy &&
      (occupancyDefinitionChanged || leaseIsBeingReactivated);

    if (shouldValidateOverlap) {
      const leases = await db.leases.where("unitId").equals(input.unitId).toArray();
      const overlap = leases.find(
        (lease) =>
          lease.id !== input.id &&
          (lease.status === "Active" || lease.status === "Future") &&
          datesOverlap(
            input.startDate,
            effectiveEndDate,
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
          if (
            participant.tenantId !== participantId ||
            participant.leaseId === input.id
          ) {
            return false;
          }

          const conflictingLease = otherLeases.find(
            (lease) => lease?.id === participant.leaseId,
          );

          if (
            !conflictingLease ||
            (conflictingLease.status !== "Active" &&
              conflictingLease.status !== "Future")
          ) {
            return false;
          }

          return datesOverlap(
            input.startDate,
            effectiveEndDate,
            conflictingLease.startDate,
            conflictingLease.termType === "Month-to-Month"
              ? ""
              : conflictingLease.endDate,
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
    }

    return db.transaction(
      "rw",
      [
        db.leases,
        db.leaseParticipants,
        db.recurringCharges,
        db.leaseConcessions,
        db.rentObligations,
        db.paymentAllocations,
        db.units,
      ],
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
          input.participantIds.map((tenantId, index) => ({
            leaseId: leaseId as number,
            tenantId,
            primary: index === 0,
            sortOrder: index,
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

        const existingConcessions = input.id
          ? await db.leaseConcessions.where("leaseId").equals(leaseId as number).toArray()
          : [];
        const retainedIds = new Set(input.concessions.flatMap((item) => item.id ? [item.id] : []));
        for (const existing of existingConcessions) {
          if (existing.id && !retainedIds.has(existing.id)) {
            const affected = await db.rentObligations.where("leaseId").equals(leaseId as number).filter(
              (obligation) => obligation.rentPeriod >= existing.startPeriod && obligation.rentPeriod <= existing.endPeriod,
            ).toArray();
            const settled = await Promise.all(affected.map(async (obligation) => obligation.id
              ? (await db.paymentAllocations.where("obligationId").equals(obligation.id).count()) > 0
              : false));
            if (settled.some(Boolean)) throw new Error("This concession cannot be deleted because it affects a period with allocated payments.");
            await db.leaseConcessions.delete(existing.id);
          }
        }
        for (const concession of input.concessions) {
          if (concession.id) {
            const original = existingConcessions.find((item) => item.id === concession.id);
            if (!original) throw new Error("An existing concession could not be found.");
            if (original.amount !== concession.amount || original.startPeriod !== concession.startPeriod || original.endPeriod !== concession.endPeriod) {
              throw new Error("A recorded concession's amount and effective period cannot be changed.");
            }
            await db.leaseConcessions.update(concession.id, {
              description: concession.description.trim() || "Lease concession",
              comment: concession.comment?.trim() ?? "",
            });
          } else {
            await db.leaseConcessions.add({
              leaseId: leaseId as number,
              description: concession.description.trim() || "Lease concession",
              amount: concession.amount,
              startPeriod: concession.startPeriod,
              endPeriod: concession.endPeriod,
              comment: concession.comment?.trim() ?? "",
            } satisfies LeaseConcession);
          }
        }

        await this.reconcileObligations(
          leaseId as number,
          input.startDate,
          effectiveEnd,
          input.charges,
          input.concessions,
        );
        await this.refreshUnitOccupancy(input.unitId);
        return leaseId;
      },
    );
  }

  private async reconcileObligations(
    leaseId: number,
    startDate: string,
    endDate: string,
    charges: LeaseChargeInput[],
    concessions: LeaseConcessionInput[],
  ): Promise<void> {
    const startPeriod = startDate.slice(0, 7);
    const endPeriod = endDate ? endDate.slice(0, 7) : "9999-12";
    const obligations = await db.rentObligations.where("leaseId").equals(leaseId).toArray();
    const obligationIds = obligations.flatMap((obligation) => obligation.id === undefined ? [] : [obligation.id]);
    const allocations = obligationIds.length > 0
      ? await db.paymentAllocations.where("obligationId").anyOf(obligationIds).toArray()
      : [];
    const monthlyCharges = charges.reduce((total, charge) => total + Math.max(charge.amount, 0), 0);

    for (const obligation of obligations) {
      if (obligation.id === undefined) continue;
      const paid = allocations
        .filter((allocation) => allocation.obligationId === obligation.id)
        .reduce((total, allocation) => total + allocation.amount, 0);
      const inLeaseTerm = obligation.rentPeriod >= startPeriod && obligation.rentPeriod <= endPeriod;

      if (!inLeaseTerm) {
        if (paid > 0.005) {
          throw new Error(
            `The lease dates cannot exclude ${obligation.rentPeriod} because a payment is allocated to that period.`,
          );
        }
        await db.rentObligations.delete(obligation.id);
        continue;
      }

      const concessionTotal = concessions
        .filter((concession) => concession.startPeriod <= obligation.rentPeriod && concession.endPeriod >= obligation.rentPeriod)
        .reduce((total, concession) => total + concession.amount, 0);
      const expectedAmount = Math.max(monthlyCharges - concessionTotal, 0);
      if (paid > expectedAmount + 0.005) {
        throw new Error(
          `The revised charges and concessions would reduce ${obligation.rentPeriod} below its allocated payment amount.`,
        );
      }
      if (expectedAmount <= 0.005 && paid <= 0.005) {
        await db.rentObligations.delete(obligation.id);
        continue;
      }
      const status = paid <= 0.005
        ? "Unpaid"
        : paid < expectedAmount - 0.005
          ? "Partially Paid"
          : paid <= expectedAmount + 0.005
            ? "Paid"
            : "Overpaid";
      await db.rentObligations.update(obligation.id, { expectedAmount, status });
    }
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
    const today = applicationClock.today();
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
