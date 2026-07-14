
import { db } from "./database";
import type {
  Building,
  Lease,
  LeaseParticipant,
  Location,
  RecurringCharge,
  Tenant,
  Unit,
} from "../models/domain";

interface SeedUnit {
  street: string;
  address: string;
  apartment: string;
  bedrooms: number;
  bathrooms: number;
  marketRent: number;
  occupied: boolean;
}

const units: SeedUnit[] = [
  { street: "Clermont", address: "116", apartment: "", bedrooms: 2, bathrooms: 1.0, marketRent: 1125, occupied: false },
  { street: "Clermont", address: "118", apartment: "", bedrooms: 2, bathrooms: 2.0, marketRent: 1175, occupied: true },
  { street: "Clermont", address: "120", apartment: "", bedrooms: 3, bathrooms: 1.5, marketRent: 875, occupied: true },
  { street: "Clermont", address: "122", apartment: "", bedrooms: 3, bathrooms: 1.0, marketRent: 1650, occupied: true },
  { street: "Clermont", address: "124", apartment: "", bedrooms: 2, bathrooms: 2.0, marketRent: 1075, occupied: true },
  { street: "Clermont", address: "126", apartment: "", bedrooms: 2, bathrooms: 1.0, marketRent: 1225, occupied: true },
  { street: "Edouard-Charles", address: "383", apartment: "1", bedrooms: 2, bathrooms: 1.0, marketRent: 1300, occupied: true },
  { street: "Edouard-Charles", address: "383", apartment: "2", bedrooms: 2, bathrooms: 1.5, marketRent: 1375, occupied: true },
  { street: "Edouard-Charles", address: "383", apartment: "3", bedrooms: 2, bathrooms: 1.0, marketRent: 1625, occupied: true },
  { street: "Edouard-Charles", address: "383", apartment: "4", bedrooms: 2, bathrooms: 1.0, marketRent: 1025, occupied: false },
  { street: "Edouard-Charles", address: "385", apartment: "5", bedrooms: 2, bathrooms: 2.0, marketRent: 975, occupied: true },
  { street: "Edouard-Charles", address: "385", apartment: "6", bedrooms: 2, bathrooms: 1.5, marketRent: 900, occupied: true },
  { street: "Edouard-Charles", address: "385", apartment: "7", bedrooms: 2, bathrooms: 1.5, marketRent: 1325, occupied: true },
  { street: "Edouard-Charles", address: "385", apartment: "8", bedrooms: 2, bathrooms: 2.0, marketRent: 1625, occupied: true },
  { street: "Edouard-Charles", address: "385", apartment: "9", bedrooms: 2, bathrooms: 1.0, marketRent: 1150, occupied: true },
  { street: "Edouard-Charles", address: "385", apartment: "10", bedrooms: 3, bathrooms: 1.5, marketRent: 1275, occupied: true },
  { street: "Edouard-Charles", address: "385", apartment: "11", bedrooms: 2, bathrooms: 1.5, marketRent: 1600, occupied: true },
  { street: "Edouard-Charles", address: "387", apartment: "1", bedrooms: 3, bathrooms: 1.5, marketRent: 1275, occupied: false },
  { street: "Edouard-Charles", address: "387", apartment: "2", bedrooms: 2, bathrooms: 2.0, marketRent: 1475, occupied: true },
  { street: "Edouard-Charles", address: "387", apartment: "3", bedrooms: 3, bathrooms: 1.5, marketRent: 1350, occupied: true },
  { street: "Edouard-Charles", address: "387", apartment: "4", bedrooms: 2, bathrooms: 1.5, marketRent: 1425, occupied: true },
  { street: "Edouard-Charles", address: "387", apartment: "5", bedrooms: 1, bathrooms: 2.0, marketRent: 1300, occupied: true },
  { street: "Edouard-Charles", address: "387", apartment: "6", bedrooms: 2, bathrooms: 1.0, marketRent: 1225, occupied: true },
  { street: "Edouard-Charles", address: "389", apartment: "1", bedrooms: 3, bathrooms: 2.0, marketRent: 1250, occupied: true },
  { street: "Edouard-Charles", address: "389", apartment: "2", bedrooms: 1, bathrooms: 1.0, marketRent: 1075, occupied: true },
  { street: "Edouard-Charles", address: "389", apartment: "3", bedrooms: 3, bathrooms: 2.0, marketRent: 1575, occupied: true },
  { street: "Edouard-Charles", address: "389", apartment: "4", bedrooms: 1, bathrooms: 1.5, marketRent: 900, occupied: true },
  { street: "Edouard-Charles", address: "389", apartment: "5", bedrooms: 2, bathrooms: 1.0, marketRent: 900, occupied: true },
  { street: "Edouard-Charles", address: "389", apartment: "6", bedrooms: 1, bathrooms: 1.0, marketRent: 975, occupied: true },
  { street: "Edouard-Charles", address: "389", apartment: "7", bedrooms: 2, bathrooms: 1.0, marketRent: 1050, occupied: true },
  { street: "Edouard-Charles", address: "389", apartment: "8", bedrooms: 2, bathrooms: 2.0, marketRent: 1450, occupied: true },
  { street: "Jeanne Mance", address: "5213", apartment: "A", bedrooms: 3, bathrooms: 2.0, marketRent: 1325, occupied: true },
  { street: "Jeanne Mance", address: "5213", apartment: "B", bedrooms: 1, bathrooms: 1.5, marketRent: 1475, occupied: true },
  { street: "Jeanne Mance", address: "5215", apartment: "A", bedrooms: 2, bathrooms: 1.0, marketRent: 1200, occupied: true },
  { street: "Jeanne Mance", address: "5215", apartment: "B", bedrooms: 1, bathrooms: 1.0, marketRent: 1175, occupied: true },
  { street: "Jeanne Mance", address: "5217", apartment: "", bedrooms: 2, bathrooms: 2.0, marketRent: 975, occupied: true },
  { street: "Jeanne Mance", address: "5219", apartment: "", bedrooms: 2, bathrooms: 2.0, marketRent: 1325, occupied: true },
  { street: "Jeanne Mance", address: "5221", apartment: "A", bedrooms: 3, bathrooms: 2.0, marketRent: 900, occupied: true },
  { street: "Jeanne Mance", address: "5221", apartment: "B", bedrooms: 3, bathrooms: 1.0, marketRent: 1425, occupied: true },
  { street: "Jeanne Mance", address: "5223", apartment: "A", bedrooms: 2, bathrooms: 1.0, marketRent: 1025, occupied: true },
  { street: "Jeanne Mance", address: "5223", apartment: "B", bedrooms: 2, bathrooms: 1.0, marketRent: 1175, occupied: true }
];

