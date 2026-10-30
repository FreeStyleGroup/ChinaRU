import {
  AnalyticsRepository,
  AuditRepository,
  CategoryRepository,
  isUniqueViolation,
  JobApplicationRepository,
  JobListingRepository,
  NotificationRepository,
  OrderRepository,
  PostCommentRepository,
  PostRepository,
  PriceRequestRepository,
  ProductImageRepository,
  ProductRepository,
  ReferralRepository,
  ResumeDocumentRepository,
  ResumeRepository,
  ReviewRepository,
  SellerRepository,
  TenderBidRepository,
  TenderRepository,
  UserRepository,
  FollowRepository,
  type Database,
  type NewProduct,
  type SellerProfile,
  type User,
} from '@china-ru/db';

import { AdminService } from '../domain/admin/admin.service';
import { ReviewService } from '../domain/catalog/review.service';
import { JobService } from '../domain/jobs/job.service';
import { OrderService } from '../domain/orders/order.service';
import { ReferralService } from '../domain/referral/referral.service';
import { SocialService } from '../domain/social/social.service';
import { PriceRequestService } from '../domain/store/price-request.service';
import { TenderService } from '../domain/tenders/tender.service';
import { AppError } from '../http/errors';

import type { AppConfig } from '../config';
import type { Storage } from '../storage/storage';
import type { CreateJobListingInput, CreateTenderInput } from '@china-ru/shared';

/**
 * Демонстрационное наполнение экземпляра для экспертизы реестра ПО: чтобы
 * разделы «Тендеры», «Работа», «Сообщество», заказы и запросы цены не были
 * пустыми. Каждая запись помечена как демонстрационная — в заголовке или
 * в тексте, — чтобы её не приняли за настоящую закупку или вакансию.
 *
 * Записи создаются через те же доменные сервисы, что и из интерфейса:
 * проверка подтверждения компании, модерация текста, уведомления, журнал
 * аудита админки — всё срабатывает так же. Повторный запуск ничего не
 * дублирует: каждая запись ищется по заголовку, тексту или артикулу.
 */

export const DEMO_NOTE = 'Демонстрационная запись: создана для проверки функций площадки.';
const DAY_MS = 24 * 60 * 60 * 1000;
/** Срок тендера и вакансий — с запасом на экспертизу (два-три месяца). */
const DEMO_TTL_DAYS = 150;
/** Раздел для демонстрационных товаров с ценой; если его нет — первый корневой. */
const DEMO_CATEGORY_SLUG = 'oborudovanie-dlya-metalla-dereva-i-kamney';

export interface DemoAccounts {
  buyerEmail: string;
  sellerEmail: string;
  adminEmail: string;
}

export interface DemoResult {
  products: number;
  orders: number;
  priceRequests: number;
  tenders: number;
  vacancies: number;
  posts: number;
}

type DemoConfig = Pick<AppConfig, 'apiPublicUrl' | 'webUrl'>;

const withNote = (text: string): string => `${text}\n\n${DEMO_NOTE}`;

/** Товары с ценой — только для демонстрации корзины и заказа. */
const DEMO_PRODUCTS = [
  {
    sku: 'DEMO-ORDER-1',
    slug: 'demo-komplekt-lent-dlya-lentochnopilnogo-stanka',
    nameRu: 'Демо: комплект пильных лент для ленточнопильного станка',
    nameEn: 'Demo: band saw blade set',
    nameZh: '演示：带锯条套装',
    descriptionRu: withNote(
      'Комплект из пяти биметаллических пильных лент для резки конструкционной стали.'
    ),
    price: '15000.00',
    stock: 20,
  },
  {
    sku: 'DEMO-ORDER-2',
    slug: 'demo-smazochno-okhlazhdayushchaya-zhidkost-20-l',
    nameRu: 'Демо: смазочно-охлаждающая жидкость, канистра 20 л',
    nameEn: 'Demo: cutting fluid, 20 L canister',
    nameZh: '演示：切削液，20升',
    descriptionRu: withNote('Концентрат СОЖ для металлообработки, разведение 1:20.'),
    price: '6400.00',
    stock: 40,
  },
] as const;

