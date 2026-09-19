import test from 'node:test';
import assert from 'node:assert/strict';
import { getGuestPriceDisplay, getInventoryDisplayPricing, normalizeInventoryPricing } from '../src/utils';

test('guest catalog displays a discounted SRP when SRP is higher than the store price', () => {
  const display = getGuestPriceDisplay({
    srpPrice: 1500,
    storePrice: 1200,
    sellingPrice: 1399,
  });

  assert.equal(display.hasDiscount, true);
  assert.equal(display.originalPrice, 1500);
  assert.equal(display.currentPrice, 1200);
  assert.equal(display.discountPercent, 20);
});

test('consignment products keep zero cost and use the public pricing values', () => {
  const normalized = normalizeInventoryPricing({
    inventoryType: 'consignment',
    costPrice: 500,
    sellingPrice: 899,
    storePrice: 799,
    srpPrice: 999,
  });

  assert.equal(normalized.costPrice, 0);
  assert.equal(normalized.sellingPrice, 899);
  assert.equal(normalized.storePrice, 799);
  assert.equal(normalized.srpPrice, 999);
});

test('consignment inventory display swaps the zero cost label for SRP pricing', () => {
  const display = getInventoryDisplayPricing({
    inventoryType: 'consignment',
    costPrice: 0,
    sellingPrice: 2500,
    storePrice: 3000,
    srpPrice: 3000,
  });

  assert.equal(display.secondaryLabel, 'SRP Price');
  assert.equal(display.secondaryValue, 3000);
  assert.equal(display.storeValue, 3000);
});

test('consignment SRP does not inherit the store price when it is blank or zero', () => {
  const normalized = normalizeInventoryPricing({
    inventoryType: 'consignment',
    costPrice: 0,
    sellingPrice: 2500,
    storePrice: 3000,
    srpPrice: 0,
  });

  assert.equal(normalized.srpPrice, 0);
  assert.equal(normalized.storePrice, 3000);
});
