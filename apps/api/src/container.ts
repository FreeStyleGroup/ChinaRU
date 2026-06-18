import {
  AnalyticsRepository,
  ArticleRepository,
  AuditRepository,
  CategoryRepository,
  ContentAgentRepository,
  JobApplicationRepository,
  JobListingRepository,
  OrderRepository,
  ProductImageRepository,
  ProductRepository,
  ReferralRepository,
  ResumeDocumentRepository,
  ResumeRepository,
  ReviewRepository,
  SellerRepository,
  UserRepository,
  type Database,
} from '@china-ru/db';

import { createAiProvider } from './ai/factory';
import { NoopCache, RedisCache, type Cache } from './cache/cache';
import { AccountService } from './domain/account/account.service';
import { AdminService } from './domain/admin/admin.service';
import { AuthService } from './domain/auth/auth.service';
import { ConsoleMailer, type Mailer } from './domain/auth/mailer';
import { PasswordService } from './domain/auth/password.service';
import { TokenService } from './domain/auth/token.service';
import { CatalogService } from './domain/catalog/catalog.service';
import { ContentService } from './domain/content/content.service';
import { HoroscopeService } from './domain/horoscope/horoscope.service';
import { JobService } from './domain/jobs/job.service';
import { OrderService } from './domain/orders/order.service';
import { ReferralService } from './domain/referral/referral.service';
import {
  createAccountController,
  type AccountController,
} from './http/controllers/account.controller';
import { createAdminController, type AdminController } from './http/controllers/admin.controller';
import { createAuthController, type AuthController } from './http/controllers/auth.controller';
import {
  createCatalogController,
  type CatalogController,
} from './http/controllers/catalog.controller';
import {
  createContentController,
  type ContentController,
} from './http/controllers/content.controller';
import { createFilesController, type FilesController } from './http/controllers/files.controller';
import { createJobController, type JobController } from './http/controllers/job.controller';
import {
  createOrdersController,
  type OrdersController,
} from './http/controllers/orders.controller';
import {
  createReferralController,
  type ReferralController,
} from './http/controllers/referral.controller';
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
    orders: OrdersController;
    admin: AdminController;
    account: AccountController;
    jobs: JobController;
    referral: ReferralController;
    content: ContentController;
    files: FilesController;
  };
}

/** Композиционный корень: собирает репозитории → сервисы → контроллеры из одного Database. */
export function createContainer(deps: ContainerDeps): Container {
  const { db, config, logger } = deps;
  const mailer = deps.mailer ?? new ConsoleMailer(logger);

  const userRepo = new UserRepository(db);
  const sellerRepo = new SellerRepository(db);
  const categoryRepo = new CategoryRepository(db);
  const productRepo = new ProductRepository(db);
  const productImageRepo = new ProductImageRepository(db);
  const orderRepo = new OrderRepository(db);
  const reviewRepo = new ReviewRepository(db);
  const resumeRepo = new ResumeRepository(db);
  const resumeDocumentRepo = new ResumeDocumentRepository(db);
  const jobListingRepo = new JobListingRepository(db);
  const jobApplicationRepo = new JobApplicationRepository(db);
  const referralRepo = new ReferralRepository(db);
  const analyticsRepo = new AnalyticsRepository(db);
  const auditRepo = new AuditRepository(db);
  const contentAgentRepo = new ContentAgentRepository(db);
  const articleRepo = new ArticleRepository(db);

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
  const referrals = new ReferralService(referralRepo, userRepo);
  const catalog = new CatalogService(
    categoryRepo,
    productRepo,
    productImageRepo,
    cache,
    config.cache.categoriesTtl
  );
  const orders = new OrderService(orderRepo, referrals);
  const account = new AccountService(userRepo, sellerRepo, storage, config.apiPublicUrl);
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
  const admin = new AdminService({
    users: userRepo,
    sellers: sellerRepo,
    products: productRepo,
    productImages: productImageRepo,
    orders: orderRepo,
    reviews: reviewRepo,
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
      orders: createOrdersController({ orders }),
      admin: createAdminController({ admin }),
      account: createAccountController({ account, horoscope }),
      jobs: createJobController({ jobs }),
      referral: createReferralController({ referrals }),
      content: createContentController({ content }),
      files: createFilesController({ storage }),
    },
  };
}