const DEMO_TENDER_TITLE = 'Демо: запрос котировок на ленточнопильный станок по металлу';

const DEMO_VACANCIES: (CreateJobListingInput & { publish: boolean })[] = [
  {
    title: 'Демо: менеджер по закупкам оборудования в Китае',
    category: 'trade',
    description: withNote(
      'Поиск поставщиков промышленного оборудования, переговоры с заводами, сопровождение ' +
        'сделки от запроса цены до отгрузки. Опыт закупок в Китае от двух лет, китайский язык ' +
        'на уровне HSK 4 и выше.'
    ),
    salaryMin: 120000,
    salaryMax: 180000,
    currency: 'rub',
    hskLevel: 4,
    workType: 'full_time',
    city: 'Санкт-Петербург',
    publish: true,
  },
  {
    // Остаётся на модерации — чтобы в админке была видна очередь проверки.
    title: 'Демо: инженер по пусконаладке промышленного оборудования',
    category: 'engineering',
    description: withNote(
      'Монтаж и пусконаладка станков и линий у заказчиков, обучение персонала, ' +
        'взаимодействие с инженерами завода-изготовителя. Командировки по России.'
    ),
    salaryMin: 150000,
    currency: 'rub',
    workType: 'contract',
    city: 'Санкт-Петербург',
    publish: false,
  },
];

const DEMO_COMPANY_POSTS = [
  withNote(
    'Открыли на площадке каталог промышленного оборудования: двенадцать разделов — от ' +
      'металлообработки до пищевых производств. У большинства позиций цена по запросу: ' +
      'укажите количество и условия поставки, и мы пришлём расчёт.'
  ),
  withNote(
    'Объявили запрос котировок на ленточнопильные станки по металлу. Приём заявок открыт ' +
      'в разделе «Тендеры», участвовать могут подтверждённые компании.'
  ),
];

const DEMO_BUYER_POST = withNote(
  'Ищем поставщика оборудования для фасовки сыпучих продуктов: производительность от ' +
    'тридцати упаковок в минуту, пакет дой-пак. Буду благодарен за рекомендации.'
);

