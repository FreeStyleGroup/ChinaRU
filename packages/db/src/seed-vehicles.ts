import { slugify } from '@china-ru/shared';

import { DealerRepository, VehicleBrandRepository, VehicleModelRepository } from './repositories';
import { dealers as dealersTable } from './schema';

import type { Database } from './client';

/**
 * Seed авто-раздела: реальные китайские бренды (популярные в РФ), их модели,
 * примеры официальных дилеров с координатами для карты. Идемпотентно (по slug
 * бренда и (brandId, slug) модели; дилеры — только если таблица пуста).
 */

interface BrandSeed {
  slug: string;
  name: string;
  nameZh?: string;
  types: ('auto' | 'moto' | 'special')[];
  popular?: boolean;
  models?: string[];
}

const BRANDS: BrandSeed[] = [
  { slug: 'haval', name: 'Haval', nameZh: '哈弗', types: ['auto'], popular: true, models: ['Jolion', 'F7', 'F7x', 'M6', 'H5', 'H9', 'Dargo', 'H6'] },
  { slug: 'chery', name: 'Chery', nameZh: '奇瑞', types: ['auto'], popular: true, models: ['Tiggo 4 Pro', 'Tiggo 7 Pro', 'Tiggo 7 Pro Max', 'Tiggo 8 Pro', 'Tiggo 8 Pro Max', 'Arrizo 8'] },
  { slug: 'geely', name: 'Geely', nameZh: '吉利', types: ['auto'], popular: true, models: ['Coolray', 'Atlas', 'Atlas Pro', 'Monjaro', 'Tugella', 'Emgrand', 'Okavango'] },
  { slug: 'changan', name: 'Changan', nameZh: '长安', types: ['auto'], popular: true, models: ['CS35 Plus', 'CS55 Plus', 'CS75 Plus', 'UNI-K', 'UNI-V', 'UNI-T', 'Alsvin'] },
  { slug: 'exeed', name: 'Exeed', nameZh: '星途', types: ['auto'], popular: true, models: ['TXL', 'VX', 'LX', 'RX'] },
  { slug: 'omoda', name: 'Omoda', nameZh: '欧萌达', types: ['auto'], popular: true, models: ['C5', 'S5', 'C7'] },
  { slug: 'jaecoo', name: 'Jaecoo', types: ['auto'], popular: true, models: ['J7', 'J8'] },
  { slug: 'tank', name: 'Tank', nameZh: '坦克', types: ['auto'], popular: true, models: ['300', '400', '500', '700'] },
  { slug: 'jetour', name: 'Jetour', nameZh: '捷途', types: ['auto'], popular: true, models: ['Dashing', 'X70 Plus', 'X90 Plus', 'T2'] },
  { slug: 'byd', name: 'BYD', nameZh: '比亚迪', types: ['auto'], popular: true, models: ['Song Plus', 'Han', 'Tang', 'Seal', 'Dolphin', 'Atto 3'] },
  { slug: 'dongfeng', name: 'Dongfeng', nameZh: '东风', types: ['auto'], popular: true, models: ['580', 'ix5', 'Huge', 'Shine Max'] },
  { slug: 'great-wall', name: 'Great Wall', nameZh: '长城', types: ['auto'], popular: true, models: ['Wingle 7', 'Poer'] },
  { slug: 'lifan', name: 'Lifan', nameZh: '力帆', types: ['auto'], popular: true, models: ['X50', 'X60', 'X70', 'Murman'] },
  { slug: 'brilliance', name: 'Brilliance', nameZh: '华晨', types: ['auto'], popular: true, models: ['V3', 'V5', 'H530'] },
  { slug: 'zotye', name: 'Zotye', nameZh: '众泰', types: ['auto'], popular: true, models: ['T600', 'Z300', 'Coupa'] },
  { slug: 'belgee', name: 'Belgee', types: ['auto'], popular: true, models: ['X50', 'X70'] },
  { slug: 'soueast', name: 'Soueast', nameZh: '东南', types: ['auto'], models: ['S07', 'S09'] },
  { slug: 'tenet', name: 'Tenet', types: ['auto'], models: ['T4', 'T7', 'T8'] },
  { slug: 'gac', name: 'GAC', nameZh: '广汽', types: ['auto'], models: ['GS3', 'GS8', 'Empow'] },
  { slug: 'faw', name: 'FAW', nameZh: '一汽', types: ['auto'], models: ['Bestune T77', 'Bestune T99', 'Bestune B70'] },
  { slug: 'hongqi', name: 'Hongqi', nameZh: '红旗', types: ['auto'], models: ['H5', 'H9', 'HS5', 'E-HS9'] },
  { slug: 'li-auto', name: 'Li Auto', nameZh: '理想', types: ['auto'], models: ['L7', 'L8', 'L9'] },
  { slug: 'zeekr', name: 'Zeekr', nameZh: '极氪', types: ['auto'], models: ['001', '007', 'X', '009'] },
  { slug: 'voyah', name: 'Voyah', nameZh: '岚图', types: ['auto'], models: ['Free', 'Dream', 'Passion'] },
  { slug: 'avatr', name: 'Avatr', nameZh: '阿维塔', types: ['auto'], models: ['11', '12'] },
  { slug: 'livan', name: 'Livan', nameZh: '睿蓝', types: ['auto'], models: ['X3 Pro', '7'] },
  { slug: 'kaiyi', name: 'Kaiyi', nameZh: '凯翼', types: ['auto'], models: ['E5', 'X3', 'X3 Pro'] },
  { slug: 'jac', name: 'JAC', nameZh: '江淮', types: ['auto'], models: ['J7', 'JS4', 'JS6'] },
  { slug: 'baic', name: 'BAIC', nameZh: '北汽', types: ['auto'], models: ['U5 Plus', 'X55', 'BJ40'] },
  // Мото и производные
  { slug: 'cfmoto', name: 'CFMOTO', nameZh: '春风', types: ['moto'], popular: true, models: ['250 NK', '450 NK', '700 CL-X', '800 MT'] },
  { slug: 'voge', name: 'Voge', nameZh: '无极', types: ['moto'], models: ['300 AC', '500 DS', '525 DSX'] },
  { slug: 'zontes', name: 'Zontes', nameZh: '宗申', types: ['moto'], models: ['ZT155-U', 'ZT310-T', 'ZT350-T'] },
  { slug: 'kove', name: 'Kove', types: ['moto'], models: ['321 R', '450 Rally', '525 X'] },
  // Спецтехника
  { slug: 'sany', name: 'SANY', nameZh: '三一', types: ['special'], popular: true, models: ['SY215', 'SY365', 'STC250'] },
  { slug: 'xcmg', name: 'XCMG', nameZh: '徐工', types: ['special'], popular: true, models: ['XE215', 'LW300', 'XS123'] },
  { slug: 'zoomlion', name: 'Zoomlion', nameZh: '中联重科', types: ['special'], models: ['ZE215', 'ZL50'] },
  { slug: 'liugong', name: 'LiuGong', nameZh: '柳工', types: ['special'], models: ['CLG835', 'CLG922'] },
  { slug: 'sdlg', name: 'SDLG', nameZh: '临工', types: ['special'], models: ['LG936', 'LG953', 'E6210'] },
  { slug: 'lonking', name: 'Lonking', nameZh: '龙工', types: ['special'], models: ['CDM833', 'CDM856'] },
];

