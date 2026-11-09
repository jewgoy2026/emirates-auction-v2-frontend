import type UniversalProvider from '@walletconnect/universal-provider';

type ConnectionOptions = {
  chain: string;
  method: string;
  projectId: string;
  signal?: AbortSignal;
};

let providerPromise: Promise<UniversalProvider> | undefined;
let activeConnection = false;
let nativeModal: import('@walletconnect/modal').WalletConnectModal | undefined;
let modalChain = '';

export function withWalletTimeout<T>(operation: Promise<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), milliseconds);
    operation.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

// One provider and one native WalletConnect UI for every supported namespace.
// Separate AppKit/adaptor instances share global modal state and can retain a
// different chain's session when a customer changes the payment network.
async function getProvider(projectId: string) {
  if (!/^[a-f0-9]{32}$/i.test(projectId)) throw new Error('Wallet connection is unavailable. Please try again shortly.');
  if (!providerPromise) {
    providerPromise = import('@walletconnect/universal-provider').then(({ default: Provider }) => Provider.init({
      projectId,
      telemetryEnabled: false,
      metadata: {
        name: 'Emirates Auction', description: 'Review and approve your exact auction payment',
        url: window.location.origin, icons: [`${window.location.origin}/emirates-auction-logo.svg`],
      },
    })).catch((error) => { providerPromise = undefined; throw error; });
  }
  return withWalletTimeout(providerPromise, 25_000, 'The wallet service could not be reached. Please retry the connection.');
}

export async function connectPaymentWallet({ chain, method, projectId, signal }: ConnectionOptions) {
  if (activeConnection) throw new Error('A wallet connection is already open. Close it before trying again.');
  activeConnection = true;
  try {
    signal?.throwIfAborted();
    const [provider, { WalletConnectModal }, { ConfigCtrl, ExplorerCtrl }] = await withWalletTimeout(
      Promise.all([getProvider(projectId), import('@walletconnect/modal'), import('@walletconnect/modal-core')]),
      25_000, 'The wallet service could not be loaded. Please retry the connection.',
    );
    signal?.throwIfAborted();
    const namespace = chain.split(':')[0];
    const account = provider.session?.namespaces[namespace]?.accounts.find((value) => value.startsWith(`${chain}:`));
    if (account && provider.session?.namespaces[namespace]?.methods.includes(method)) {
      return { provider, senderAddress: account.slice(chain.length + 1) };
    }
    // A session belonging to another family must not be reused for signing.
    if (provider.session) await provider.disconnect();
    const modalConfig = {
      projectId, chains: [chain], enableExplorer: true, themeMode: 'light',
      themeVariables: { '--wcm-z-index': '10000', '--wcm-accent-color': '#3396ff', '--wcm-background-border-radius': '20px' },
    } as const;
    if (!nativeModal) nativeModal = new WalletConnectModal({ ...modalConfig, chains: [chain] });
    else if (modalChain !== chain) {
      ConfigCtrl.setConfig({ projectId, chains: [chain], enableExplorer: true });
      ExplorerCtrl.state.wallets = { listings: [], total: 0, page: 1 };
      ExplorerCtrl.resetSearch();
      await withWalletTimeout(ExplorerCtrl.getRecomendedWallets(), 12_000, 'The wallet list could not be loaded. Please retry.');
    }
    modalChain = chain;
    signal?.throwIfAborted();
    const modal = nativeModal;
    let opened = false;
    let connected = false;
    let finished = false;
    let rejectClosed: (error: Error) => void = () => {};
    const closed = new Promise<never>((_, reject) => { rejectClosed = reject; });
    const abort = () => rejectClosed(new Error('Wallet connection cancelled.'));
    signal?.addEventListener('abort', abort, { once: true });
    const unsubscribe = modal.subscribeModal(({ open }) => {
      if (open) opened = true;
      else if (opened && !connected) abort();
    });
    const display = (uri: string) => {
      void withWalletTimeout(modal.openModal({ uri, chains: [chain] }), 15_000, 'The wallet list could not be loaded. Please retry.')
        .then(() => { if (finished || signal?.aborted) modal.closeModal(); }).catch(rejectClosed);
    };
    provider.on('display_uri', display);
    try {
      const session = await withWalletTimeout(Promise.race([
        provider.connect({ namespaces: { [namespace]: { chains: [chain], methods: [method], events: namespace === 'eip155' ? ['accountsChanged', 'chainChanged'] : [] } } }),
        closed,
      ]), 120_000, 'The wallet connection timed out. Close the wallet prompt and try again.');
      connected = true;
      signal?.throwIfAborted();
      const selectedAccount = session?.namespaces[namespace]?.accounts.find((value) => value.startsWith(`${chain}:`));
      if (!selectedAccount || !session?.namespaces[namespace]?.methods.includes(method)) throw new Error('The selected wallet does not support this payment network. Choose a compatible wallet.');
      return { provider, senderAddress: selectedAccount.slice(chain.length + 1) };
    } finally {
      finished = true;
      provider.off('display_uri', display);
      signal?.removeEventListener('abort', abort);
      unsubscribe();
      if (!connected) provider.abortPairingAttempt();
      modal.closeModal();
    }
  } finally { activeConnection = false; }
}
