import { asc, eq } from 'drizzle-orm';

import { contentAgents } from '../schema';

import type { Database } from '../client';
import type { ArticleSection } from '@china-ru/shared';

export type ContentAgent = typeof contentAgents.$inferSelect;
export type NewContentAgent = typeof contentAgents.$inferInsert;
export type ContentAgentUpdate = Partial<Omit<NewContentAgent, 'id' | 'section' | 'createdAt'>>;

export class ContentAgentRepository {
  constructor(private readonly db: Database) {}

  async list(): Promise<ContentAgent[]> {
    return this.db.select().from(contentAgents).orderBy(asc(contentAgents.section));
  }

  async findBySection(section: ArticleSection): Promise<ContentAgent | null> {
    const [row] = await this.db
      .select()
      .from(contentAgents)
      .where(eq(contentAgents.section, section))
      .limit(1);
    return row ?? null;
  }

  /** Создаёт агента раздела или обновляет существующего (один агент на section). */
  async upsert(section: ArticleSection, data: ContentAgentUpdate): Promise<ContentAgent> {
    const existing = await this.findBySection(section);
    if (existing) {
      const [row] = await this.db
        .update(contentAgents)
        .set(data)
        .where(eq(contentAgents.id, existing.id))
        .returning();
      if (!row) throw new Error('content_agents.update returned no row');
      return row;
    }
    const [row] = await this.db
      .insert(contentAgents)
      .values({ section, name: data.name ?? section, persona: data.persona ?? '', ...data })
      .returning();
    if (!row) throw new Error('content_agents.insert returned no row');
    return row;
  }
}
