import { randomUUID } from 'node:crypto';

import { ConflictError, ForbiddenError, NotFoundError } from '../../http/errors';
import { toProductDto } from '../dto';

import type { AiProvider } from '../../ai/provider';
import type { UploadedFile } from '../../http/middleware/upload';
import type { Storage } from '../../storage/storage';
import type {
  ProductImage,
  ProductImageRepository,
  ProductRepository,
  ProductUpdate,
  SellerProfile,
  SellerRepository,
} from '@china-ru/db';
import type {
  CreateProductInput,
  ProductDto,
  ProductNameTranslationDto,
  UpdateProductInput,
} from '@china-ru/shared';

/**
 * Управление товарами и их изображениями со стороны продавца.
 * Все операции доступны только верифицированному магазину; владение товаром
 * проверяется на уровне запроса (updateOwned/softDeleteOwned) и в сервисе.
 */
export class SellerProductService {
  constructor(
    private readonly sellers: SellerRepository,
    private readonly products: ProductRepository,
    private readonly images: ProductImageRepository,
    private readonly storage: Storage,
    private readonly apiPublicUrl: string,
    private readonly ai: AiProvider
  ) {}

  /**
   * Перевод названия товара на английский и китайский — подсказка для формы:
   * продавец видит результат в полях и может поправить его до сохранения.
   * Только для подтверждённого магазина, чтобы перевод не стал бесплатным ИИ
   * для всех. Без ключа ИИ на сервере — пустые поля и available: false.
   */
  async translateName(userId: string, nameRu: string): Promise<ProductNameTranslationDto> {
    await this.requireVerifiedSeller(userId);
    if (!this.ai.enabled) return { nameEn: '', nameZh: '', available: false };

    const out = await this.ai.chatJson<Partial<Record<'nameEn' | 'nameZh', unknown>>>({
      messages: [
        {
          role: 'system',
          content: [
            'Ты переводишь названия товаров для маркетплейса промышленного оборудования и товаров из Китая.',
            'Ответь строго JSON-объектом {"nameEn": "...", "nameZh": "..."}: английский и упрощённый китайский.',
            'Бренды, модели, артикулы и единицы измерения (DDR5, 32 ГБ → 32GB, CNC-1325) не переводи и не меняй.',
            'Без кавычек-ёлочек, пояснений и текста вне JSON.',
          ].join('\n'),
        },
        { role: 'user', content: nameRu },
      ],
      temperature: 0.2,
      maxTokens: 300,
      jsonMode: true,
    });
    const pick = (v: unknown): string => (typeof v === 'string' ? v.trim().slice(0, 300) : '');
    return { nameEn: pick(out.nameEn), nameZh: pick(out.nameZh), available: true };
  }

  private async requireVerifiedSeller(userId: string): Promise<SellerProfile> {
    const seller = await this.sellers.findByUserId(userId);
    if (!seller) throw new ForbiddenError('Сначала оформите магазин', 'not_a_seller');
    if (seller.verifyStatus !== 'verified') {
      throw new ForbiddenError('Магазин ещё не подтверждён', 'seller_not_verified');
    }
    return seller;
  }

  private async withImages(productId: string): Promise<ProductDto> {
    const product = await this.products.findById(productId);
    if (!product) throw new NotFoundError('Товар не найден', 'product_not_found');
    return toProductDto(product, await this.images.listByProduct(productId));
  }

  async listMyProducts(userId: string): Promise<ProductDto[]> {
    const seller = await this.requireVerifiedSeller(userId);
    const result = await this.products.list({ sellerId: seller.id, limit: 100 });
    const imgRows = await this.images.listByProductIds(result.rows.map(p => p.id));
    const byProduct = new Map<string, ProductImage[]>();
    for (const img of imgRows) {
      const list = byProduct.get(img.productId);
      if (list) list.push(img);
      else byProduct.set(img.productId, [img]);
    }
    return result.rows.map(p => toProductDto(p, byProduct.get(p.id) ?? []));
  }

  async getMyProduct(userId: string, productId: string): Promise<ProductDto> {
    const seller = await this.requireVerifiedSeller(userId);
    const product = await this.products.findById(productId);
    if (!product) throw new NotFoundError('Товар не найден', 'product_not_found');
    if (product.sellerId !== seller.id) {
      throw new NotFoundError('Товар не найден', 'product_not_found');
    }
    return toProductDto(product, await this.images.listByProduct(productId));
  }

