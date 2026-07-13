
import { db } from "../db/database";
import type { Unit, UnitListItem } from "../models/domain";
import type { Repository } from "./repository";
export class DexieUnitRepository implements Repository<Unit> {
 getAll(){return db.units.toArray();} getById(id:number){return db.units.get(id);} async add(entity:Omit<Unit,"id">){return Number(await db.units.add(entity));} async update(id:number,changes:Partial<Omit<Unit,"id">>){await db.units.update(id,changes);} async delete(id:number){await db.units.delete(id);}
 async getListItems():Promise<UnitListItem[]> {
  const units=await db.units.toArray(); const buildings=new Map((await db.buildings.toArray()).map(x=>[x.id,x])); const locations=new Map((await db.locations.toArray()).map(x=>[x.id,x]));
  return units.map(unit=>{const b=buildings.get(unit.buildingId); const l=b?locations.get(b.locationId):undefined; return {...unit,street:l?.name??"Unknown",civicAddress:b?.civicAddress??"Unknown"};});
 }
}
export const unitRepository=new DexieUnitRepository();
