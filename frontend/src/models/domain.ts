export interface LocationSummary {
  street: string;
  addresses: string;
  apartments: number;
  occupied: number;
}

export interface UnitRow {
  street: string;
  civicAddress: string;
  apartmentNumber: string;
  bedrooms: number;
  bathrooms: number;
  monthlyRent: number;
  status: "Occupied" | "Vacant";
}

export interface TenantRow {
  name: string;
  apartment: string;
  primary: boolean;
  phone: string;
  email: string;
  active: boolean;
}

export interface LeaseRow {
  leaseholders: string[];
  street: string;
  apartment: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: "Active" | "Expired";
}
