import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInventoryAssetRows,
  buildMonthlySalesSummaries,
  buildPartnerPayoutRows,
  buildTransactionItemSummary,
  calculateTotalInvestment,
  filterInventoryByOwnership,
  filterPayoutRowsByOwnership,
  getTransactionSellerPayout,
} from '../src/utils.ts';

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

test('dashboard total investment follows the configured business formula', () => {
  assert.equal(calculateTotalInvestment({
    monthlySales: 150000,
    netProfitForCycle: 45000,
    totalCostValuation: 65000,
  }), 170000);
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

test('daily and monthly report summaries include sold-item names', () => {
  const transactions = [{
    id: 'sale-1',
    invoiceNo: 'INV-001',
    items: [
      {
        productId: 'p1',
        name: 'Classic Tee',
        sku: 'TEE-01',
        costPrice: 220,
        sellingPrice: 399,
        quantity: 2,
        discount: 0,
        totalPrice: 798,
        selectedSize: 'M',
      },
      {
        productId: 'p2',
        name: 'Trail Runner',
        sku: 'RUN-01',
        costPrice: 1100,
        sellingPrice: 2200,
        quantity: 1,
        discount: 0,
        totalPrice: 2200,
      },
    ],
    subtotal: 2998,
    discountAmount: 0,
    total: 2998,
    costOfGoodsSold: 1540,
    profit: 1458,
    paymentMethod: 'Cash',
    customerName: 'Jane Doe',
    createdAt: '2025-02-15T10:30:00.000Z',
  }] as any;

  assert.equal(buildTransactionItemSummary(transactions[0].items), 'Classic Tee (M) x2, Trail Runner x1');
  assert.deepEqual(buildMonthlySalesSummaries(transactions), [{
    month: '2025-02',
    revenue: 2998,
    cogs: 1540,
    profit: 1458,
    count: 1,
    itemSummary: 'Classic Tee (M) x2, Trail Runner x1',
  }]);
});

test('seller payout tracking keeps the recorded amount separate from the internal sale total', () => {
  const transaction = {
    id: 'sale-2',
    invoiceNo: 'INV-002',
    items: [],
    subtotal: 1950,
    discountAmount: 0,
    total: 1950,
    sellerPayoutAmount: 2100,
    costOfGoodsSold: 1200,
    profit: 750,
    paymentMethod: 'Cash',
    createdAt: '2025-02-16T10:30:00.000Z',
  } as any;

  assert.equal(getTransactionSellerPayout(transaction), 2100);
  assert.equal(getTransactionSellerPayout({ total: 1950, sellerPayoutAmount: 0 } as any), 1950);
});
