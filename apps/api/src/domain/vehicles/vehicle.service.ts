import { toDealerDto, toVehicleBrandDto, toVehicleModelDto } from '../dto';

import type {
  DealerRepository,
  VehicleBrandRepository,
  VehicleModelRepository,
} from '@china-ru/db';
import type {
  DealerDto,
  DealerListQuery,
  VehicleBrandDto,
  VehicleBrandListQuery,
  VehicleModelDto,
  VehicleType,
} from '@china-ru/shared';

/** Справочник авто-раздела: бренды китайского автопарка и их модели. */
export class VehicleService {
  constructor(
    private readonly brands: VehicleBrandRepository,
    private readonly models: VehicleModelRepository
  ) {}

  async listBrands(query: VehicleBrandListQuery): Promise<VehicleBrandDto[]> {
    const rows = await this.brands.list({
      ...(query.type ? { type: query.type } : {}),
      ...(query.popular !== undefined ? { popular: query.popular } : {}),
    });
    return rows.map(toVehicleBrandDto);
  }

  async listModels(brandId: string, type?: VehicleType): Promise<VehicleModelDto[]> {
    const rows = await this.models.listByBrand(brandId, type);
    return rows.map(toVehicleModelDto);
  }
}

/** Официальные дилеры в России (для карты с фильтром по городу и брендам). */
export class DealerService {
  constructor(private readonly dealers: DealerRepository) {}

  async list(query: DealerListQuery): Promise<DealerDto[]> {
    const brandIds = query.brands
      ? query.brands.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const rows = await this.dealers.list({
      ...(query.city ? { city: query.city } : {}),
      ...(brandIds.length > 0 ? { brandIds } : {}),
    });
    return rows.map(toDealerDto);
  }

  async cities(): Promise<string[]> {
    return this.dealers.cities();
  }
}
