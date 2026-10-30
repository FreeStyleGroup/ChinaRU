import {
  AnalyticsRepository,
  ArticleRepository,
  AuditRepository,
  CartRepository,
  CategoryRepository,
  ContentAgentRepository,
  FollowRepository,
  JobApplicationRepository,
  JobListingRepository,
  NotificationRepository,
  OrderRepository,
  PostCommentRepository,
  PostRepository,
  PriceRequestRepository,
  ReportRepository,
  ProductImageRepository,
  ProductRepository,
  ReferralRepository,
  ResumeDocumentRepository,
  ResumeRepository,
  ReviewRepository,
  SellerRepository,
  TenderBidRepository,
  TenderRepository,
  VehicleBrandRepository,
  VehicleModelRepository,
  DealerRepository,
  GarageRepository,
  ProductFitmentRepository,
  UserRepository,
  type Database,
} from '@china-ru/db';

import { createAiProvider } from './ai/factory';
import { NoopCache, RedisCache, type Cache } from './cache/cache';
import { AccountService } from './domain/account/account.service';
import { NotificationService } from './domain/account/notification.service';
import { AdminService } from './domain/admin/admin.service';
import { AuthService } from './domain/auth/auth.service';
import { ConsoleMailer, SmtpMailer, type Mailer } from './domain/auth/mailer';
import { PasswordService } from './domain/auth/password.service';
import { TokenService } from './domain/auth/token.service';
import { CartService } from './domain/cart/cart.service';
import { CatalogService } from './domain/catalog/catalog.service';
import { ReviewService } from './domain/catalog/review.service';
import { ContentService } from './domain/content/content.service';
import { HoroscopeService } from './domain/horoscope/horoscope.service';
import { JobService } from './domain/jobs/job.service';
import { OrderService } from './domain/orders/order.service';
import { ReferralService } from './domain/referral/referral.service';
import { SellerOrderService } from './domain/seller/seller-order.service';
import { SellerProductService } from './domain/seller/seller-product.service';
import { ReportService } from './domain/social/report.service';
import { SocialService } from './domain/social/social.service';
import { PriceRequestService } from './domain/store/price-request.service';
import { StoreService } from './domain/store/store.service';
import { TenderService } from './domain/tenders/tender.service';
import { GarageService } from './domain/vehicles/garage.service';
import { DealerService, VehicleService } from './domain/vehicles/vehicle.service';
import {
  createAccountController,
  type AccountController,
} from './http/controllers/account.controller';
import { createAdminController, type AdminController } from './http/controllers/admin.controller';
import { createAuthController, type AuthController } from './http/controllers/auth.controller';
import { createCartController, type CartController } from './http/controllers/cart.controller';
import {
  createCatalogController,
  type CatalogController,
} from './http/controllers/catalog.controller';
import {
  createContentController,
  type ContentController,
} from './http/controllers/content.controller';
import { createFilesController, type FilesController } from './http/controllers/files.controller';
import {
  createGarageController,
  type GarageController,
} from './http/controllers/garage.controller';
import { createJobController, type JobController } from './http/controllers/job.controller';
import {
  createOrdersController,
  type OrdersController,
} from './http/controllers/orders.controller';
import {
  createPriceRequestsController,
  type PriceRequestsController,
} from './http/controllers/price-requests.controller';
import {
  createReferralController,
  type ReferralController,
} from './http/controllers/referral.controller';
import {
  createReviewsController,
  type ReviewsController,
} from './http/controllers/reviews.controller';
import {
  createSellerOrdersController,
  type SellerOrdersController,
} from './http/controllers/seller-orders.controller';
import {
  createSellerProductsController,
  type SellerProductsController,
} from './http/controllers/seller-products.controller';
import {
  createSocialController,
  type SocialController,
} from './http/controllers/social.controller';
import { createStoreController, type StoreController } from './http/controllers/store.controller';
import {
  createTenderController,
  type TenderController,
} from './http/controllers/tender.controller';
import {
  createVehicleController,
  type VehicleController,
} from './http/controllers/vehicle.controller';
import { createAuthMiddleware, type AuthMiddleware } from './http/middleware/auth';
import { createStorage, type Storage } from './storage/storage';

