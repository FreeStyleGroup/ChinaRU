import { NotFoundError } from '../../http/errors';
import { toUserDto } from '../dto';

import type { UserRepository } from '@china-ru/db';
import type { UpdateMenuSectionsInput, UpdateProfileInput, UserDto } from '@china-ru/shared';

/** Личные данные и настройки кабинета пользователя. */
export class AccountService {
  constructor(private readonly users: UserRepository) {}

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
}
