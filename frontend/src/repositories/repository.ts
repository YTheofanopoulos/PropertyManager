
export interface Repository<T extends {id?:number}> {
 getAll(): Promise<T[]>; getById(id:number): Promise<T|undefined>; add(entity:Omit<T,"id">): Promise<number>; update(id:number,changes:Partial<Omit<T,"id">>): Promise<void>; delete(id:number): Promise<void>;
}
