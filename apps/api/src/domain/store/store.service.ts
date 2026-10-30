import { randomUUID } from 'node:crypto';

import { idSchema, nicknameSchema } from '@china-ru/shared';

import { BadRequestError, ForbiddenError, NotFoundError } from '../../http/errors';
import { detectImageMime } from '../../storage/image-signature';
import { toSellerProfileDto, toStoreDto } from '../dto';

import type { UploadedFile } from '../../http/middleware/upload';
import type { Storage } from '../../storage/storage';
import type { ProductRepository, SellerProfile, SellerRepository } from '@china-ru/db';
import type { SellerProfileDto, StoreDto, UpdateStoreInput } from '@china-ru/shared';

/** Что оформляется картинкой на странице магазина. */
export type StoreImageKind = 'banner' | 'logo';

/**
 * Публичная страница магазина и её оформление продавцом.
 *
 * Страница открыта только у подтверждённого магазина: до проверки модератором
 * продавец не может выставлять товары, и пустая витрина с непроверенным именем
 * компании покупателю не нужна. Оформлять (описание, баннер, логотип) можно и
 * до подтверждения — к моменту проверки страница уже готова.
 *
 * Файлы оформления лежат по ключу `stores/{sellerId}/{fileId}`; каждая загрузка —
 * новый fileId, поэтому раздачу можно кешировать надолго, а смена баннера сразу
 * видна покупателю. Прежний файл удаляется.
 */
export class StoreService {
  constructor(
    private readonly sellers: SellerRepository,
    private readonly products: ProductRepository,
    private readonly storage: Storage,
    private readonly apiPublicUrl: string
  ) {}

  /** Магазин по ключу из адреса: никнейм, числовой publicId или id профиля. */
  async getPublic(key: string): Promise<StoreDto> {
    const seller = await this.resolve(key);
    if (seller?.verifyStatus !== 'verified') {
      throw new NotFoundError('Магазин не найден', 'store_not_found');
    }
    return toStoreDto(seller, await this.products.countActiveBySeller(seller.id));
  }

  async update(userId: string, input: UpdateStoreInput): Promise<SellerProfileDto> {
    const seller = await this.requireSeller(userId);
    const description =
      input.description && input.description.length > 0 ? input.description : null;
    const updated = await this.sellers.update(seller.id, { description });
    if (!updated) throw new NotFoundError('Магазин не найден', 'store_not_found');
    return toSellerProfileDto(updated);
  }

  async setImage(
    userId: string,
    kind: StoreImageKind,
    file: UploadedFile
  ): Promise<SellerProfileDto> {
    const seller = await this.requireSeller(userId);
    const mime = detectImageMime(file.buffer);
    if (!mime) {
      throw new BadRequestError('Нужна картинка JPEG, PNG или WebP', 'unsupported_type');
    }

    const fileId = randomUUID();
    await this.storage.put(`stores/${seller.id}/${fileId}`, file.buffer, mime);
    const url = `${this.apiPublicUrl}/api/v1/files/stores/${seller.id}/${fileId}`;

    const updated = await this.sellers.update(
      seller.id,
      kind === 'banner' ? { bannerUrl: url } : { logoUrl: url }
    );
    if (!updated) throw new NotFoundError('Магазин не найден', 'store_not_found');
    await this.deleteStored(seller.id, kind === 'banner' ? seller.bannerUrl : seller.logoUrl);
    return toSellerProfileDto(updated);
  }

  async removeImage(userId: string, kind: StoreImageKind): Promise<SellerProfileDto> {
    const seller = await this.requireSeller(userId);
    const updated = await this.sellers.update(
      seller.id,
      kind === 'banner' ? { bannerUrl: null } : { logoUrl: null }
    );
    if (!updated) throw new NotFoundError('Магазин не найден', 'store_not_found');
    await this.deleteStored(seller.id, kind === 'banner' ? seller.bannerUrl : seller.logoUrl);
    return toSellerProfileDto(updated);
  }

  private async resolve(key: string): Promise<SellerProfile | null> {
    if (idSchema.safeParse(key).success) return this.sellers.findById(key);
    if (/^\d{1,10}$/.test(key)) return this.sellers.findByPublicId(Number(key));
    const nickname = nicknameSchema.safeParse(key);
    return nickname.success ? this.sellers.findByNickname(nickname.data) : null;
  }

  private async requireSeller(userId: string): Promise<SellerProfile> {
    const seller = await this.sellers.findByUserId(userId);
    if (!seller) throw new ForbiddenError('Сначала оформите магазин', 'not_a_seller');
    return seller;
  }

  /** Удалить прежний файл оформления — только свой, по ключу из нашего же адреса. */
  private async deleteStored(sellerId: string, url: string | null): Promise<void> {
    if (!url) return;
    const prefix = `${this.apiPublicUrl}/api/v1/files/stores/${sellerId}/`;
    if (!url.startsWith(prefix)) return;
    const fileId = url.slice(prefix.length);
    if (idSchema.safeParse(fileId).success) {
      await this.storage.delete(`stores/${sellerId}/${fileId}`);
    }
  }
}
