
import Dexie, { type EntityTable } from "dexie";
import type {
  Building,
  Lease,
  LeaseParticipant,
  LeaseConcession,
  Location,
  RecurringCharge,
  RentObligation,
  Payment,
  PaymentAllocation,
  BankImportBatch,
  BankTransaction,
  ReconciliationHistory,
  Tenant,
  Unit,
} from "../models/domain";

export class PropertyManagerDatabase extends Dexie {
  locations!: EntityTable<Location, "id">;
  buildings!: EntityTable<Building, "id">;
  units!: EntityTable<Unit, "id">;
  tenants!: EntityTable<Tenant, "id">;
  leases!: EntityTable<Lease, "id">;
  leaseParticipants!: EntityTable<LeaseParticipant, "id">;
  recurringCharges!: EntityTable<RecurringCharge, "id">;
  leaseConcessions!: EntityTable<LeaseConcession, "id">;
  rentObligations!: EntityTable<RentObligation, "id">;
  payments!: EntityTable<Payment, "id">;
  paymentAllocations!: EntityTable<PaymentAllocation, "id">;
  bankImportBatches!: EntityTable<BankImportBatch, "id">;
  bankTransactions!: EntityTable<BankTransaction, "id">;
  reconciliationHistory!: EntityTable<ReconciliationHistory, "id">;