import type { AppConfig } from './config';
import type { Logger } from 'pino';

export interface ContainerDeps {
  db: Database;
  config: AppConfig;
  logger: Logger;
  /** Переопределяемо в тестах (фейковый транспорт писем). */
  mailer?: Mailer;
}

export interface Container {
  authMiddleware: AuthMiddleware;
  storage: Storage;
  controllers: {
    auth: AuthController;
    catalog: CatalogController;
    reviews: ReviewsController;
    cart: CartController;
    orders: OrdersController;
    admin: AdminController;
    account: AccountController;
    jobs: JobController;
    referral: ReferralController;
    sellerProducts: SellerProductsController;
    sellerOrders: SellerOrdersController;
    content: ContentController;
    files: FilesController;
    social: SocialController;
    tenders: TenderController;
    vehicles: VehicleController;
    garage: GarageController;
    store: StoreController;
    priceRequests: PriceRequestsController;
  };
}

/**
 * SMTP задан — письма уходят по-настоящему. Не задан — заглушка: в разработке
 * пишет токены в лог, в production только предупреждает (подтверждение почты
 * и восстановление пароля без SMTP не работают — об этом сразу при запуске).
 */
function createMailer(config: AppConfig, logger: Logger): Mailer {
  if (config.smtp.enabled) {
    return new SmtpMailer(config.smtp, config.webUrl, logger);
  }
  if (config.nodeEnv === 'production') {
    logger.warn(
      'SMTP не настроен (SMTP_HOST пуст): письма подтверждения почты и сброса пароля не отправляются'
    );
  }
  return new ConsoleMailer(logger, config.nodeEnv !== 'production');
}

