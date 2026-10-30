import { describe, expect, it } from 'vitest';

import { gridColumns, productGrid, tileGrid } from './grid';

describe('gridColumns', () => {
  it('puts up to four cards in one row', () => {
    expect(gridColumns(0)).toBe(1);
    expect(gridColumns(1)).toBe(1);
    expect(gridColumns(3)).toBe(3);
    expect(gridColumns(4)).toBe(4);
  });

  it('prefers an exact division, then the fuller last row, then more columns', () => {
    expect(gridColumns(12)).toBe(4);
    expect(gridColumns(9)).toBe(3);
    expect(gridColumns(6)).toBe(3);
    expect(gridColumns(8)).toBe(4);
    expect(gridColumns(7)).toBe(4);
    expect(gridColumns(5)).toBe(3);
    expect(gridColumns(10)).toBe(4);
    expect(gridColumns(11)).toBe(4);
    // 4·3 = 12: и 4, и 3 делят нацело — при равенстве колонок больше.
    expect(gridColumns(24)).toBe(4);
  });
});

describe('tileGrid', () => {
  it('lays 12 tiles out as 4 columns on desktop and 2 on phones', () => {
    const { grid, item } = tileGrid(12);
    expect(grid).toContain('grid-cols-2');
    expect(grid).toContain('lg:grid-cols-4');
    expect(item(11)).toBe('');
  });

  it('stretches the odd last tile where the grid has two columns', () => {
    const seven = tileGrid(7);
    expect(seven.grid).toContain('md:grid-cols-2');
    expect(seven.item(6)).toBe('col-span-2 lg:col-span-1');
    expect(seven.item(5)).toBe('');

    const nine = tileGrid(9);
    expect(nine.grid).toContain('md:grid-cols-3');
    expect(nine.item(8)).toBe('col-span-2 md:col-span-1');
  });

  it('uses a single column for a single tile', () => {
    expect(tileGrid(1).grid).toContain('grid-cols-1');
    expect(tileGrid(1).item(0)).toBe('');
  });
});

describe('productGrid', () => {
  it('never drops below three columns on wide screens', () => {
    expect(productGrid(1)).toContain('lg:grid-cols-3');
    expect(productGrid(12)).toContain('lg:grid-cols-4');
    expect(productGrid(9)).toContain('lg:grid-cols-3');
  });
});
