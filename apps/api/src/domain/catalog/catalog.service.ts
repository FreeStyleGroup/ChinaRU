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
      depth: c.depth,
      sort: c.sort,
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

  /** Дерево категорий с кешем (редко меняется). Промах кеша → читаем БД и кладём. */
  async categoryTree(): Promise<CategoryTreeNode[]> {
    const cached = await this.cache.get<CategoryTreeNode[]>(CATEGORIES_CACHE_KEY);
    if (cached) return cached;
    const tree = toCategoryTree(await this.categories.listAll());
    await this.cache.set(CATEGORIES_CACHE_KEY, tree, this.categoriesTtl);
    return tree;
  }

  async listProducts(query: ProductListQuery): Promise<Paginated<ProductDto>> {
    const result = await this.products.list({
      page: query.page,
      limit: query.pageSize,
      sortBy: SORT_MAP[query.sort],
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
      ...(query.status ? { status: query.status } : {}),
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
    if (!product) throw new NotFoundError('Товар не найден', 'product_not_found');
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
