
export type EntityId = number;
export interface Location { id?: EntityId; name: string; city: string; }
export interface Building { id?: EntityId; locationId: EntityId; civicAddress: string; }
export type UnitStatus = "Occupied" | "Vacant" | "Maintenance";
export interface Unit { id?: EntityId; buildingId: EntityId; apartmentNumber: string; bedrooms: number; bathrooms: number; monthlyRent: number; status: UnitStatus; }
export interface Tenant { id?: EntityId; firstName: string; lastName: string; email: string; phone: string; active: boolean; }
export type LeaseStatus = "Active" | "Expired" | "Future";
export interface Lease { id?: EntityId; unitId: EntityId; startDate: string; endDate: string; monthlyRent: number; status: LeaseStatus; }
export interface LeaseParticipant { id?: EntityId; leaseId: EntityId; tenantId: EntityId; primary: boolean; }
export interface UnitListItem extends Unit { street: string; civicAddress: string; }
export interface TenantListItem extends Tenant { apartments: string[]; primaryLeaseCount: number; }
export interface LeaseListItem extends Lease { street: string; apartment: string; leaseholders: string[]; }
