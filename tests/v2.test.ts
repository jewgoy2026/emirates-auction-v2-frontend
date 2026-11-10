import test from 'node:test';
import assert from 'node:assert/strict';
import { aedMinor, normalizeIntent, normalizeLot, paymentAddressQrValue, requiredDeposit } from '../lib/v2.ts';

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

test('payment normalization preserves the server-owned atomic amount as text', () => {
  const atomic = '123456789012345678901234567890123456789';
  const intent = normalizeIntent({
    id: 'payment', purpose: 'INVOICE', fiat_amount: 8_000_000, asset: 'USDT', network: 'Ethereum', standard: 'ERC-20',
    crypto_amount: '21786.492001', address: '0x1111111111111111111111111111111111111111', payment_uri: 'ethereum:request',
    quote_rate: '3.6725', status: 'pending', wallet_request: {
      family: 'evm', chain_id: '1', recipient: '0x1111111111111111111111111111111111111111',
      token_identifier: '0xdAC17F958D2ee523a2206206994597C13D831ec7', amount_atomic: atomic,
      amount_decimal: '21786.492001', memo: '', transaction: { to: '0xdAC17F958D2ee523a2206206994597C13D831ec7', value: '0', data: '0xa9059cbb' },
    },
  });
  assert.equal(intent.walletRequest?.amountAtomic, atomic);
  assert.equal(intent.walletRequest?.transaction.data, '0xa9059cbb');
  assert.equal(paymentAddressQrValue(intent), intent.address);
  assert.equal(paymentAddressQrValue(intent).includes(intent.cryptoAmount), false);
});
