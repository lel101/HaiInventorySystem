import test from 'node:test';
import assert from 'node:assert/strict';
import { getConsignmentWithdrawalSummary } from '../src/utils.ts';

test('consignment withdrawal summary keeps remaining profit at zero after a recorded monthly withdrawal', () => {
  const summary = getConsignmentWithdrawalSummary({
    netProfit: 2500,
    withdrawals: [
      { id: 'cw-1', month: '2026-09', amount: 2500, note: 'Recorded', createdAt: '2026-09-15T00:00:00.000Z' },
    ],
    selectedMonth: '2026-09',
  });

  assert.equal(summary.remainingProfit, 0);
  assert.equal(summary.isLocked, true);
  assert.equal(summary.withdrawnAmount, 2500);
});

test('consignment withdrawal summary still allows a withdrawal when the month has not been recorded yet', () => {
  const summary = getConsignmentWithdrawalSummary({
    netProfit: 2500,
    withdrawals: [],
    selectedMonth: '2026-09',
  });

  assert.equal(summary.remainingProfit, 2500);
  assert.equal(summary.isLocked, false);
  assert.equal(summary.withdrawnAmount, 0);
});
