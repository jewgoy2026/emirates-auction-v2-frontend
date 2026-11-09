import type { WalletRequest } from './v2';

type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

type Eip6963Detail = {
  info: { uuid: string; name: string; icon?: string; rdns?: string };
  provider: Eip1193Provider;
};

type TronWebLike = {
  defaultAddress?: { base58?: string };
  contract(): { at(address: string): Promise<{ transfer(recipient: string, amount: string): { send(options?: Record<string, unknown>): Promise<unknown> } }> };
  trx?: { sendTransaction(recipient: string, amount: number): Promise<unknown> };
};

type BitcoinProvider = {
  requestAccounts?(): Promise<string[]>;
  connect?(): Promise<unknown>;
  getAccounts?(): Promise<string[]>;
  sendBitcoin(address: string, satoshis: number): Promise<unknown>;
};

export type WalletChoice = {
  id: string;
  name: string;
  detail: string;
  icon?: string;
  kind: 'installed' | 'walletconnect';
};

export type WalletPaymentResult = {
  txHash: string;
  senderAddress: string;
  walletName: string;
};

const evmProviders = new Map<string, Eip6963Detail>();
const tronProviders = new Map<string, { name: string; tronWeb: TronWebLike; request?: (args: { method: string }) => Promise<unknown> }>();
const bitcoinProviders = new Map<string, { name: string; provider: BitcoinProvider }>();
let eipListenerReady = false;

function browserWindow() {
  return window as typeof window & {
    ethereum?: Eip1193Provider;
    tronLink?: { request?(args: { method: string }): Promise<unknown>; tronWeb?: TronWebLike };
    tronWeb?: TronWebLike;
    okxwallet?: { tronLink?: { request?(args: { method: string }): Promise<unknown>; tronWeb?: TronWebLike }; tronWeb?: TronWebLike; bitcoin?: BitcoinProvider };
    unisat?: BitcoinProvider;
  };
}

function startEip6963Discovery() {
  if (eipListenerReady || typeof window === 'undefined') return;
  eipListenerReady = true;
  window.addEventListener('eip6963:announceProvider', ((event: CustomEvent<Eip6963Detail>) => {
    const detail = event.detail;
    if (detail?.info?.uuid && detail.provider) evmProviders.set(detail.info.uuid, detail);
  }) as EventListener);
}

function transactionValue(request: WalletRequest) {
  const transaction = request.transaction ?? {};
  const value = typeof transaction.value === 'string' ? transaction.value : request.tokenIdentifier ? '0x0' : `0x${BigInt(request.amountAtomic).toString(16)}`;
  let data = typeof transaction.data === 'string' ? transaction.data : '0x';
  let to = typeof transaction.to === 'string' ? transaction.to : request.tokenIdentifier ?? request.recipient;
  if (request.tokenIdentifier && data === '0x') {
    const recipient = request.recipient.toLowerCase().replace(/^0x/, '');
    if (!/^[0-9a-f]{40}$/.test(recipient)) throw new Error('The receiving wallet is invalid for this network.');
    data = `0xa9059cbb${recipient.padStart(64, '0')}${BigInt(request.amountAtomic).toString(16).padStart(64, '0')}`;
    to = request.tokenIdentifier;
  }
  return { to, value, data };
}

function resultHash(value: unknown) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['txid', 'txID', 'hash', 'signature']) if (typeof record[key] === 'string' && record[key]) return String(record[key]);
  }
  throw new Error('The wallet did not return a transaction identifier.');
}

async function discoverEvm(projectId: string) {
  startEip6963Discovery();
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  await new Promise((resolve) => setTimeout(resolve, 180));
  const choices: WalletChoice[] = Array.from(evmProviders.values(), ({ info }) => ({ id: `eip6963:${info.uuid}`, name: info.name, detail: 'Installed wallet', icon: info.icon, kind: 'installed' as const }));
  const legacy = browserWindow().ethereum;
  if (legacy && !choices.length) choices.push({ id: 'evm:legacy', name: 'Browser wallet', detail: 'MetaMask, Trust, OKX or compatible wallet', kind: 'installed' });
  if (projectId) choices.push({ id: 'evm:walletconnect', name: 'WalletConnect', detail: 'Scan with a mobile wallet', kind: 'walletconnect' });
  return choices;
}

