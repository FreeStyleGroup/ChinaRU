import {
  CategoryRepository,
  OrderRepository,
  ProductImageRepository,
  ProductRepository,
  UserRepository,
  type Database,
} from '@china-ru/db';

import { AuthService } from './domain/auth/auth.service';
import { ConsoleMailer, type Mailer } from './domain/auth/mailer';
import { PasswordService } from './domain/auth/password.service';
import { TokenService } from './domain/auth/token.service';
import { CatalogService } from './domain/catalog/catalog.service';
import { OrderService } from './domain/orders/order.service';
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
  };
}

/** Композиционный корень: собирает репозитории → сервисы → контроллеры из одного Database. */
export function createContainer(deps: ContainerDeps): Container {
  const { db, config, logger } = deps;
  const mailer = deps.mailer ?? new ConsoleMailer(logger);

  const userRepo = new UserRepository(db);
  const categoryRepo = new CategoryRepository(db);
  const productRepo = new ProductRepository(db);
  const productImageRepo = new ProductImageRepository(db);
  const orderRepo = new OrderRepository(db);

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
  const catalog = new CatalogService(categoryRepo, productRepo, productImageRepo);
  const orders = new OrderService(orderRepo);

  return {
    authMiddleware: createAuthMiddleware({ tokens, auth }),
    controllers: {
      auth: createAuthController({ auth, tokens, config }),
      catalog: createCatalogController({ catalog }),
      orders: createOrdersController({ orders }),
    },
  };
}