/** Композиционный корень: собирает репозитории → сервисы → контроллеры из одного Database. */
export function createContainer(deps: ContainerDeps): Container {
  const { db, config, logger } = deps;
  const mailer = deps.mailer ?? createMailer(config, logger);

  const userRepo = new UserRepository(db);
  const sellerRepo = new SellerRepository(db);
  const categoryRepo = new CategoryRepository(db);
  const productRepo = new ProductRepository(db);
  const productImageRepo = new ProductImageRepository(db);
  const orderRepo = new OrderRepository(db);
  const cartRepo = new CartRepository(db);
  const reviewRepo = new ReviewRepository(db);
  const resumeRepo = new ResumeRepository(db);
  const resumeDocumentRepo = new ResumeDocumentRepository(db);
  const postRepo = new PostRepository(db);
  const postCommentRepo = new PostCommentRepository(db);
  const followRepo = new FollowRepository(db);
  const reportRepo = new ReportRepository(db);
  const notificationRepo = new NotificationRepository(db);
  const tenderRepo = new TenderRepository(db);
  const tenderBidRepo = new TenderBidRepository(db);
  const vehicleBrandRepo = new VehicleBrandRepository(db);
  const vehicleModelRepo = new VehicleModelRepository(db);
  const dealerRepo = new DealerRepository(db);
  const garageRepo = new GarageRepository(db);
  const productFitmentRepo = new ProductFitmentRepository(db);
  const jobListingRepo = new JobListingRepository(db);
  const jobApplicationRepo = new JobApplicationRepository(db);
  const referralRepo = new ReferralRepository(db);
  const analyticsRepo = new AnalyticsRepository(db);
  const auditRepo = new AuditRepository(db);
  const contentAgentRepo = new ContentAgentRepository(db);
  const articleRepo = new ArticleRepository(db);
  const priceRequestRepo = new PriceRequestRepository(db);

  const ai = createAiProvider(config, logger);
  const storage = createStorage(config, logger);

  const cache: Cache = config.cache.enabled
    ? new RedisCache(config.cache.redisUrl, logger)
    : new NoopCache();

  const passwords = new PasswordService(config.bcrypt.cost);
  const tokens = new TokenService(
    db,
    {
      accessSecret: config.jwt.accessSecret,
      refreshSecret: config.jwt.refreshSecret,
      accessTtl: config.jwt.accessTtl,
      refreshTtl: config.jwt.refreshTtl,
      refreshTtlMobile: config.jwt.refreshTtlMobile,
    },
    logger
  );

  const auth = new AuthService({
    db,
    users: userRepo,
    tokens,
    passwords,
    mailer,
    registrationOpen: config.features.registrationOpen,
    referrals: referralRepo,
  });
  const referrals = new ReferralService(referralRepo, userRepo, config.webUrl);
  const catalog = new CatalogService(
    categoryRepo,
    productRepo,
    productImageRepo,
    cache,
    config.cache.categoriesTtl
  );
  const orders = new OrderService(orderRepo, referrals);
  const reviews = new ReviewService(reviewRepo, productRepo, orderRepo, sellerRepo, userRepo);
  const cart = new CartService(cartRepo, productRepo, orders);
  const sellerProducts = new SellerProductService(
    sellerRepo,
    productRepo,
    productImageRepo,
    storage,
    config.apiPublicUrl,
    ai
  );
  const sellerOrders = new SellerOrderService(sellerRepo, orderRepo, notificationRepo);
  const store = new StoreService(sellerRepo, productRepo, storage, config.apiPublicUrl);
  const priceRequests = new PriceRequestService(
    productRepo,
    sellerRepo,
    priceRequestRepo,
    notificationRepo
  );
  const account = new AccountService(userRepo, sellerRepo, storage, config.apiPublicUrl);
  const notificationService = new NotificationService(notificationRepo);
  const horoscope = new HoroscopeService(userRepo, ai, cache);
  const jobs = new JobService(
    resumeRepo,
    jobListingRepo,
    sellerRepo,
    jobApplicationRepo,
    resumeDocumentRepo,
    storage
  );
  const content = new ContentService(contentAgentRepo, articleRepo, ai);
  const social = new SocialService(
    postRepo,
    postCommentRepo,
    sellerRepo,
    userRepo,
    followRepo,
    notificationRepo,
    config.apiPublicUrl
  );
  const reports = new ReportService(reportRepo, notificationRepo, userRepo, postRepo);
  const tenders = new TenderService(tenderRepo, tenderBidRepo, sellerRepo, notificationRepo);
  const vehicles = new VehicleService(vehicleBrandRepo, vehicleModelRepo);
  const dealers = new DealerService(dealerRepo);
  const garage = new GarageService(
    garageRepo,
    vehicleBrandRepo,
    vehicleModelRepo,
    productFitmentRepo,
    productImageRepo
  );
  const admin = new AdminService({
    users: userRepo,
    sellers: sellerRepo,
    products: productRepo,
    productImages: productImageRepo,
    orders: orderRepo,
    reviews: reviewRepo,
    reviewService: reviews,
    resumes: resumeRepo,
    resumeDocuments: resumeDocumentRepo,
    listings: jobListingRepo,
    analytics: analyticsRepo,
    audit: auditRepo,
  });

  return {
    authMiddleware: createAuthMiddleware({ tokens, auth }),
    storage,
    controllers: {
      auth: createAuthController({ auth, tokens, config }),
      catalog: createCatalogController({ catalog }),
      reviews: createReviewsController({ reviews }),
      cart: createCartController({ cart }),
      orders: createOrdersController({ orders }),
      admin: createAdminController({ admin }),
      account: createAccountController({ account, horoscope, notifications: notificationService }),
      jobs: createJobController({ jobs }),
      referral: createReferralController({ referrals }),
      sellerProducts: createSellerProductsController({ sellerProducts }),
      sellerOrders: createSellerOrdersController({ sellerOrders }),
      content: createContentController({ content }),
      files: createFilesController({ storage }),
      social: createSocialController({ social, reports }),
      tenders: createTenderController({ tenders }),
      vehicles: createVehicleController({ vehicles, dealers }),
      garage: createGarageController({ garage }),
      store: createStoreController({ store }),
      priceRequests: createPriceRequestsController({ priceRequests }),
    },
  };
}
