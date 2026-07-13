import type { LeaseRow, LocationSummary, TenantRow, UnitRow } from "../models/domain";

export const locations: LocationSummary[] = [
  { street: "Edouard-Charles", addresses: "383, 385, 387, 389", apartments: 25, occupied: 23 },
  { street: "Jeanne Mance", addresses: "5213, 5215, 5217, 5219, 5221, 5223", apartments: 10, occupied: 9 },
  { street: "Clermont", addresses: "116, 118, 120, 122, 124, 126", apartments: 6, occupied: 6 },
];

const definitions = [
  ["Edouard-Charles", "383", ["1","2","3","4"]],
  ["Edouard-Charles", "385", ["5","6","7","8","9","10","11"]],
  ["Edouard-Charles", "387", ["1","2","3","4","5","6"]],
  ["Edouard-Charles", "389", ["1","2","3","4","5","6","7","8"]],
  ["Jeanne Mance", "5213", ["A","B"]],
  ["Jeanne Mance", "5215", ["A","B"]],
  ["Jeanne Mance", "5217", [""]],
  ["Jeanne Mance", "5219", [""]],
  ["Jeanne Mance", "5221", ["A","B"]],
  ["Jeanne Mance", "5223", ["A","B"]],
  ["Clermont", "116", [""]],
  ["Clermont", "118", [""]],
  ["Clermont", "120", [""]],
  ["Clermont", "122", [""]],
  ["Clermont", "124", [""]],
  ["Clermont", "126", [""]],
] as const;

export const units: UnitRow[] = definitions.flatMap(([street, civicAddress, apartments]) =>
  apartments.map((apartmentNumber, index) => {
    const sequence = Number(civicAddress) + index;
    const vacant =
      (street === "Edouard-Charles" && civicAddress === "389" && ["7","8"].includes(apartmentNumber)) ||
      (street === "Jeanne Mance" && civicAddress === "5223" && apartmentNumber === "B");

    return {
      street,
      civicAddress,
      apartmentNumber,
      bedrooms: sequence % 4 === 0 ? 3 : sequence % 3 === 0 ? 1 : 2,
      bathrooms: sequence % 5 === 0 ? 1.5 : 1,
      monthlyRent: 850 + ((sequence * 25) % 800),
      status: vacant ? "Vacant" : "Occupied",
    };
  }),
);

const names = [
  "Marie Tremblay","Jean Lavoie","Sophie Gagnon","Luc Roy","Camille Bouchard","Marc Morin",
  "Julie Fortin","Daniel Cote","Nathalie Ouellet","Andre Pelletier","Isabelle Gauthier",
  "Robert Belanger","Chloe Levesque","Olivier Bergeron","Louise Leblanc","Patrick Girard",
  "Amelie Simard","Francois Caron","Mireille Beaulieu","Etienne Poirier","Claire Fournier",
  "Michel Lapointe","Anne Rousseau","Louis Desjardins","Caroline Hebert","Pierre Bernier",
  "Genevieve Paquette","Paul Boucher","Monique Cloutier","Alexandre Gagne","Diane Morin",
  "Gabriel Roy","Sylvie Tremblay","Hugo Lavoie","Valerie Fortin","Martin Cote","Emma Bouchard",
  "Benoit Gauthier","Noemie Ouellet","Thomas Bergeron","Audrey Leblanc","Denis Girard",
  "Helene Simard","Mathieu Caron","Celine Beaulieu"
];

const occupiedUnits = units.filter((unit) => unit.status === "Occupied");
const multiLeaseIndexes = new Set([2, 7, 13, 20, 28]);

export const tenants: TenantRow[] = [];
export const leases: LeaseRow[] = [];
let nameIndex = 0;

occupiedUnits.forEach((unit, leaseIndex) => {
  const participantCount = multiLeaseIndexes.has(leaseIndex)
    ? ([7,20].includes(leaseIndex) ? 3 : 2)
    : 1;
  const leaseholders: string[] = [];

  for (let participantIndex = 0; participantIndex < participantCount; participantIndex += 1) {
    const name = names[nameIndex % names.length] ?? `Tenant ${nameIndex + 1}`;
    nameIndex += 1;
    leaseholders.push(name);
    const slug = name.toLowerCase().replaceAll(" ", ".");

    tenants.push({
      name,
      apartment: `${unit.civicAddress}${unit.apartmentNumber ? ` ${unit.apartmentNumber}` : ""} ${unit.street}`,
      primary: participantIndex === 0,
      phone: `514-555-${String(1000 + nameIndex).slice(-4)}`,
      email: `${slug}${nameIndex}@example.ca`,
      active: true,
    });
  }

  leases.push({
    leaseholders,
    street: unit.street,
    apartment: `${unit.civicAddress}${unit.apartmentNumber ? ` ${unit.apartmentNumber}` : ""}`,
    startDate: `2025-${String((leaseIndex % 12) + 1).padStart(2, "0")}-01`,
    endDate: `2026-${String((leaseIndex % 12) + 1).padStart(2, "0")}-28`,
    monthlyRent: unit.monthlyRent,
    status: "Active",
  });
});