interface DealerSeed {
  name: string;
  city: string;
  region?: string;
  address: string;
  phone?: string;
  lat: string;
  lng: string;
  brands: string[]; // slugs
}

const DEALERS: DealerSeed[] = [
  { name: 'Авилон', city: 'Москва', address: 'Волгоградский пр-т, 43к3', phone: '+7 495 730-00-00', lat: '55.716700', lng: '37.703300', brands: ['haval', 'geely', 'chery'] },
  { name: 'АвтоСпецЦентр', city: 'Москва', address: 'Внешняя ул., 23', phone: '+7 495 781-00-00', lat: '55.602900', lng: '37.605700', brands: ['chery', 'omoda', 'jaecoo'] },
  { name: 'РОЛЬФ', city: 'Москва', address: 'ул. Обручева, 21', phone: '+7 495 785-00-00', lat: '55.654200', lng: '37.547800', brands: ['changan', 'exeed', 'tank'] },
  { name: 'Major Auto', city: 'Москва', address: 'Новорижское ш., 21 км', phone: '+7 495 280-00-00', lat: '55.793900', lng: '37.270900', brands: ['byd', 'jetour', 'voyah'] },
  { name: 'АвтоГЕРМЕС', city: 'Москва', address: 'Дмитровское ш., 108', phone: '+7 495 989-00-00', lat: '55.879200', lng: '37.546800', brands: ['geely', 'belgee', 'changan'] },
  { name: 'Аврора', city: 'Санкт-Петербург', region: 'Ленинградская область', address: 'Пулковское ш., 27', phone: '+7 812 740-00-00', lat: '59.823100', lng: '30.322600', brands: ['haval', 'chery', 'tank'] },
  { name: 'Прагматика', city: 'Санкт-Петербург', address: 'ул. Руставели, 53', phone: '+7 812 449-00-00', lat: '60.035700', lng: '30.412900', brands: ['exeed', 'omoda', 'jetour'] },
];

export async function seedVehicles(db: Database): Promise<void> {
  const brandRepo = new VehicleBrandRepository(db);
  const modelRepo = new VehicleModelRepository(db);
  const dealerRepo = new DealerRepository(db);

  const idBySlug = new Map<string, string>();
  let sort = 10;
  for (const b of BRANDS) {
    let brand = await brandRepo.findBySlug(b.slug);
    brand ??= await brandRepo.create({
      slug: b.slug,
      name: b.name,
      nameZh: b.nameZh ?? null,
      types: b.types,
      popular: b.popular ?? false,
      sort,
    });
    idBySlug.set(b.slug, brand.id);
    sort += 10;

    const existing = await modelRepo.listByBrand(brand.id);
    const have = new Set(existing.map(m => m.slug));
    let msort = 10;
    for (const modelName of b.models ?? []) {
      const slug = slugify(modelName) || modelName.toLowerCase();
      if (!have.has(slug)) {
        await modelRepo.create({
          brandId: brand.id,
          slug,
          name: modelName,
          type: b.types[0] ?? 'auto',
          sort: msort,
        });
      }
      msort += 10;
    }
  }

  // Дилеры — только если их ещё нет (без unique-ключа полагаемся на пустоту таблицы).
  const existingDealers = await db.select({ id: dealersTable.id }).from(dealersTable).limit(1);
  if (existingDealers.length === 0) {
    let dsort = 10;
    for (const d of DEALERS) {
      const dealer = await dealerRepo.create({
        name: d.name,
        city: d.city,
        region: d.region ?? null,
        address: d.address,
        phone: d.phone ?? null,
        lat: d.lat,
        lng: d.lng,
        sort: dsort,
      });
      dsort += 10;
      for (const slug of d.brands) {
        const brandId = idBySlug.get(slug);
        if (brandId) await dealerRepo.addBrand(dealer.id, brandId);
      }
    }
  }
}
