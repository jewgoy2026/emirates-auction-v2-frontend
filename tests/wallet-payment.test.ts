import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSignedTronPayment, transactionValue, tronSigningParams } from '../lib/wallet-payment.ts';
import { withWalletTimeout } from '../lib/walletconnect-client.ts';
import worker from '../worker/index.ts';
import type { WalletRequest } from '../lib/v2.ts';

test('TRON signing negotiates legacy and v1 payloads without changing the transaction', () => {
  const transaction = { txID:'exact-tx',raw_data:{contract:[{amount:'821957103'}]} };
  assert.deepEqual(tronSigningParams('Tsender',transaction),{address:'Tsender',transaction:{transaction}});
  assert.deepEqual(tronSigningParams('Tsender',transaction,'v1'),{address:'Tsender',transaction});
});

test('TRON rejects unsigned responses and changed fixed-payment payloads', () => {
  const unsigned = {txID:'exact-hash',raw_data_hex:'exact-amount-and-recipient'};
  const signed = {...unsigned,signature:['ab'.repeat(65)]};
  assert.doesNotThrow(()=>assertSignedTronPayment(unsigned,signed));
  assert.throws(()=>assertSignedTronPayment(unsigned,unsigned),/unsigned/);
  assert.throws(()=>assertSignedTronPayment(unsigned,{...signed,raw_data_hex:'changed-amount'}),/changed/);
});

test('EVM transfer keeps values beyond JS integer precision exact', () => {
  const request = {family:'evm',chainId:'56',recipient:'0x1111111111111111111111111111111111111111',tokenIdentifier:'0x2222222222222222222222222222222222222222',amountAtomic:'821957103000000000001',amountDecimal:'821.957103000000000001',memo:'',transaction:{}} satisfies WalletRequest;
  const tx = transactionValue(request);
  assert.equal(tx.to,request.tokenIdentifier);
  assert.equal(tx.value,'0x0');
  assert.equal(BigInt(`0x${tx.data.slice(-64)}`).toString(),request.amountAtomic);
  assert.equal(tx.data.slice(10,74),request.recipient.slice(2).padStart(64,'0'));
});

test('an unreachable connection finishes with a retryable error', async () => {
  await assert.rejects(withWalletTimeout(new Promise(()=>{}),10,'Connection unavailable'),/Connection unavailable/);
  assert.equal(await withWalletTimeout(Promise.resolve('ready'),100,'timeout'),'ready');
});

test('Worker policy permits the wallet catalog, relay, verification and transaction RPCs', async () => {
  const response = await worker.fetch(new Request('https://official.emiratesauction.workers.dev/'), {ASSETS:{fetch:async()=>new Response('<html/>')}});
  const csp = response.headers.get('content-security-policy')!;
  const connect = csp.split(';').find(value=>value.trim().startsWith('connect-src'))!;
  for (const endpoint of ['https://explorer-api.walletconnect.com','https://api.web3modal.org','wss://relay.walletconnect.org','https://api.trongrid.io','https://api.mainnet-beta.solana.com']) assert.ok(connect.includes(endpoint),endpoint);
  assert.ok(csp.includes('frame-src https://verify.walletconnect.org https://verify.walletconnect.com'));
});
