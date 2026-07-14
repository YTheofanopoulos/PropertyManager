
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
