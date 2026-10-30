import type { CategoryTreeNode } from '@china-ru/shared';

/**
 * Путь от корня дерева до раздела: [верхний, …, сам раздел]. Пустой массив —
 * раздела нет в дереве (удалён или чужой id в адресе).
 */
export function findCategoryPath(nodes: CategoryTreeNode[], id: string): CategoryTreeNode[] {
  for (const node of nodes) {
    if (node.id === id) return [node];
    const tail = findCategoryPath(node.children, id);
    if (tail.length > 0) return [node, ...tail];
  }
  return [];
}

/** Адрес раздела каталога (сортировка и страница — по желанию). */
export function categoryHref(
  categoryId: string | undefined,
  extra: Record<string, string | undefined> = {}
): string {
  const params = new URLSearchParams();
  if (categoryId) params.set('categoryId', categoryId);
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/catalog?${qs}` : '/catalog';
}
