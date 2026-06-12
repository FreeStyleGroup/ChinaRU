import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../http/errors';
import { toSellerProfileDto, toUserDto } from '../dto';

import type { SellerRepository, UserRepository } from '@china-ru/db';
import type {
  CreateSellerProfileInput,
  SellerProfileDto,
  SetNicknameInput,
  UpdateMenuSectionsInput,
  UpdateProfileInput,
  UserDto,
} from '@china-ru/shared';

/** Личные данные, настройки кабинета, никнейм и заявка на продавца. */
export class AccountService {
  constructor(
    private readonly users: UserRepository,
    private readonly sellers: SellerRepository
  ) {}

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDto> {
    const updated = await this.users.update(userId, input);
    if (!updated) throw new NotFoundError('Пользователь не найден', 'user_not_found');
    return toUserDto(updated);
  }

  /** Сохраняет включённые опциональные разделы меню кабинета. */
  async updateMenu(userId: string, input: UpdateMenuSectionsInput): Promise<UserDto> {
    const updated = await this.users.update(userId, { menuSections: input.sections });
    if (!updated) throw new NotFoundError('Пользователь не найден', 'user_not_found');
    return toUserDto(updated);
  }

  /**
   * Выбор/смена никнейма пользователя. Доступно только верифицированному профилю
   * («синяя галочка»); никнейм уникален среди пользователей.
   */
  async setNickname(userId: string, input: SetNicknameInput): Promise<UserDto> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('Пользователь не найден', 'user_not_found');
    if (!user.verifiedAt) {
      throw new ForbiddenError(
        'Никнейм доступен после верификации профиля',
        'verification_required'
      );
    }
    const taken = await this.users.findByNickname(input.nickname);
    if (taken && taken.id !== userId) {
      throw new ConflictError('Никнейм уже занят', 'nickname_taken');
    }
    const updated = await this.users.update(userId, { nickname: input.nickname });
    if (!updated) throw new NotFoundError('Пользователь не найден', 'user_not_found');
    return toUserDto(updated);
  }

  /** Профиль продавца текущего пользователя (или null, если заявки ещё не было). */
  async getSellerProfile(userId: string): Promise<SellerProfileDto | null> {
    const profile = await this.sellers.findByUserId(userId);
    return profile ? toSellerProfileDto(profile) : null;
  }

  /**
   * Заявка пользователя стать продавцом: создаёт профиль со статусом `pending`
   * (модерация админом). Повторная подача разрешена только после отклонения.
   */
  async applySeller(userId: string, input: CreateSellerProfileInput): Promise<SellerProfileDto> {
    const existing = await this.sellers.findByUserId(userId);
    if (existing) {
      if (existing.verifyStatus === 'pending') {
        throw new ConflictError('Заявка уже на модерации', 'application_pending');
      }
      if (existing.verifyStatus === 'verified') {
        throw new ConflictError('Магазин уже подтверждён', 'already_seller');
      }
      // unverified/rejected — разрешаем повторную подачу с обновлёнными данными.
      const updated = await this.sellers.update(existing.id, {
        ...input,
        verifyStatus: 'pending',
        verifiedAt: null,
      });
      if (!updated) throw new NotFoundError('Профиль продавца не найден', 'seller_not_found');
      return toSellerProfileDto(updated);
    }
    const created = await this.sellers.create({ userId, ...input, verifyStatus: 'pending' });
    return toSellerProfileDto(created);
  }

  /**
   * Выбор/смена никнейма магазина. Доступно только после верификации магазина
   * (verifyStatus = verified); уникален среди магазинов.
   */
  async setSellerNickname(userId: string, input: SetNicknameInput): Promise<SellerProfileDto> {
    const profile = await this.sellers.findByUserId(userId);
    if (!profile) throw new NotFoundError('Профиль продавца не найден', 'seller_not_found');
    if (profile.verifyStatus !== 'verified') {
      throw new ForbiddenError(
        'Никнейм магазина доступен после верификации',
        'verification_required'
      );
    }
    const taken = await this.sellers.findByNickname(input.nickname);
    if (taken && taken.id !== profile.id) {
      throw new ConflictError('Никнейм уже занят', 'nickname_taken');
    }
    const updated = await this.sellers.update(profile.id, { nickname: input.nickname });
    if (!updated) throw new BadRequestError('Не удалось сохранить никнейм');
    return toSellerProfileDto(updated);
  }
}
