import { and, arrayContains, asc, count, eq, isNull } from 'drizzle-orm';

import { vehicleBrands, vehicleModels } from '../schema';

import type { Database } from '../client';
import type { VehicleType } from '@china-ru/shared';

export type VehicleBrand = typeof vehicleBrands.$inferSelect;
export type NewVehicleBrand = typeof vehicleBrands.$inferInsert;
export type VehicleModel = typeof vehicleModels.$inferSelect;
export type NewVehicleModel = typeof vehicleModels.$inferInsert;

export type BrandWithCount = VehicleBrand & { modelCount: number };

export class VehicleBrandRepository {
  constructor(private readonly db: Database) {}

  /** Список брендов с числом моделей; фильтры по направлению (auto/moto/special) и популярности. */
  async list(f: { type?: VehicleType; popular?: boolean } = {}): Promise<BrandWithCount[]> {
    const conditions = [isNull(vehicleBrands.deletedAt)];
    if (f.type) conditions.push(arrayContains(vehicleBrands.types, [f.type]));
    if (f.popular !== undefined) conditions.push(eq(vehicleBrands.popular, f.popular));
    const rows = await this.db
      .select({ brand: vehicleBrands, modelCount: count(vehicleModels.id) })
      .from(vehicleBrands)
      .leftJoin(
        vehicleModels,
        and(eq(vehicleModels.brandId, vehicleBrands.id), isNull(vehicleModels.deletedAt))
      )
      .where(and(...conditions))
      .groupBy(vehicleBrands.id)
      .orderBy(asc(vehicleBrands.sort), asc(vehicleBrands.name));
    return rows.map(r => ({ ...r.brand, modelCount: r.modelCount }));
  }

  async findById(id: string): Promise<VehicleBrand | null> {
    const [row] = await this.db
      .select()
      .from(vehicleBrands)
      .where(and(eq(vehicleBrands.id, id), isNull(vehicleBrands.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async findBySlug(slug: string): Promise<VehicleBrand | null> {
    const [row] = await this.db
      .select()
      .from(vehicleBrands)
      .where(and(eq(vehicleBrands.slug, slug), isNull(vehicleBrands.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async create(data: NewVehicleBrand): Promise<VehicleBrand> {
    const [row] = await this.db.insert(vehicleBrands).values(data).returning();
    if (!row) throw new Error('vehicle_brands.insert returned no row');
    return row;
  }
}

export class VehicleModelRepository {
  constructor(private readonly db: Database) {}

  async listByBrand(brandId: string, type?: VehicleType): Promise<VehicleModel[]> {
    const conditions = [eq(vehicleModels.brandId, brandId), isNull(vehicleModels.deletedAt)];
    if (type) conditions.push(eq(vehicleModels.type, type));
    return this.db
      .select()
      .from(vehicleModels)
      .where(and(...conditions))
      .orderBy(asc(vehicleModels.sort), asc(vehicleModels.name));
  }

  async findById(id: string): Promise<VehicleModel | null> {
    const [row] = await this.db
      .select()
      .from(vehicleModels)
      .where(and(eq(vehicleModels.id, id), isNull(vehicleModels.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async create(data: NewVehicleModel): Promise<VehicleModel> {
    const [row] = await this.db.insert(vehicleModels).values(data).returning();
    if (!row) throw new Error('vehicle_models.insert returned no row');
    return row;
  }
}
