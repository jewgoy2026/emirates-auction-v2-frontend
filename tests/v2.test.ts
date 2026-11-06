import test from 'node:test';
import assert from 'node:assert/strict';
import { aedMinor, normalizeLot, requiredDeposit } from '../lib/v2.ts';

test('AED input stays in integer minor units', () => {
  assert.equal(aedMinor('5000'), 500_000);
  assert.equal(aedMinor('5000.25'), 500_025);
  assert.throws(() => aedMinor('-1'));
  assert.throws(() => aedMinor('5.001'));
});

test('lot collateral combines its variable percentage, minimum limit and absolute minimum', () => {
  const lot = normalizeLot({ id: '1', title: 'Test', category: 'Vehicles', mode: 'auction', status: 'open', deposit_bps: 2000, minimum_limit: 500_000, minimum_deposit: 150_000 });
  assert.equal(requiredDeposit(lot, 100_000), 150_000);
  assert.equal(requiredDeposit(lot, 1_000_000), 200_000);
});

test('API lot normalization preserves admin-controlled end state and deposit usage', () => {
  const lot = normalizeLot({ id: '1', title: 'Test', category: 'Vehicles', mode: 'auction', status: 'ended', current_price: 8_000_000, deposit_usage: 'bidding_only', ends_at: '2026-11-05T12:00:00Z' });
  assert.equal(lot.status, 'ended');
  assert.equal(lot.depositUsage, 'bidding_only');
  assert.equal(lot.currentPrice, 8_000_000);
});