const firstNames = ['Marie', 'Jean', 'Sophie', 'Luc', 'Camille', 'Marc', 'Julie', 'Daniel', 'Nathalie', 'Andre', 'Isabelle', 'Robert', 'Chloe', 'Olivier', 'Louise', 'Patrick', 'Amelie', 'Francois', 'Mireille', 'Etienne', 'Claire', 'Michel', 'Anne', 'Louis', 'Caroline', 'Pierre', 'Genevieve', 'Paul', 'Monique', 'Alexandre', 'Diane', 'Gabriel', 'Sylvie', 'Hugo', 'Valerie', 'Martin', 'Emma', 'Benoit', 'Noemie', 'Thomas', 'Audrey', 'Denis', 'Helene', 'Mathieu', 'Celine', 'Rene', 'Josiane', 'Samuel', 'Elise', 'Victor', 'Manon', 'Philippe', 'Ariane', 'Simon', 'Madeleine', 'Antoine'].map(String);
const lastNames = ['Tremblay', 'Gagnon', 'Roy', 'Cote', 'Bouchard', 'Gauthier', 'Morin', 'Lavoie', 'Fortin', 'Gagne', 'Ouellet', 'Pelletier', 'Belanger', 'Levesque', 'Bergeron', 'Leblanc', 'Paquette', 'Girard', 'Simard', 'Boucher', 'Caron', 'Beaulieu', 'Cloutier', 'Poirier', 'Fournier', 'Lapointe', 'Rousseau', 'Desjardins', 'Hebert', 'Bernier'].map(String);

