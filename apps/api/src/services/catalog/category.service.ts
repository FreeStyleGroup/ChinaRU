import { getDb, categories } from '@china-ru/db';
import { eq, isNull, asc } from 'drizzle-orm';
import type { CategoryDto } from '@china-ru/shared';

export const categoryService = {
  getAll: async (locale: string = 'ru'): Promise<CategoryDto[]> => {
    const db = getDb();

    const cats = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sort), asc(categories.depth));

    return cats.map(cat => ({
      id: cat.id,
      parentId: cat.parentId || undefined,
      slug: cat.slug,
      nameRu: cat.nameRu,
      nameEn: cat.nameEn,
      nameZh: cat.nameZh,
      descriptionRu: cat.descriptionRu || undefined,
      descriptionEn: cat.descriptionEn || undefined,
      descriptionZh: cat.descriptionZh || undefined,
      imageUrl: cat.imageUrl || undefined,
      depth: cat.depth,
      sort: cat.sort,
      productCount: cat.productCount || 0,
      children: undefined,
    }));
  },

  getTree: async (locale: string = 'ru'): Promise<CategoryDto[]> => {
    const db = getDb();

    const allCats = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sort), asc(categories.depth));

    // Build tree structure
    const byId = new Map(allCats.map(c => [c.id, { ...c, children: [] as any[] }]));
    const roots: CategoryDto[] = [];

    for (const cat of byId.values()) {
      if (!cat.parentId) {
        roots.push(cat as any);
      } else {
        const parent = byId.get(cat.parentId);
        if (parent) {
          parent.children.push(cat);
        }
      }
    }

    return roots as CategoryDto[];
  },

  getBySlug: async (slug: string): Promise<CategoryDto | null> => {
    const db = getDb();

    const [cat] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    if (!cat) return null;

    return {
      id: cat.id,
      parentId: cat.parentId || undefined,
      slug: cat.slug,
      nameRu: cat.nameRu,
      nameEn: cat.nameEn,
      nameZh: cat.nameZh,
      descriptionRu: cat.descriptionRu || undefined,
      descriptionEn: cat.descriptionEn || undefined,
      descriptionZh: cat.descriptionZh || undefined,
      imageUrl: cat.imageUrl || undefined,
      depth: cat.depth,
      sort: cat.sort,
      productCount: cat.productCount || 0,
    };
  },
};
