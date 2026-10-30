import { describe, expect, it } from 'vitest';

import { categoryHref, findCategoryPath } from './categories';

import type { CategoryTreeNode } from '@china-ru/shared';

function node(id: string, children: CategoryTreeNode[] = []): CategoryTreeNode {
  return {
    id,
    parentId: null,
    slug: id,
    nameRu: id,
    nameEn: null,
    nameZh: null,
    descriptionRu: null,
    descriptionEn: null,
    descriptionZh: null,
    imageUrl: null,
    depth: 0,
    sort: 0,
    productCount: 0,
    children,
    createdAt: '2026-06-12T00:00:00.000Z',
    updatedAt: '2026-06-12T00:00:00.000Z',
  };
}

const tree = [node('a', [node('a1'), node('a2', [node('a2x')])]), node('b')];

describe('findCategoryPath', () => {
  it('returns the chain from the root to the category', () => {
    expect(findCategoryPath(tree, 'a2x').map(n => n.id)).toEqual(['a', 'a2', 'a2x']);
    expect(findCategoryPath(tree, 'b').map(n => n.id)).toEqual(['b']);
  });

  it('returns an empty path for an unknown id', () => {
    expect(findCategoryPath(tree, 'zzz')).toEqual([]);
  });
});

describe('categoryHref', () => {
  it('builds the catalog URL with optional parameters', () => {
    expect(categoryHref(undefined)).toBe('/catalog');
    expect(categoryHref('a', { sort: 'newest', page: undefined })).toBe(
      '/catalog?categoryId=a&sort=newest'
    );
  });
});