const twoTenantUnits = new Set([2, 5, 9, 13, 18, 24, 29, 33]);
const threeTenantUnits = new Set([7, 21, 36]);

function participantCount(index: number): number {
  if (threeTenantUnits.has(index)) return 3;
  if (twoTenantUnits.has(index)) return 2;
  return 1;
}

export async function seedDatabase(force = false): Promise<void> {
  if ((await db.locations.count()) > 0 && !force) return;

  await db.transaction(
    "rw",
    [
      db.locations,
      db.buildings,
      db.units,
      db.tenants,
      db.leases,
      db.leaseParticipants,
      db.recurringCharges,
      db.rentObligations,
      db.payments,
      db.paymentAllocations,
      db.bankImportBatches,
      db.bankTransactions,
    ],
    async () => {
      await Promise.all([
        db.locations.clear(),
        db.buildings.clear(),
        db.units.clear(),
        db.tenants.clear(),
        db.leases.clear(),
        db.leaseParticipants.clear(),
        db.recurringCharges.clear(),
        db.rentObligations.clear(),
        db.payments.clear(),
        db.paymentAllocations.clear(),
        db.bankImportBatches.clear(),
        db.bankTransactions.clear(),
      ]);

      const locationIds = new Map<string, number>();
      const buildingIds = new Map<string, number>();
      let tenantSequence = 0;
      let occupiedIndex = 0;

      for (const seedUnit of units) {
        let locationId = locationIds.get(seedUnit.street);
        if (!locationId) {
          locationId = Number(
            await db.locations.add({
              name: seedUnit.street,
              city: "Montréal",
            } satisfies Location),
          );
          locationIds.set(seedUnit.street, locationId);
        }

        const buildingKey = `${seedUnit.street}|${seedUnit.address}`;
        let buildingId = buildingIds.get(buildingKey);
        if (!buildingId) {
          buildingId = Number(
            await db.buildings.add({
              locationId,
              civicAddress: seedUnit.address,
            } satisfies Building),
          );
          buildingIds.set(buildingKey, buildingId);
        }

        const unitId = Number(
          await db.units.add({
            buildingId,
            apartmentNumber: seedUnit.apartment,
            bedrooms: seedUnit.bedrooms,
            bathrooms: seedUnit.bathrooms,
            monthlyRent: seedUnit.marketRent,
            status: seedUnit.occupied ? "Occupied" : "Vacant",
            active: true,
          } satisfies Unit),
        );

        if (!seedUnit.occupied) continue;

        occupiedIndex += 1;
        const startDate = "2026-07-01";
        const endDate = "2027-06-30";

        const leaseId = Number(
          await db.leases.add({
            unitId,
            startDate,
            endDate,
            termType: "Fixed",
            status: "Active",
            notes: "Baseline 5.2 realistic test lease",
          } satisfies Lease),
        );

        await db.recurringCharges.add({
          leaseId,
          chargeType: "Apartment Rent",
          description: "Monthly apartment rent",
          amount: seedUnit.marketRent,
          frequency: "Monthly",
          startDate,
          endDate,
        } satisfies RecurringCharge);

        for (let i = 0; i < participantCount(occupiedIndex); i += 1) {
          const firstName =
            firstNames[tenantSequence % firstNames.length] ?? "Tenant";
          const lastName =
            lastNames[(tenantSequence * 5) % lastNames.length] ?? "Resident";
          tenantSequence += 1;

          const tenantId = Number(
            await db.tenants.add({
              firstName,
              lastName,
              email:
                `${firstName}.${lastName}.${tenantSequence}@example.ca`.toLowerCase(),
              phone: `514-555-${String(1000 + tenantSequence).slice(-4)}`,
              active: true,
            } satisfies Tenant),
          );

          await db.leaseParticipants.add({
            leaseId,
            tenantId,
            primary: i === 0,
            sortOrder: i,
          } satisfies LeaseParticipant);
        }
      }
    },
  );
}
