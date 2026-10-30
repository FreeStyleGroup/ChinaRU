import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { openApiDocument } from './spec';

const HTTP_METHODS: readonly string[] = ['get', 'post', 'put', 'patch', 'delete'];

/** `:id` → `{id}` — Express-параметры в форму OpenAPI. */
function toOpenApiPath(expressPath: string): string {
  return expressPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

/**
 * Маршруты /api/v1 из исходника routes.ts: все вызовы `router.<method>('<path>'`
 * внутри createV1Router (healthRouter монтируется на /api и в документ не входит).
 */
function registeredOperations(): string[] {
  const source = readFileSync(new URL('../routes.ts', import.meta.url), 'utf8');
  const start = source.indexOf('export function createV1Router');
  const end = source.indexOf('export function healthRouter');
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  const routeCall = /router\.(get|post|put|patch|delete)\(\s*'([^']+)'/g;
  return [...source.slice(start, end).matchAll(routeCall)].map(
    match => `${String(match[1]).toUpperCase()} ${toOpenApiPath(String(match[2]))}`
  );
}

/** Операции документа в том же формате `METHOD /path`. */
function documentedOperations(): string[] {
  return Object.entries(openApiDocument.paths).flatMap(([path, item]) =>
    Object.keys(item)
      .filter(method => HTTP_METHODS.includes(method))
      .map(method => `${method.toUpperCase()} ${path}`)
  );
}

describe('openApiDocument', () => {
  it('объявляет OpenAPI 3.1.0', () => {
    expect(openApiDocument.openapi).toBe('3.1.0');
  });

  it('описывает каждый маршрут routes.ts', () => {
    const routes = registeredOperations();
    // Защита от «зелёного» теста при сломанном регэкспе: маршрутов заведомо много.
    expect(routes.length).toBeGreaterThan(100);

    const documented = new Set(documentedOperations());
    expect(routes.filter(op => !documented.has(op))).toEqual([]);
  });

  it('не содержит операций, которых нет в routes.ts', () => {
    const routes = new Set(registeredOperations());
    expect(documentedOperations().filter(op => !routes.has(op))).toEqual([]);
  });
});
