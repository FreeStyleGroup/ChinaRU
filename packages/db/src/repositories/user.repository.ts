import { and, count, desc, eq, ilike, isNull, type SQL } from 'drizzle-orm';

import { users } from '../schema';

import type { Database } from '../client';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserUpdate = Partial<Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>>;

export interface UserListFilters {
  page?: number;
  limit?: number;
  role?: User['role'];
  status?: User['status'];
  search?: string;
}

export class UserRepository {
  constructor(private readonly db: Database) {}

  async create(data: NewUser): Promise<User> {
    const [row] = await this.db.insert(users).values(data).returning();
    if (!row) throw new Error('users.insert returned no row');
    return row;
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async update(id: string, patch: UserUpdate): Promise<User | null> {
    const [row] = await this.db
      .update(users)
      .set(patch)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();
    return row ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const rows = await this.db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning({ id: users.id });
    return rows.length > 0;
  }

  private buildListConditions(f: UserListFilters): SQL[] {
    const conditions: SQL[] = [isNull(users.deletedAt)];
    if (f.role) conditions.push(eq(users.role, f.role));
    if (f.status) conditions.push(eq(users.status, f.status));
    if (f.search) conditions.push(ilike(users.email, `%${f.search}%`));
    return conditions;
  }

  /** Постраничный список для админки. Один набор условий и для строк, и для count. */
  async list(f: UserListFilters = {}): Promise<{ rows: User[]; total: number }> {
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(100, Math.max(1, f.limit ?? 20));
    const where = and(...this.buildListConditions(f));

    const rows = await this.db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const [agg] = await this.db.select({ value: count() }).from(users).where(where);
    return { rows, total: agg?.value ?? 0 };
  }
}
