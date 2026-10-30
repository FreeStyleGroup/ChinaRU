import { paginate } from '@china-ru/shared';

import { NotFoundError } from '../../http/errors';
import { toProductDto } from '../dto';

import type { Cache } from '../../cache/cache';
import type {
  Category,
  CategoryRepository,
  ProductImage,
  ProductImageRepository,
  ProductRepository,
  ProductSort as RepoProductSort,
} from '@china-ru/db';
import type { CategoryTreeNode, Paginated, ProductDto, ProductListQuery } from '@china-ru/shared';

/** Ключ дерева категорий в кеше. Сбрасывается и при наполнении базы (src/seed.ts). */
export const CATEGORIES_CACHE_KEY = 'catalog:categories:tree';

function toCategoryTree(cats: Category[]): CategoryTreeNode[] {
  const nodes = new Map<string, CategoryTreeNode>();
  for (const c of cats) {
    nodes.set(c.id, {
      id: c.id,
      parentId: c.parentId,
      slug: c.slug,
      nameRu: c.nameRu,
      nameEn: c.nameEn,
      nameZh: c.nameZh,
      descriptionRu: c.descriptionRu,
      descriptionEn: c.descriptionEn,
      descriptionZh: c.descriptionZh,
      imageUrl: c.imageUrl,
      depth: c.depth,
      sort: c.sort,
      productCount: 0,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      children: [],
    });
  }
  const roots: CategoryTreeNode[] = [];
  for (const c of cats) {
    const node = nodes.get(c.id);
    if (!node) continue;
    const parent = c.parentId ? nodes.get(c.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

const SORT_MAP: Record<ProductListQuery['sort'], RepoProductSort> = {
  newest: 'new',
  price_asc: 'price_asc',
  price_desc: 'price_desc',
  rating: 'rating',
};

export class CatalogService {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly products: ProductRepository,
    private readonly images: ProductImageRepository,
    private readonly cache: Cache,
    private readonly categoriesTtl: number
  ) {}

  /**
   * Дерево категорий со счётчиками активных товаров (свои + все подразделы).
   * Структура дерева меняется редко и берётся из кеша; счётчики меняются с
   * каждым товаром, поэтому считаются при каждом запросе одним GROUP BY и в кеш
   * не попадают — иначе витрина час показывала бы устаревшие числа.
   */
  async categoryTree(): Promise<CategoryTreeNode[]> {
    let tree = await this.cache.get<CategoryTreeNode[]>(CATEGORIES_CACHE_KEY);
    if (!tree) {
      tree = toCategoryTree(await this.categories.listAll());
      await this.cache.set(CATEGORIES_CACHE_KEY, tree, this.categoriesTtl);
    }
    const counts = await this.products.countActiveByCategory();
    const withCounts = (node: CategoryTreeNode): CategoryTreeNode => {
      const children = node.children.map(withCounts);
      const own = counts.get(node.id) ?? 0;
      return {
        ...node,
        children,
        productCount: own + children.reduce((sum, c) => sum + c.productCount, 0),
      };
    };
    return tree.map(withCounts);
  }

  /**
   * Публичная выдача — только опубликованные товары. Фильтр `status` из запроса
   * здесь не действует: черновики и снятые модератором товары видят продавец (в
   * кабинете) и администратор (в админке), но не витрина.
   */
  async listProducts(query: ProductListQuery): Promise<Paginated<ProductDto>> {
    const result = await this.products.list({
      page: query.page,
      limit: query.pageSize,
      sortBy: SORT_MAP[query.sort],
      status: 'active',
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
      ...(query.minPrice !== undefined ? { minPrice: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { maxPrice: query.maxPrice } : {}),
      ...(query.search ? { search: query.search } : {}),
    });

    const imagesByProduct = await this.groupImages(result.rows.map(p => p.id));
    const items = result.rows.map(p => toProductDto(p, imagesByProduct.get(p.id) ?? []));
    return paginate(items, result.total, { page: query.page, pageSize: query.pageSize });
  }

  async getProductBySlug(slug: string): Promise<ProductDto> {
    const product = await this.products.findBySlug(slug);
    if (product?.status !== 'active') {
      throw new NotFoundError('Товар не найден', 'product_not_found');
    }
    const images = await this.images.listByProduct(product.id);
    return toProductDto(product, images);
  }

  private async groupImages(productIds: string[]): Promise<Map<string, ProductImage[]>> {
    const rows = await this.images.listByProductIds(productIds);
    const map = new Map<string, ProductImage[]>();
    for (const img of rows) {
      const list = map.get(img.productId);
      if (list) list.push(img);
      else map.set(img.productId, [img]);
    }
    return map;
  }
}
