import { and, desc, eq } from 'drizzle-orm';

import { garageVehicles, vehicleBrands } from '../schema';

import type { Database } from '../client';

export type GarageVehicle = typeof garageVehicles.$inferSelect;
export type NewGarageVehicle = typeof garageVehicles.$inferInsert;

export type GarageVehicleRow = GarageVehicle & { brandName: string };

export class GarageRepository {
  constructor(private readonly db: Database) {}

  async listByUser(userId: string): Promise<GarageVehicleRow[]> {
    const rows = await this.db
      .select({ v: garageVehicles, brandName: vehicleBrands.name })
      .from(garageVehicles)
      .innerJoin(vehicleBrands, eq(garageVehicles.brandId, vehicleBrands.id))
      .where(eq(garageVehicles.userId, userId))
      .orderBy(desc(garageVehicles.createdAt));
    return rows.map(r => ({ ...r.v, brandName: r.brandName }));
  }

  async findById(id: string): Promise<GarageVehicle | null> {
    const [row] = await this.db
      .select()
      .from(garageVehicles)
      .where(eq(garageVehicles.id, id))
      .limit(1);
    return row ?? null;
  }

  async create(data: NewGarageVehicle): Promise<GarageVehicle> {
    const [row] = await this.db.insert(garageVehicles).values(data).returning();
    if (!row) throw new Error('garage_vehicles.insert returned no row');
    return row;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const rows = await this.db
      .delete(garageVehicles)
      .where(and(eq(garageVehicles.id, id), eq(garageVehicles.userId, userId)))
      .returning({ id: garageVehicles.id });
    return rows.length > 0;
  }
}
