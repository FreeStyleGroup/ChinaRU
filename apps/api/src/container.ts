import {
  AnalyticsRepository,
  AuditRepository,
  CategoryRepository,
  OrderRepository,
  ProductImageRepository,
  ProductRepository,
  ReviewRepository,
  SellerRepository,
  UserRepository,
  type Database,
} from '@china-ru/db';

import { NoopCache, RedisCache, type Cache } from './cache/cache';
import { AccountService } from './domain/account/account.service';
import { AdminService } from './domain/admin/admin.service';
import { AuthService } from './domain/auth/auth.service';
import { ConsoleMailer, type Mailer } from './domain/auth/mailer';
import { PasswordService } from './domain/auth/password.service';
import { TokenService } from './domain/auth/token.service';
import { CatalogService } from './domain/catalog/catalog.service';
import { OrderService } from './domain/orders/order.service';
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
  createOrdersController,
  type OrdersController,
} from './http/controllers/orders.controller';
import { createAuthMiddleware, type AuthMiddleware } from './http/middleware/auth';

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
  controllers: {
    auth: AuthController;
    catalog: CatalogController;
    orders: OrdersController;
    admin: AdminController;
    account: AccountController;
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
  const analyticsRepo = new AnalyticsRepository(db);
  const auditRepo = new AuditRepository(db);

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
  });
  const catalog = new CatalogService(
    categoryRepo,
    productRepo,
    productImageRepo,
    cache,
    config.cache.categoriesTtl
  );
  const orders = new OrderService(orderRepo);
  const account = new AccountService(userRepo);
  const admin = new AdminService({
    users: userRepo,
    sellers: sellerRepo,
    products: productRepo,
    productImages: productImageRepo,
    orders: orderRepo,
    reviews: reviewRepo,
    analytics: analyticsRepo,
    audit: auditRepo,
  });

  return {
    authMiddleware: createAuthMiddleware({ tokens, auth }),
    controllers: {
      auth: createAuthController({ auth, tokens, config }),
      catalog: createCatalogController({ catalog }),
      orders: createOrdersController({ orders }),
      admin: createAdminController({ admin }),
      account: createAccountController({ account }),
    },
  };
}
