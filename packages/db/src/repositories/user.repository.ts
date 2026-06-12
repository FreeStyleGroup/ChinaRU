import { and, eq, isNull } from 'drizzle-orm';

import { users } from '../schema';

import type { Database } from '../client';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserUpdate = Partial<Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>>;

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
}