function discoverTron() {
  tronProviders.clear();
  const current = browserWindow();
  const tronLink = current.tronLink, tronWeb = tronLink?.tronWeb ?? current.tronWeb;
  if (tronWeb) tronProviders.set('tron:tronlink', { name: 'TronLink', tronWeb, request: tronLink?.request?.bind(tronLink) });
  const okxLink = current.okxwallet?.tronLink, okxTronWeb = okxLink?.tronWeb ?? current.okxwallet?.tronWeb;
  if (okxTronWeb && okxTronWeb !== tronWeb) tronProviders.set('tron:okx', { name: 'OKX Wallet', tronWeb: okxTronWeb, request: okxLink?.request?.bind(okxLink) });
  return Array.from(tronProviders, ([id, item]) => ({ id, name: item.name, detail: 'Installed TRON wallet', kind: 'installed' as const }));
}

function discoverBitcoin() {
  bitcoinProviders.clear();
  const current = browserWindow();
  if (current.unisat) bitcoinProviders.set('bitcoin:unisat', { name: 'UniSat', provider: current.unisat });
  if (current.okxwallet?.bitcoin) bitcoinProviders.set('bitcoin:okx', { name: 'OKX Wallet', provider: current.okxwallet.bitcoin });
  return Array.from(bitcoinProviders, ([id, item]) => ({ id, name: item.name, detail: 'Installed Bitcoin wallet', kind: 'installed' as const }));
}

export async function discoverWalletChoices(request: WalletRequest, walletConnectProjectId = ''): Promise<WalletChoice[]> {
  if (typeof window === 'undefined') return [];
  if (request.family === 'evm') return discoverEvm(walletConnectProjectId);
  if (request.family === 'tron') return discoverTron();
  if (request.family === 'bitcoin') return discoverBitcoin();
  return [];
}

async function payEvmInjected(request: WalletRequest, choice: WalletChoice): Promise<WalletPaymentResult> {
  const provider = choice.id === 'evm:legacy' ? browserWindow().ethereum : evmProviders.get(choice.id.replace('eip6963:', ''))?.provider;
  if (!provider) throw new Error('Open this page inside your wallet browser or choose WalletConnect.');
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  const senderAddress = Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] : '';
  if (!senderAddress) throw new Error('The wallet did not provide an account.');
  if (!request.chainId || !/^\d+$/.test(request.chainId)) throw new Error('The payment network is missing its chain identifier.');
  const chainHex = `0x${BigInt(request.chainId).toString(16)}`;
  try { await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainHex }] }); }
  catch (reason) { throw new Error(reason instanceof Error ? `Switch the wallet to the selected network. ${reason.message}` : 'Switch the wallet to the selected network.'); }
  const transaction = transactionValue(request);
  const txHash = resultHash(await provider.request({ method: 'eth_sendTransaction', params: [{ from: senderAddress, ...transaction }] }));
  return { txHash, senderAddress, walletName: choice.name };
}

