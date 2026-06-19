import { BadRequestError, ForbiddenError, NotFoundError } from '../../http/errors';
import { toGarageVehicleDto, toProductDto } from '../dto';

import type {
  GarageRepository,
  NewGarageVehicle,
  ProductFitmentRepository,
  ProductImageRepository,
  VehicleBrandRepository,
  VehicleModelRepository,
} from '@china-ru/db';
import type { AddGarageVehicleInput, GarageVehicleDto, ProductDto } from '@china-ru/shared';

/**
 * «Мой гараж»: транспорт пользователя. По выбранному ТС подбираются запчасти
 * каталога через таблицу применимости (product_fitments): подходящие конкретной
 * модели либо всем моделям бренда.
 */
export class GarageService {
  constructor(
    private readonly garage: GarageRepository,
    private readonly brands: VehicleBrandRepository,
    private readonly models: VehicleModelRepository,
    private readonly fitments: ProductFitmentRepository,
    private readonly images: ProductImageRepository
  ) {}

  async list(userId: string): Promise<GarageVehicleDto[]> {
    const rows = await this.garage.listByUser(userId);
    return rows.map(toGarageVehicleDto);
  }

  async add(userId: string, input: AddGarageVehicleInput): Promise<GarageVehicleDto> {
    const brand = await this.brands.findById(input.brandId);
    if (!brand) throw new NotFoundError('Бренд не найден', 'brand_not_found');

    const row: NewGarageVehicle = {
      userId,
      brandId: brand.id,
      modelName: input.modelName ?? '',
      type: input.type,
      ...(input.year !== undefined ? { year: input.year } : {}),
      ...(input.vin !== undefined ? { vin: input.vin } : {}),
      ...(input.plate !== undefined ? { plate: input.plate } : {}),
    };

    if (input.modelId !== undefined) {
      const model = await this.models.findById(input.modelId);
      if (!model) throw new NotFoundError('Модель не найдена', 'model_not_found');
      if (model.brandId !== brand.id) {
        throw new BadRequestError('Модель не принадлежит выбранному бренду', 'model_brand_mismatch');
      }
      row.modelId = model.id;
      row.modelName = model.name;
      row.type = model.type;
    }
    if (!row.modelName) throw new BadRequestError('Укажите модель', 'model_required');

    const created = await this.garage.create(row);
    const dto = await this.toDto(created.id);
    return dto;
  }

  async remove(userId: string, id: string): Promise<void> {
    const ok = await this.garage.delete(id, userId);
    if (!ok) throw new NotFoundError('Транспорт не найден', 'vehicle_not_found');
  }

  /** Запчасти каталога, подходящие выбранному в гараже ТС. */
  async partsForVehicle(userId: string, vehicleId: string): Promise<ProductDto[]> {
    const vehicle = await this.garage.findById(vehicleId);
    if (!vehicle) throw new NotFoundError('Транспорт не найден', 'vehicle_not_found');
    if (vehicle.userId !== userId) throw new ForbiddenError('Это не ваш транспорт', 'forbidden');

    const products = await this.fitments.listProductsForVehicle(vehicle.brandId, vehicle.modelId);
    if (products.length === 0) return [];
    const images = await this.images.listByProductIds(products.map(p => p.id));
    const byProduct = new Map<string, typeof images>();
    for (const img of images) {
      const list = byProduct.get(img.productId) ?? [];
      list.push(img);
      byProduct.set(img.productId, list);
    }
    return products.map(p => toProductDto(p, byProduct.get(p.id) ?? []));
  }

  private async toDto(id: string): Promise<GarageVehicleDto> {
    const found = await this.garage.findById(id);
    if (!found) throw new NotFoundError('Транспорт не найден', 'vehicle_not_found');
    const brand = await this.brands.findById(found.brandId);
    return toGarageVehicleDto({ ...found, brandName: brand?.name ?? '' });
  }
}