export async function seedDemo(
  db: Database,
  storage: Storage,
  config: DemoConfig,
  accounts: DemoAccounts,
  log: (message: string) => void
): Promise<DemoResult> {
  const users = new UserRepository(db);
  const sellers = new SellerRepository(db);
  const categories = new CategoryRepository(db);
  const products = new ProductRepository(db);
  const productImages = new ProductImageRepository(db);
  const orderRepo = new OrderRepository(db);
  const notifications = new NotificationRepository(db);
  const listings = new JobListingRepository(db);

  const referrals = new ReferralService(new ReferralRepository(db), users, config.webUrl);
  const orders = new OrderService(orderRepo, referrals);
  const priceRequests = new PriceRequestService(
    products,
    sellers,
    new PriceRequestRepository(db),
    notifications
  );
  const tenders = new TenderService(
    new TenderRepository(db),
    new TenderBidRepository(db),
    sellers,
    notifications
  );
  const jobs = new JobService(
    new ResumeRepository(db),
    listings,
    sellers,
    new JobApplicationRepository(db),
    new ResumeDocumentRepository(db),
    storage
  );
  const social = new SocialService(
    new PostRepository(db),
    new PostCommentRepository(db),
    sellers,
    users,
    new FollowRepository(db),
    notifications,
    config.apiPublicUrl
  );
  const reviewRepo = new ReviewRepository(db);
  const admin = new AdminService({
    users,
    sellers,
    products,
    productImages,
    orders: orderRepo,
    reviews: reviewRepo,
    reviewService: new ReviewService(reviewRepo, products, orderRepo, sellers, users),
    resumes: new ResumeRepository(db),
    resumeDocuments: new ResumeDocumentRepository(db),
    listings,
    analytics: new AnalyticsRepository(db),
    audit: new AuditRepository(db),
  });

  /* ── Учётные записи ── */

  const requireUser = async (email: string, what: string): Promise<User> => {
    const user = await users.findByEmail(email);
    if (!user) throw new Error(`${what} ${email} не найден`);
    if (user.status !== 'active') throw new Error(`${what} ${email} не активен (${user.status})`);
    return user;
  };
  const buyer = await requireUser(accounts.buyerEmail, 'Покупатель');
  const sellerUser = await requireUser(accounts.sellerEmail, 'Продавец');
  const adminUser = await requireUser(accounts.adminEmail, 'Администратор');
  if (new Set([buyer.id, sellerUser.id, adminUser.id]).size !== 3) {
    throw new Error('Покупатель, продавец и администратор должны быть разными учётными записями');
  }
  if (adminUser.role !== 'admin') throw new Error(`${accounts.adminEmail} — не администратор`);
  const seller = await sellers.findByUserId(sellerUser.id);
  if (seller?.verifyStatus !== 'verified') {
    throw new Error(`У ${accounts.sellerEmail} нет подтверждённого магазина`);
  }
  if (await sellers.findByUserId(buyer.id)) {
    throw new Error(`${accounts.buyerEmail} — продавец; для покупателя нужна учётка без магазина`);
  }

  const result: DemoResult = {
    products: 0,
    orders: 0,
    priceRequests: 0,
    tenders: 0,
    vacancies: 0,
    posts: 0,
  };

  /* ── Товары с ценой и заказ ── */

  const demoProductIds = await ensureDemoProducts(seller, categories, products, log, result);
  const buyerOrders = await orderRepo.listByBuyer(buyer.id);
  let ordered = false;
  for (const order of buyerOrders) {
    const items = await orderRepo.listItems(order.id);
    if (items.some(i => demoProductIds.includes(i.productId))) ordered = true;
  }
  if (ordered) {
    log('Демо-заказ уже есть');
  } else if (demoProductIds.length === DEMO_PRODUCTS.length) {
    const [first, second] = demoProductIds as [string, string];
    const order = await orders.create(buyer.id, {
      items: [
        { productId: first, qty: 1 },
        { productId: second, qty: 2 },
      ],
    });
    result.orders++;
    log(`+ заказ № ${String(order.number)} на ${order.totalAmount} ₽`);
  }

  /* ── Запрос цены по товару из каталога ── */

  const onRequest = await products.list({
    sellerId: seller.id,
    status: 'active',
    sortBy: 'new',
    limit: 100,
  });
  const target = onRequest.rows.find(p => p.price === null);
  if (!target) {
    log('Запрос цены пропущен: у продавца нет товаров с ценой по запросу (сначала seed-catalog)');
  } else {
    try {
      await priceRequests.create(buyer.id, target.id, {
        qty: 2,
        comment:
          'Нужна поставка в Санкт-Петербург. Интересуют срок изготовления и условия гарантии. ' +
          DEMO_NOTE,
      });
      result.priceRequests++;
      log(`+ запрос цены: ${target.nameRu}`);
    } catch (error) {
      if (!(error instanceof AppError && error.code === 'price_request_exists')) throw error;
      log('Демо-запрос цены уже есть');
    }
  }

  /* ── Тендер ── */

  const myTenders = await tenders.listMyTenders(sellerUser.id, { page: 1, pageSize: 100 });
  if (myTenders.items.some(t => t.title === DEMO_TENDER_TITLE)) {
    log('Демо-тендер уже есть');
  } else {
    const input: CreateTenderInput = {
      title: DEMO_TENDER_TITLE,
      description: withNote(
        'Требуется ленточнопильный станок по металлу с гидравлическим прижимом и ' +
          'автоматической подачей, 2 шт. Диаметр резки круга — до 350 мм, угол реза ' +
          'от 0 до 60 градусов. В предложении укажите цену с доставкой, срок поставки ' +
          'и гарантию.'
      ),
      method: 'request_quotations',
      law: 'commercial',
      category: 'Оборудование для металла, дерева и камней',
      region: 'Санкт-Петербург',
      deliveryPlace: 'г. Санкт-Петербург',
      startPrice: '1800000.00',
      currency: 'rub',
      submissionDeadline: new Date(Date.now() + DEMO_TTL_DAYS * DAY_MS).toISOString(),
    };
    const draft = await tenders.createTender(sellerUser.id, input);
    await tenders.publishTender(sellerUser.id, draft.id);
    result.tenders++;
    log(`+ тендер «${DEMO_TENDER_TITLE}»`);
  }

  /* ── Вакансии ── */

  const myVacancies = await jobs.myVacancies(sellerUser.id);
  const expiresAt = new Date(Date.now() + DEMO_TTL_DAYS * DAY_MS).toISOString();
  for (const { publish, ...vacancy } of DEMO_VACANCIES) {
    if (myVacancies.some(v => v.title === vacancy.title)) {
      log(`Вакансия «${vacancy.title}» уже есть`);
      continue;
    }
    const created = await jobs.createVacancy(sellerUser.id, { ...vacancy, expiresAt });
    if (publish) {
      await admin.moderateVacancy(created.id, { status: 'published' }, { userId: adminUser.id });
    }
    result.vacancies++;
    log(`+ вакансия «${vacancy.title}»${publish ? ' (одобрена)' : ' (на модерации)'}`);
  }

  /* ── Сообщество ── */

  const postsBy = async (authorUserId: string): Promise<string[]> => {
    const feed = await social.getAuthorFeed({ authorUserId }, { page: 1, pageSize: 100 }, null);
    return feed.items.map(p => p.body);
  };
  const sellerPosts = await postsBy(sellerUser.id);
  for (const body of DEMO_COMPANY_POSTS) {
    if (sellerPosts.includes(body)) continue;
    await social.createPost(sellerUser.id, { body, asCompany: true });
    result.posts++;
  }
  if (!(await postsBy(buyer.id)).includes(DEMO_BUYER_POST)) {
    await social.createPost(buyer.id, { body: DEMO_BUYER_POST, asCompany: false });
    result.posts++;
  }

  return result;
}

