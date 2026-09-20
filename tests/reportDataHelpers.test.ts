import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInventoryAssetRows, buildPartnerPayoutRows, filterInventoryByOwnership, filterPayoutRowsByOwnership } from '../src/utils.ts';

test('inventory asset rows calculate stock valuation correctly for report output', () => {
  const rows = buildInventoryAssetRows([
    {
      id: 'p1',
      sku: 'SKU-1',
      barcode: '123',
      name: 'Widget',
      description: '',
      category: 'Tools',
      brand: 'Acme',
      supplier: 'Supplier A',
      costPrice: 120,
      sellingPrice: 180,
      storePrice: 180,
      currentStock: 4,
      minimumStock: 2,
      image: '',
      status: 'In Stock',
      createdAt: '2025-01-01',
    },
    {
      id: 'p2',
      sku: 'SKU-2',
      barcode: '456',
      name: 'Gadget',
      description: '',
      category: 'Tools',
      brand: 'Acme',
      supplier: 'Supplier B',
      costPrice: 50,
      sellingPrice: 90,
      storePrice: 90,
      currentStock: 3,
      minimumStock: 1,
      image: '',
      status: 'In Stock',
      createdAt: '2025-01-02',
    },
  ]);

  assert.deepEqual(rows.map((row) => ({ sku: row.sku, valuation: row.assetValuation })), [
    { sku: 'SKU-1', valuation: 480 },
    { sku: 'SKU-2', valuation: 150 },
  ]);
});

test('stakeholder payout rows flatten monthly distributions for the payout history report', () => {
  const rows = buildPartnerPayoutRows([
    {
      id: 'd1',
      month: '2025-02',
      revenue: 5000,
      cogs: 2000,
      expenses: 500,
      netProfit: 2500,
      distributedAmount: 2500,
      distributions: [
        { partnerId: 'p1', partnerName: 'Alice', percentage: 50, amount: 1250 },
        { partnerId: 'p2', partnerName: 'Bob', percentage: 50, amount: 1250 },
      ],
      createdAt: '2025-02-10',
    },
  ]);

  assert.deepEqual(rows, [
    {
      month: '2025-02',
      partnerName: 'Alice',
      percentage: 50,
      amount: 1250,
    },
    {
      month: '2025-02',
      partnerName: 'Bob',
      percentage: 50,
      amount: 1250,
    },
  ]);
});

test('report scope filters inventory and payouts by ownership type', () => {
  const products = [
    {
      id: 'owned',
      sku: 'OWN-1',
      barcode: '1',
      name: 'Owned item',
      description: '',
      category: 'Tools',
      brand: 'Acme',
      supplier: 'Supplier A',
      costPrice: 100,
      sellingPrice: 150,
      storePrice: 150,
      currentStock: 2,
      minimumStock: 1,
      image: '',
      status: 'In Stock',
      createdAt: '2025-01-01',
      inventoryType: 'owned',
    },
    {
      id: 'consignment',
      sku: 'CONS-1',
      barcode: '2',
      name: 'Consignment item',
      description: '',
      category: 'Tools',
      brand: 'Acme',
      supplier: 'Supplier B',
      costPrice: 0,
      sellingPrice: 200,
      storePrice: 200,
      currentStock: 5,
      minimumStock: 1,
      image: '',
      status: 'In Stock',
      createdAt: '2025-01-02',
      inventoryType: 'consignment',
    },
  ] as any;

  assert.deepEqual(filterInventoryByOwnership(products, 'profit').map((item) => item.sku), ['OWN-1']);
  assert.deepEqual(filterInventoryByOwnership(products, 'consignment').map((item) => item.sku), ['CONS-1']);
  assert.deepEqual(filterPayoutRowsByOwnership([
    {
      id: 'd1',
      month: '2025-02',
      revenue: 1000,
      cogs: 400,
      expenses: 100,
      netProfit: 500,
      distributedAmount: 500,
      distributions: [{ partnerId: 'p1', partnerName: 'Alice', percentage: 100, amount: 500 }],
      createdAt: '2025-02-01',
    },
  ], 'profit'), [
    { month: '2025-02', partnerName: 'Alice', percentage: 100, amount: 500 },
  ]);
  assert.deepEqual(filterPayoutRowsByOwnership([
    {
      id: 'd1',
      month: '2025-02',
      revenue: 1000,
      cogs: 400,
      expenses: 100,
      netProfit: 500,
      distributedAmount: 500,
      distributions: [{ partnerId: 'p1', partnerName: 'Alice', percentage: 100, amount: 500 }],
      createdAt: '2025-02-01',
    },
  ], 'consignment'), []);
});
