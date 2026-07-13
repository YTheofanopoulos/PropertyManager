
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

const portfolio = [
  { name: "Edouard-Charles", buildings: [
    { address: "383", apartments: ["1", "2", "3", "4"] },
    { address: "385", apartments: ["5", "6", "7", "8", "9", "10", "11"] },
    { address: "387", apartments: ["1", "2", "3", "4", "5", "6"] },
    { address: "389", apartments: ["1", "2", "3", "4", "5", "6", "7", "8"] },
  ]},
  { name: "Jeanne Mance", buildings: [
    { address: "5213", apartments: ["A", "B"] },
    { address: "5215", apartments: ["A", "B"] },
    { address: "5217", apartments: [""] },
    { address: "5219", apartments: [""] },
    { address: "5221", apartments: ["A", "B"] },
    { address: "5223", apartments: ["A", "B"] },
  ]},
  { name: "Clermont", buildings: [
    { address: "116", apartments: [""] },
    { address: "118", apartments: [""] },
    { address: "120", apartments: [""] },
    { address: "122", apartments: [""] },
    { address: "124", apartments: [""] },
    { address: "126", apartments: [""] },
  ]},
] as const;

const first = ["Marie","Jean","Sophie","Luc","Camille","Marc","Julie","Daniel","Nathalie","Andre","Isabelle","Robert","Chloe","Olivier","Louise","Patrick","Amelie","Francois","Mireille","Etienne","Claire","Michel","Anne","Louis","Caroline","Pierre","Genevieve","Paul","Monique","Alexandre","Diane","Gabriel","Sylvie","Hugo","Valerie","Martin","Emma","Benoit","Noemie","Thomas","Audrey","Denis","Helene","Mathieu","Celine"];
const last = ["Tremblay","Gagnon","Roy","Cote","Bouchard","Gauthier","Morin","Lavoie","Fortin","Gagne","Ouellet","Pelletier","Belanger","Levesque","Bergeron","Leblanc","Paquette","Girard","Simard","Boucher","Caron","Beaulieu","Cloutier","Poirier","Fournier","Lapointe","Rousseau","Desjardins","Hebert","Bernier"];

function addMonths(dateText: string, months: number): string {
  const date = new Date(`${dateText}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
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
      ]);

      let unitSeq = 0;
      let tenantSeq = 0;

      for (const location of portfolio) {
        const locationId = Number(await db.locations.add({
          name: location.name,
          city: "Montréal",
        } satisfies Location));

        for (const building of location.buildings) {
          const buildingId = Number(await db.buildings.add({
            locationId,
            civicAddress: building.address,
          } satisfies Building));

          for (const apartmentNumber of building.apartments) {
            unitSeq += 1;
            const occupied = unitSeq <= 38;
            const monthlyRent = 850 + ((unitSeq * 75) % 825);

            const unitId = Number(await db.units.add({
              buildingId,
              apartmentNumber,
              bedrooms: unitSeq % 4 === 0 ? 3 : unitSeq % 3 === 0 ? 1 : 2,
              bathrooms: unitSeq % 5 === 0 ? 1.5 : 1,
              monthlyRent,
              status: occupied ? "Occupied" : "Vacant",
              active: true,
            } satisfies Unit));

            if (!occupied) continue;

            const startDate = `2025-${String((unitSeq % 12) + 1).padStart(2, "0")}-01`;
            const leaseId = Number(await db.leases.add({
              unitId,
              startDate,
              endDate: addMonths(startDate, 12),
              termType: "Fixed",
              status: "Active",
              notes: "",
            } satisfies Lease));

            await db.recurringCharges.add({
              leaseId,
              chargeType: "Apartment Rent",
              description: "Monthly apartment rent",
              amount: monthlyRent,
              frequency: "Monthly",
              startDate,
              endDate: addMonths(startDate, 12),
            } satisfies RecurringCharge);

            const participantCount = [3, 8, 14, 21, 29].includes(unitSeq)
              ? [8, 21].includes(unitSeq) ? 3 : 2
              : 1;

            for (let index = 0; index < participantCount; index += 1) {
              const firstName = first[tenantSeq % first.length] ?? "Tenant";
              const lastName = last[(tenantSeq * 3) % last.length] ?? "Resident";
              tenantSeq += 1;

              const tenantId = Number(await db.tenants.add({
                firstName,
                lastName,
                email: `${firstName}.${lastName}${tenantSeq}@example.ca`.toLowerCase(),
                phone: `514-555-${String(1000 + tenantSeq).slice(-4)}`,
                active: true,
              } satisfies Tenant));

              await db.leaseParticipants.add({
                leaseId,
                tenantId,
                primary: index === 0,
              } satisfies LeaseParticipant);
            }
          }
        }
      }
    },
  );
}