  constructor() {
    super("PropertyManager");

    this.version(1).stores({
      locations: "++id, name, city",
      buildings: "++id, locationId, civicAddress, [locationId+civicAddress]",
      units: "++id, buildingId, apartmentNumber, status, [buildingId+apartmentNumber]",
      tenants: "++id, lastName, firstName, email, active",
      leases: "++id, unitId, startDate, endDate, status",
      leaseParticipants: "++id, leaseId, tenantId, primary, [leaseId+tenantId]",
    });

    this.version(2).stores({
      locations: "++id, name, city",
      buildings: "++id, locationId, civicAddress, [locationId+civicAddress]",
      units: "++id, buildingId, apartmentNumber, status, active, [buildingId+apartmentNumber]",
      tenants: "++id, lastName, firstName, email, active",
      leases: "++id, unitId, startDate, endDate, termType, status",
      leaseParticipants: "++id, leaseId, tenantId, primary, [leaseId+tenantId]",
      recurringCharges: "++id, leaseId, chargeType, frequency, startDate, endDate",
    }).upgrade(async (transaction) => {
      await transaction.table("units").toCollection().modify((unit) => {
        if (unit.active === undefined) unit.active = true;
      });

      await transaction.table("leases").toCollection().modify((lease) => {
        if (!lease.termType) lease.termType = "Fixed";
        if (!lease.notes) lease.notes = "";
      });
    });

    this.version(3).stores({
      locations: "++id, name, city",
      buildings: "++id, locationId, civicAddress, [locationId+civicAddress]",
      units: "++id, buildingId, apartmentNumber, status, active, [buildingId+apartmentNumber]",
      tenants: "++id, lastName, firstName, email, active",
      leases: "++id, unitId, startDate, endDate, termType, status",
      leaseParticipants: "++id, leaseId, tenantId, primary, sortOrder, [leaseId+tenantId]",
      recurringCharges: "++id, leaseId, chargeType, frequency, startDate, endDate",
    }).upgrade(async (transaction) => {
      const participants = await transaction.table("leaseParticipants").toArray();
      const byLease = new Map<number, typeof participants>();

      participants.forEach((participant) => {
        const list = byLease.get(participant.leaseId) ?? [];
        list.push(participant);
        byLease.set(participant.leaseId, list);
      });

      for (const list of byLease.values()) {
        list
          .sort((left, right) =>
            Number(right.primary) - Number(left.primary) ||
            Number(left.id ?? 0) - Number(right.id ?? 0),
          )
          .forEach((participant, index) => {
            participant.sortOrder = index;
          });
      }

      await transaction.table("leaseParticipants").bulkPut(participants);
    });

    this.version(4).stores({
      locations: "++id, name, city",
      buildings: "++id, locationId, civicAddress, [locationId+civicAddress]",
      units: "++id, buildingId, apartmentNumber, status, active, [buildingId+apartmentNumber]",
      tenants: "++id, lastName, firstName, email, active",
      leases: "++id, unitId, startDate, endDate, termType, status",
      leaseParticipants: "++id, leaseId, tenantId, primary, sortOrder, [leaseId+tenantId]",
      recurringCharges: "++id, leaseId, chargeType, frequency, startDate, endDate",
      rentObligations: "++id, leaseId, rentPeriod, status, [leaseId+rentPeriod]",
      payments: "++id, leaseId, tenantId, receivedDate, source, reference",
      paymentAllocations: "++id, paymentId, obligationId, [paymentId+obligationId]",
    });


    this.version(5).stores({
      locations: "++id, name, city",
      buildings: "++id, locationId, civicAddress, [locationId+civicAddress]",
      units: "++id, buildingId, apartmentNumber, status, active, [buildingId+apartmentNumber]",
      tenants: "++id, lastName, firstName, email, active",
      leases: "++id, unitId, startDate, endDate, termType, status",
      leaseParticipants: "++id, leaseId, tenantId, primary, order, [leaseId+tenantId]",
      recurringCharges: "++id, leaseId, chargeType, frequency, startDate, endDate",
      rentObligations: "++id, leaseId, rentPeriod, status, [leaseId+rentPeriod]",
      payments: "++id, leaseId, tenantId, receivedDate, source, reference, status",
      paymentAllocations: "++id, paymentId, obligationId, [paymentId+obligationId]",
    }).upgrade(async (transaction) => {
      await transaction.table("payments").toCollection().modify((payment) => {
        if (!payment.status) payment.status = "Posted";
      });
    });

    this.version(6).stores({
      locations: "++id, name, city",
      buildings: "++id, locationId, civicAddress, [locationId+civicAddress]",
      units: "++id, buildingId, apartmentNumber, status, active, [buildingId+apartmentNumber]",
      tenants: "++id, lastName, firstName, email, active",
      leases: "++id, unitId, startDate, endDate, termType, status",
      leaseParticipants: "++id, leaseId, tenantId, primary, sortOrder, [leaseId+tenantId]",
      recurringCharges: "++id, leaseId, chargeType, frequency, startDate, endDate",
      rentObligations: "++id, leaseId, rentPeriod, status, [leaseId+rentPeriod]",
      payments: "++id, leaseId, tenantId, receivedDate, source, reference, status",
      paymentAllocations: "++id, paymentId, obligationId, [paymentId+obligationId]",
      bankImportBatches: "++id, importedAt, accountLastFour, statementStart, statementEnd, status",
      bankTransactions: "++id, importBatchId, externalId, accountLastFour, postedDate, amount, status, matchedPaymentId, [accountLastFour+externalId]",
    });

    this.version(7).stores({
      locations: "++id, name, city",
      buildings: "++id, locationId, civicAddress, [locationId+civicAddress]",
      units: "++id, buildingId, apartmentNumber, status, active, [buildingId+apartmentNumber]",
      tenants: "++id, lastName, firstName, email, active",
      leases: "++id, unitId, startDate, endDate, termType, status",
      leaseParticipants: "++id, leaseId, tenantId, primary, sortOrder, [leaseId+tenantId]",
      recurringCharges: "++id, leaseId, chargeType, frequency, startDate, endDate",
      rentObligations: "++id, leaseId, rentPeriod, status, [leaseId+rentPeriod]",
      payments: "++id, leaseId, tenantId, receivedDate, source, reference, status",
      paymentAllocations: "++id, paymentId, obligationId, [paymentId+obligationId]",
      bankImportBatches: "++id, importedAt, accountLastFour, statementStart, statementEnd, status",
      bankTransactions: "++id, importBatchId, externalId, accountLastFour, postedDate, amount, status, matchedPaymentId, [accountLastFour+externalId]",
      reconciliationHistory: "++id, bankTransactionId, paymentId, leaseId, amount, postedDate, normalizedName, normalizedMemo, [leaseId+amount]",
    });

    this.version(8).stores({
      locations: "++id, name, city",
      buildings: "++id, locationId, civicAddress, [locationId+civicAddress]",
      units: "++id, buildingId, apartmentNumber, status, active, [buildingId+apartmentNumber]",
      tenants: "++id, lastName, firstName, email, active",
      leases: "++id, unitId, startDate, endDate, termType, status",
      leaseParticipants: "++id, leaseId, tenantId, primary, sortOrder, [leaseId+tenantId]",
      recurringCharges: "++id, leaseId, chargeType, frequency, startDate, endDate",
      leaseConcessions: "++id, leaseId, startPeriod, endPeriod",
      rentObligations: "++id, leaseId, rentPeriod, status, [leaseId+rentPeriod]",
      payments: "++id, leaseId, tenantId, receivedDate, source, reference, status",
      paymentAllocations: "++id, paymentId, obligationId, [paymentId+obligationId]",
      bankImportBatches: "++id, importedAt, accountLastFour, statementStart, statementEnd, status",
      bankTransactions: "++id, importBatchId, externalId, accountLastFour, postedDate, amount, status, matchedPaymentId, [accountLastFour+externalId]",
      reconciliationHistory: "++id, bankTransactionId, paymentId, leaseId, amount, postedDate, normalizedName, normalizedMemo, [leaseId+amount]",
    });

    this.version(9).stores({
      locations: "++id, name, city",
      buildings: "++id, locationId, civicAddress, city, stateProvince, postalCode, [locationId+civicAddress]",
      units: "++id, buildingId, apartmentNumber, status, active, [buildingId+apartmentNumber]",
      tenants: "++id, lastName, firstName, email, active",
      leases: "++id, unitId, startDate, endDate, termType, status, renewalStatus",
      leaseParticipants: "++id, leaseId, tenantId, primary, sortOrder, [leaseId+tenantId]",
      recurringCharges: "++id, leaseId, chargeType, frequency, startDate, endDate",
      leaseConcessions: "++id, leaseId, startPeriod, endPeriod",
      rentObligations: "++id, leaseId, rentPeriod, status, [leaseId+rentPeriod]",
      payments: "++id, leaseId, tenantId, receivedDate, source, reference, status",
      paymentAllocations: "++id, paymentId, obligationId, [paymentId+obligationId]",
      bankImportBatches: "++id, importedAt, accountLastFour, statementStart, statementEnd, status",
      bankTransactions: "++id, importBatchId, externalId, accountLastFour, postedDate, amount, status, matchedPaymentId, [accountLastFour+externalId]",
      reconciliationHistory: "++id, bankTransactionId, paymentId, leaseId, amount, postedDate, normalizedName, normalizedMemo, [leaseId+amount]",
    }).upgrade(async (transaction) => {
      await transaction.table("buildings").toCollection().modify((building) => {
        if (building.city === undefined) building.city = "";
        if (building.stateProvince === undefined) building.stateProvince = "";
        if (building.postalCode === undefined) building.postalCode = "";
      });
      await transaction.table("leases").toCollection().modify((lease) => {
        if (!lease.renewalStatus) lease.renewalStatus = "Not Started";
        if (lease.renewalLetterSentDate === undefined) lease.renewalLetterSentDate = "";
        if (lease.renewalResponseDate === undefined) lease.renewalResponseDate = "";
        if (lease.renewalNotes === undefined) lease.renewalNotes = "";
      });
    });

  }
}

export const db = new PropertyManagerDatabase();
