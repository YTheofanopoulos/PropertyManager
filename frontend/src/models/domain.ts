
export type EntityId = number;

export interface Location {
  id?: EntityId;
  name: string;
  city: string;
}

export interface Building {
  id?: EntityId;
  locationId: EntityId;
  civicAddress: string;
}

export type UnitStatus = "Occupied" | "Vacant" | "Maintenance";

export interface Unit {
  id?: EntityId;
  buildingId: EntityId;
  apartmentNumber: string;
  bedrooms: number;
  bathrooms: number;
  monthlyRent: number;
  status: UnitStatus;
  active?: boolean;
}

export interface Tenant {
  id?: EntityId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  active: boolean;
}

export type LeaseStatus = "Active" | "Expired" | "Future" | "Terminated";
export type LeaseTermType = "Fixed" | "Month-to-Month";

export interface Lease {
  id?: EntityId;
  unitId: EntityId;
  startDate: string;
  endDate: string;
  termType?: LeaseTermType;
  status: LeaseStatus;
  notes?: string;
}

export interface LeaseParticipant {
  id?: EntityId;
  leaseId: EntityId;
  tenantId: EntityId;
  primary: boolean;
  sortOrder?: number;
}

export type ChargeType = "Apartment Rent" | "Parking" | "Storage" | "Other";
export type ChargeFrequency = "Monthly" | "One-Time";

export interface RecurringCharge {
  id?: EntityId;
  leaseId: EntityId;
  chargeType: ChargeType;
  description: string;
  amount: number;
  frequency: ChargeFrequency;
  startDate: string;
  endDate: string;
}

export interface UnitListItem extends Unit {
  street: string;
  civicAddress: string;
  effectiveRent: number;
  rentSource: "Active Lease" | "Market Rent";
}

export interface TenantListItem extends Tenant {
  apartments: string[];
  primaryLeaseCount: number;
}

export interface LeaseListItem extends Lease {
  street: string;
  apartment: string;
  leaseholders: string[];
  monthlyTotal: number;
}


export type RentPeriodStatus = "Unpaid" | "Partially Paid" | "Paid" | "Overpaid";
export type PaymentSource = "Manual" | "Bank Import";
export type PaymentStatus = "Posted" | "Voided";
export type PaymentMethod = "Electronic Transfer" | "Cheque" | "Cash" | "Direct Deposit" | "Other";
export interface RentObligation { id?: EntityId; leaseId: EntityId; rentPeriod: string; expectedAmount: number; status: RentPeriodStatus; createdAt: string; }
export interface Payment { id?: EntityId; leaseId: EntityId; tenantId?: EntityId; receivedDate: string; amount: number; paymentMethod: PaymentMethod; reference: string; notes: string; source: PaymentSource; status?: PaymentStatus; voidedAt?: string; voidReason?: string; createdAt: string; }
export interface PaymentAllocation { id?: EntityId; paymentId: EntityId; obligationId: EntityId; amount: number; }
export interface RentRollRow { leaseId: EntityId; unitLabel: string; primaryTenant: string; selectedPeriod: string; currentMonthDue: number; currentMonthPaid: number; priorBalance: number; totalOutstanding: number; oldestUnpaidPeriod: string; monthsInArrears: number; status: "Current" | "Partial" | "In Arrears"; }


export type BankImportStatus = "Previewed" | "Imported";
export type BankTransactionStatus =
  | "Unmatched"
  | "Suggested"
  | "Reconciled"
  | "Ignored"
  | "Duplicate";

export interface BankImportBatch {
  id?: EntityId;
  filename: string;
  importedAt: string;
  accountLastFour: string;
  currency: string;
  statementStart: string;
  statementEnd: string;
  transactionCount: number;
  totalCredits: number;
  totalDebits: number;
  newTransactionCount: number;
  duplicateCount: number;
  status: BankImportStatus;
}

export interface BankTransaction {
  id?: EntityId;
  importBatchId: EntityId;
  externalId: string;
  accountLastFour: string;
  postedDate: string;
  amount: number;
  transactionType: string;
  name: string;
  memo: string;
  status: BankTransactionStatus;
  matchedPaymentId?: EntityId;
  ignoredReason?: string;
  createdAt: string;
}

export interface ParsedQfxStatement {
  accountLastFour: string;
  currency: string;
  statementStart: string;
  statementEnd: string;
  transactions: Array<{
    externalId: string;
    postedDate: string;
    amount: number;
    transactionType: string;
    name: string;
    memo: string;
  }>;
}


export interface ReconciliationHistory {
  id?: EntityId;
  bankTransactionId: EntityId;
  paymentId: EntityId;
  leaseId: EntityId;
  amount: number;
  postedDate: string;
  postedDay: number;
  normalizedName: string;
  normalizedMemo: string;
  createdAt: string;
}

export type MatchClassification =
  | "Strong Candidate"
  | "Good Candidate"
  | "Possible Match"
  | "Ambiguous"
  | "Manual Review";