async function payEvmWalletConnect(request: WalletRequest, choice: WalletChoice, projectId: string): Promise<WalletPaymentResult> {
  if (!projectId) throw new Error('WalletConnect is temporarily unavailable.');
  const [{ default: UniversalProvider }, { WalletConnectModal }] = await Promise.all([
    import('@walletconnect/universal-provider'),
    import('@walletconnect/modal'),
  ]);
  if (!request.chainId || !/^\d+$/.test(request.chainId)) throw new Error('The payment network is missing its chain identifier.');
  const chain = `eip155:${request.chainId}`;
  const modal = new WalletConnectModal({ projectId, enableExplorer: false, themeMode: 'light', themeVariables: { '--wcm-z-index': '10000' } });
  const provider = await UniversalProvider.init({
    projectId,
    telemetryEnabled: false,
    metadata: { name: 'Emirates Auction', description: 'Secure auction payment', url: window.location.origin, icons: [`${window.location.origin}/emirates-auction-logo.svg`] },
  });
  provider.on('display_uri', (uri: string) => { void modal.openModal({ uri }); });
  try {
    await provider.connect({ namespaces: { eip155: { methods: ['eth_sendTransaction', 'wallet_switchEthereumChain'], chains: [chain], events: ['chainChanged', 'accountsChanged'] } } });
    modal.closeModal();
    const account = provider.session?.namespaces.eip155?.accounts?.find((item) => item.startsWith(`${chain}:`));
    const senderAddress = account?.split(':').at(-1) ?? '';
    if (!senderAddress) throw new Error('The wallet did not provide an account on the selected network.');
    const transaction = transactionValue(request);
    const txHash = resultHash(await provider.request({ method: 'eth_sendTransaction', params: [{ from: senderAddress, ...transaction }] }, chain));
    return { txHash, senderAddress, walletName: choice.name };
  } finally {
    modal.closeModal();
  }
}

async function payTron(request: WalletRequest, choice: WalletChoice): Promise<WalletPaymentResult> {
  const selected = tronProviders.get(choice.id);
  if (!selected) throw new Error('Open this page inside TronLink, OKX Wallet or another compatible TRON wallet.');
  if (selected.request) await selected.request({ method: 'tron_requestAccounts' });
  const senderAddress = selected.tronWeb.defaultAddress?.base58 ?? '';
  if (!senderAddress) throw new Error('Unlock the TRON wallet and approve the connection.');
  let response: unknown;
  if (request.tokenIdentifier) {
    const contract = await selected.tronWeb.contract().at(request.tokenIdentifier);
    response = await contract.transfer(request.recipient, request.amountAtomic).send({ feeLimit: 100_000_000, shouldPollResponse: false });
  } else {
    const atomic = BigInt(request.amountAtomic);
    if (atomic > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('This amount cannot be represented safely by the connected wallet.');
    if (!selected.tronWeb.trx) throw new Error('The wallet does not support native TRON transfers.');
    response = await selected.tronWeb.trx.sendTransaction(request.recipient, Number(atomic));
  }
  return { txHash: resultHash(response), senderAddress, walletName: choice.name };
}

async function payBitcoin(request: WalletRequest, choice: WalletChoice): Promise<WalletPaymentResult> {
  const selected = bitcoinProviders.get(choice.id);
  if (!selected) throw new Error('Open this page inside UniSat or OKX Wallet.');
  const atomic = BigInt(request.amountAtomic);
  if (atomic > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('This amount cannot be represented safely by the connected wallet.');
  const accounts = selected.provider.requestAccounts ? await selected.provider.requestAccounts() : selected.provider.connect ? (await selected.provider.connect(), await selected.provider.getAccounts?.() ?? []) : [];
  const senderAddress = accounts[0] ?? '';
  if (!senderAddress) throw new Error('The Bitcoin wallet did not provide an account.');
  const txHash = resultHash(await selected.provider.sendBitcoin(request.recipient, Number(atomic)));
  return { txHash, senderAddress, walletName: choice.name };
}

export async function executeWalletPayment(request: WalletRequest, choice: WalletChoice, walletConnectProjectId = '') {
  if (choice.id === 'evm:walletconnect') return payEvmWalletConnect(request, choice, walletConnectProjectId);
  if (request.family === 'evm') return payEvmInjected(request, choice);
  if (request.family === 'tron') return payTron(request, choice);
  if (request.family === 'bitcoin') return payBitcoin(request, choice);
  throw new Error('Use the fixed-amount QR or payment request for this network.');
}

export function friendlyWalletError(reason: unknown) {
  const record = reason && typeof reason === 'object' ? reason as Record<string, unknown> : {};
  const code = Number(record.code ?? 0);
  if (code === 4001 || code === -32000 || /reject|declin|cancel/i.test(String(record.message ?? ''))) return 'The payment was cancelled in the wallet. No funds were moved.';
  return reason instanceof Error ? reason.message : 'The wallet could not prepare this payment.';
}
