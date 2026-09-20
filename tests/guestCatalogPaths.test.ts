import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGuestCatalogProducts, resolveGuestCatalogPath } from '../api/app.ts';
import { calculateNetProfit, filterExpensesByOwnership } from '../src/utils.ts';

test('net profit preserves negative values when a period is operating at a loss', () => {
  assert.equal(calculateNetProfit(4430, 2496.5, 5000), -3066.5);
});

test('expense ownership filtering separates profit-sharing and consignment costs', () => {
  const expenses = [
    { id: 'e1', category: 'Rent', amount: 1000, description: 'Store lease', date: '2026-09-01', createdAt: '2026-09-01T00:00:00.000Z', inventoryType: 'owned' },
    { id: 'e2', category: 'Marketing', amount: 500, description: 'Consignment ad', date: '2026-09-02', createdAt: '2026-09-02T00:00:00.000Z', inventoryType: 'consignment' },
    { id: 'e3', category: 'Electricity', amount: 250, description: 'Shared utility bill', date: '2026-09-03', createdAt: '2026-09-03T00:00:00.000Z' },
  ] as any;

  assert.deepEqual(filterExpensesByOwnership(expenses, 'profit').map((item) => item.id), ['e1', 'e3']);
  assert.deepEqual(filterExpensesByOwnership(expenses, 'consignment').map((item) => item.id), ['e2']);
});

test('guest catalog includes sold-out items so they can be shown below available inventory', () => {
  const products = [
    {
      id: '1',
      sku: 'A-100',
      name: 'Available Item',
      category: 'Shoes',
      brand: 'Hai',
      srpPrice: 1200,
      storePrice: 1000,
      sellingPrice: 1000,
      currentStock: 4,
      minimumStock: 2,
      costPrice: 600,
      image: '👟',
      deletedAt: null,
    },
    {
      id: '2',
      sku: 'A-101',
      name: 'Sold Out Item',
      category: 'Shoes',
      brand: 'Hai',
      srpPrice: 1500,
      storePrice: 1300,
      sellingPrice: 1300,
      currentStock: 0,
      minimumStock: 2,
      costPrice: 700,
      image: '👟',
      deletedAt: null,
    },
    {
      id: '3',
      sku: 'A-102',
      name: 'Deleted Item',
      category: 'Shoes',
      brand: 'Hai',
      srpPrice: 2000,
      storePrice: 1800,
      sellingPrice: 1800,
      currentStock: 7,
      minimumStock: 2,
      costPrice: 900,
      image: '👟',
      deletedAt: '2024-01-01',
    },
  ] as any;

  const catalogProducts = buildGuestCatalogProducts(products);

  assert.equal(catalogProducts.length, 2);
  assert.deepEqual(catalogProducts.map((item) => item.name), ['Available Item', 'Sold Out Item']);
  assert.equal(catalogProducts[1].currentStock, 0);
});

test('guest catalog resolves to the project public file in local development', () => {
  delete process.env.VERCEL;
  delete process.env.AWS_LAMBDA_FUNCTION_NAME;
  delete process.env.NETLIFY;

  const path = resolveGuestCatalogPath();

  assert.match(path, /public\\catalog\.json$|public\/catalog\.json$/);
  assert.ok(path.includes('HaiInventorySystem'));
});

test('guest catalog resolves to temp storage in serverless runtimes', () => {
  process.env.VERCEL = '1';

  const path = resolveGuestCatalogPath();

  assert.match(path, /tmp|Temp|temp/i);
  assert.match(path, /catalog\.json$/);
  assert.ok(path.includes('hai-inventory'));

  delete process.env.VERCEL;
});