  async createProduct(userId: string, input: CreateProductInput): Promise<ProductDto> {
    const seller = await this.requireVerifiedSeller(userId);

    const slugTaken = await this.products.findBySlug(input.slug);
    if (slugTaken) throw new ConflictError('Такой URL (slug) уже занят', 'slug_taken');
    const skuTaken = await this.products.findBySellerSku(seller.id, input.sku);
    if (skuTaken) throw new ConflictError('Товар с таким артикулом уже есть', 'sku_taken');

    const created = await this.products.create({
      sellerId: seller.id,
      categoryId: input.categoryId,
      slug: input.slug,
      sku: input.sku,
      nameRu: input.nameRu,
      price: input.price,
      stock: input.stock,
      status: 'draft',
      ...(input.nameEn !== undefined ? { nameEn: input.nameEn } : {}),
      ...(input.nameZh !== undefined ? { nameZh: input.nameZh } : {}),
      ...(input.descriptionRu !== undefined ? { descriptionRu: input.descriptionRu } : {}),
      ...(input.descriptionEn !== undefined ? { descriptionEn: input.descriptionEn } : {}),
      ...(input.descriptionZh !== undefined ? { descriptionZh: input.descriptionZh } : {}),
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.tags ? { tags: input.tags } : {}),
    });
    return toProductDto(created, []);
  }

  async updateProduct(
    userId: string,
    productId: string,
    input: UpdateProductInput
  ): Promise<ProductDto> {
    const seller = await this.requireVerifiedSeller(userId);

    if (input.slug !== undefined) {
      const other = await this.products.findBySlug(input.slug);
      if (other && other.id !== productId) {
        throw new ConflictError('Такой URL (slug) уже занят', 'slug_taken');
      }
    }
    if (input.sku !== undefined) {
      const other = await this.products.findBySellerSku(seller.id, input.sku);
      if (other && other.id !== productId) {
        throw new ConflictError('Товар с таким артикулом уже есть', 'sku_taken');
      }
    }

    const patch: ProductUpdate = {};
    if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
    if (input.slug !== undefined) patch.slug = input.slug;
    if (input.sku !== undefined) patch.sku = input.sku;
    if (input.nameRu !== undefined) patch.nameRu = input.nameRu;
    if (input.nameEn !== undefined) patch.nameEn = input.nameEn;
    if (input.nameZh !== undefined) patch.nameZh = input.nameZh;
    if (input.descriptionRu !== undefined) patch.descriptionRu = input.descriptionRu;
    if (input.descriptionEn !== undefined) patch.descriptionEn = input.descriptionEn;
    if (input.descriptionZh !== undefined) patch.descriptionZh = input.descriptionZh;
    if (input.price !== undefined) patch.price = input.price;
    if (input.currency !== undefined) patch.currency = input.currency;
    if (input.stock !== undefined) patch.stock = input.stock;
    if (input.status !== undefined) patch.status = input.status;
    if (input.tags !== undefined) patch.tags = input.tags;

    const updated = await this.products.updateOwned(productId, seller.id, patch);
    if (!updated) throw new NotFoundError('Товар не найден', 'product_not_found');
    return toProductDto(updated, await this.images.listByProduct(productId));
  }

  async deleteProduct(userId: string, productId: string): Promise<{ id: string }> {
    const seller = await this.requireVerifiedSeller(userId);
    const ok = await this.products.softDeleteOwned(productId, seller.id);
    if (!ok) throw new NotFoundError('Товар не найден', 'product_not_found');
    return { id: productId };
  }

  async addImage(userId: string, productId: string, file: UploadedFile): Promise<ProductDto> {
    const seller = await this.requireVerifiedSeller(userId);
    const product = await this.products.findById(productId);
    if (!product) throw new NotFoundError('Товар не найден', 'product_not_found');
    if (product.sellerId !== seller.id) {
      throw new NotFoundError('Товар не найден', 'product_not_found');
    }

    const imageId = randomUUID();
    await this.storage.put(`product-images/${productId}/${imageId}`, file.buffer, file.mimetype);
    const existing = await this.images.countByProduct(productId);
    await this.images.add({
      productId,
      url: `${this.apiPublicUrl}/api/v1/files/product-images/${productId}/${imageId}`,
      sort: existing,
      isPrimary: existing === 0,
    });
    return this.withImages(productId);
  }

  async deleteImage(userId: string, productId: string, imageId: string): Promise<ProductDto> {
    const seller = await this.requireVerifiedSeller(userId);
    const product = await this.products.findById(productId);
    if (!product) throw new NotFoundError('Товар не найден', 'product_not_found');
    if (product.sellerId !== seller.id) {
      throw new NotFoundError('Товар не найден', 'product_not_found');
    }
    const image = await this.images.findById(imageId);
    if (!image) throw new NotFoundError('Изображение не найдено', 'image_not_found');
    if (image.productId !== productId) {
      throw new NotFoundError('Изображение не найдено', 'image_not_found');
    }

    const key = image.url.split('/').pop();
    if (key) await this.storage.delete(`product-images/${productId}/${key}`);
    await this.images.delete(imageId);
    return this.withImages(productId);
  }
}