async function ensureDemoProducts(
  seller: SellerProfile,
  categories: CategoryRepository,
  products: ProductRepository,
  log: (message: string) => void,
  result: DemoResult
): Promise<string[]> {
  const category =
    (await categories.findBySlug(DEMO_CATEGORY_SLUG)) ??
    (await categories.listChildren(null))[0] ??
    null;
  if (!category) {
    log('Демо-товары пропущены: в каталоге нет разделов (сначала seed.js или seed-catalog)');
    return [];
  }

  const ids: string[] = [];
  for (const p of DEMO_PRODUCTS) {
    const existing = await products.findBySellerSku(seller.id, p.sku);
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const row: NewProduct = {
      sellerId: seller.id,
      categoryId: category.id,
      slug: p.slug,
      sku: p.sku,
      nameRu: p.nameRu,
      nameEn: p.nameEn,
      nameZh: p.nameZh,
      descriptionRu: p.descriptionRu,
      price: p.price,
      stock: p.stock,
      status: 'active',
    };
    try {
      const created = await products.create(row);
      ids.push(created.id);
      result.products++;
      log(`+ демо-товар «${p.nameRu}»`);
    } catch (error) {
      // Продавец удалил демо-товар сам (артикул остаётся за удалённой строкой) — не возвращаем.
      if (!isUniqueViolation(error)) throw error;
      log(`Демо-товар «${p.nameRu}» удалён продавцом — заказ не создаётся`);
    }
  }
  return ids;
}
