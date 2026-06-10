import { getDb, from: travelDestinations, travelPackages, travelBookings } from '@china-ru/db';
import { eq } from 'drizzle-orm';
import type { TravelDestinationDto, TravelPackageDto } from '@china-ru/shared';

export const travelService = {
  destinations: async (): Promise<TravelDestinationDto[]> => {
    const db = getDb();
    const dests = await db.select().from(travelDestinations);

    return dests.map(d => ({
      id: d.id,
      slug: d.slug,
      nameRu: d.nameRu,
      nameEn: d.nameEn,
      nameZh: d.nameZh,
      country: d.country,
      description: d.description || undefined,
      imageUrl: d.imageUrl || undefined,
      temperature: d.temperature || undefined,
      bestMonths: d.bestMonths || undefined,
      attractions: d.attractions || undefined,
      createdAt: d.createdAt.toISOString(),
    }));
  },

  packages: async (destinationId?: string): Promise<TravelPackageDto[]> => {
    const db = getDb();

    let query = db.select().from(travelPackages);

    if (destinationId) {
      query = query.where(eq(travelPackages.destinationId, destinationId));
    }

    const pkgs = await query;

    return pkgs.map(p => ({
      id: p.id,
      destinationId: p.destinationId,
      titleRu: p.titleRu,
      titleEn: p.titleEn,
      titleZh: p.titleZh,
      description: p.description || undefined,
      price: parseFloat(p.price),
      currency: p.currency,
      duration: p.duration,
      status: p.status || 'active',
      inclusions: p.inclusions || undefined,
      exclusions: p.exclusions || undefined,
      rating: parseFloat(p.rating),
      reviewCount: p.reviewCount || 0,
      imageUrl: p.imageUrl || undefined,
      createdAt: p.createdAt.toISOString(),
    }));
  },

  seedDemoData: async () => {
    const db = getDb();

    // Check if already seeded
    const [existing] = await db.select().from(travelDestinations).limit(1);
    if (existing) return;

    // Seed destinations
    const dests = await db
      .insert(travelDestinations)
      .values([
        {
          slug: 'beijing',
          nameRu: 'Пекин',
          nameEn: 'Beijing',
          nameZh: '北京',
          country: 'Китай',
          description: 'Столица Китая с богатой историей',
          bestMonths: ['апрель', 'май', 'сентябрь', 'октябрь'],
          attractions: ['Великая стена', 'Запретный город', 'Летний дворец'],
        },
        {
          slug: 'shanghai',
          nameRu: 'Шанхай',
          nameEn: 'Shanghai',
          nameZh: '上海',
          country: 'Китай',
          description: 'Современный мегаполис на побережье',
          bestMonths: ['апрель', 'май', 'октябрь'],
          attractions: ['Башня Востока', 'Набережная Пуси', 'Классический сад'],
        },
      ])
      .returning();

    // Seed packages
    await db
      .insert(travelPackages)
      .values([
        {
          destinationId: dests[0].id,
          titleRu: 'Культурный тур по Пекину',
          titleEn: 'Beijing Cultural Tour',
          titleZh: '北京文化之旅',
          description: '5-дневный тур с посещением основных достопримечательностей',
          price: '1200',
          currency: 'usd',
          duration: 5,
          inclusions: ['Проживание', 'Питание', 'Гид', 'Транспорт'],
        },
        {
          destinationId: dests[1].id,
          titleRu: 'Шанхай - город будущего',
          titleEn: 'Shanghai Modern City',
          titleZh: '上海未来城市',
          description: '4-дневный тур по современному Шанхаю',
          price: '1000',
          currency: 'usd',
          duration: 4,
          inclusions: ['Проживание', 'Питание', 'Гид'],
        },
      ]);
  },
};
