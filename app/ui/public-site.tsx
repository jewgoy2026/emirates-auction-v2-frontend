'use client';

import QRCode from 'qrcode';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Account, Category, Invoice, Lot, PaymentIntent, Rail, User, Withdrawal, aedMinor, api, date, money, normalizeAccount, normalizeCategory, normalizeIntent, normalizeLot, normalizeWithdrawal, remaining, requiredDeposit } from '../../lib/v2';

type IconName = 'account' | 'arrow' | 'bell' | 'bid' | 'calendar' | 'car' | 'clock' | 'close' | 'filter' | 'gavel' | 'grid' | 'heart' | 'menu' | 'money' | 'phone' | 'search' | 'shield' | 'wallet';
function Icon({ name, size = 21 }: { name: IconName; size?: number }) {
  const c = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 1.8 };
  const paths: Record<IconName, ReactNode> = {
    account: <><circle cx="12" cy="8" r="4" {...c}/><path d="M4 21a8 8 0 0 1 16 0" {...c}/></>,
    arrow: <><path d="M5 12h14" {...c}/><path d="m14 7 5 5-5 5" {...c}/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" {...c}/><path d="M10 21h4" {...c}/></>,
    bid: <><path d="m5 11 6-6 4 4-6 6zM13 7l4 4M2 21l8-8M14 17h7v4h-7z" {...c}/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" {...c}/><path d="M16 3v4M8 3v4M3 10h18" {...c}/></>,
    car: <><path d="m5 11 2-5h10l2 5M3 12a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5H3zM6 17v2M18 17v2" {...c}/></>,
    clock: <><circle cx="12" cy="12" r="9" {...c}/><path d="M12 7v5l3 2" {...c}/></>,
    close: <><path d="m6 6 12 12M18 6 6 18" {...c}/></>,
    filter: <path d="M4 5h16l-6 7v5l-4 2v-7z" {...c}/>,
    gavel: <><path d="m5 11 6-6 4 4-6 6zM13 7l4 4M3 21l8-8" {...c}/></>,
    grid: <><rect x="3" y="3" width="7" height="7" {...c}/><rect x="14" y="3" width="7" height="7" {...c}/><rect x="3" y="14" width="7" height="7" {...c}/><rect x="14" y="14" width="7" height="7" {...c}/></>,
    heart: <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z" {...c}/>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" {...c}/>,
    money: <><circle cx="12" cy="12" r="9" {...c}/><path d="M15 9.5c-.5-.8-1.5-1.3-2.7-1.3-1.6 0-2.8.8-2.8 2s1.1 1.7 2.8 2.1 2.8.8 2.8 2.1-1.2 2.1-2.9 2.1c-1.3 0-2.4-.5-3-1.4M12.3 6.5v11" {...c}/></>,
    phone: <><rect x="7" y="2" width="10" height="20" rx="2" {...c}/><path d="M11 18h2" {...c}/></>,
    search: <><circle cx="11" cy="11" r="7" {...c}/><path d="m20 20-4-4" {...c}/></>,
    shield: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z" {...c}/><path d="m9 12 2 2 4-4" {...c}/></>,
    wallet: <><path d="M3 6h16a2 2 0 0 1 2 2v11H5a2 2 0 0 1-2-2z" {...c}/><path d="M3 8V5a2 2 0 0 1 2-2h12v3M16 12h5" {...c}/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size}>{paths[name]}</svg>;
}

function Modal({ title, children, close, wide = false }: { title: string; children: ReactNode; close: () => void; wide?: boolean }) {
  return <div className="modal-layer" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.currentTarget === event.target && close()}>
    <section className={`modal ${wide ? 'modal-wide' : ''}`}><header><div><span className="eyebrow">Emirates Auction</span><h2>{title}</h2></div><button className="round-button" onClick={close} aria-label="Close"><Icon name="close"/></button></header>{children}</section>
  </div>;
}

function Status({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'red' | 'green' | 'gold' }) { return <span className={`status status-${tone}`}>{children}</span>; }
function Empty({ text }: { text: string }) { return <div className="empty-state"><Icon name="gavel" size={32}/><p>{text}</p></div>; }

const categoryIcons: Record<string, IconName> = { vehicle: 'car', property: 'grid', plate: 'grid', jewellery: 'heart', police: 'shield', rent: 'calendar' };
function categoryIcon(name: string) { const key = Object.keys(categoryIcons).find((item) => name.toLowerCase().includes(item)); return key ? categoryIcons[key]! : 'gavel'; }

export default function PublicSite() {
  const [categories, setCategories] = useState<Category[]>([]), [lots, setLots] = useState<Lot[]>([]), [rails, setRails] = useState<Rail[]>([]);
  const [user, setUser] = useState<User | null>(null), [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All'), [search, setSearch] = useState(''), [visible, setVisible] = useState(24), [now, setNow] = useState(Date.now());
  const [authMode, setAuthMode] = useState<'identify' | 'login' | 'register' | null>(null), [accountIdentifier, setAccountIdentifier] = useState(''), [accountOpen, setAccountOpen] = useState(false), [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [paymentFor, setPaymentFor] = useState<Invoice | 'funds' | null>(null), [intent, setIntent] = useState<PaymentIntent | null>(null), [qr, setQr] = useState(''), [winnerHidden, setWinnerHidden] = useState(false), [busy, setBusy] = useState(false);

  async function loadPublic() {
    let categoryData: {items: unknown[]}, catalogData: {items: unknown[]}, railData: {rails: Rail[]};
    try {
      [categoryData, catalogData, railData] = await Promise.all([
        api<{items: unknown[]}>('/v1/auction/categories'), api<{items: unknown[]}>('/v1/auction/catalog?limit=2500'), api<{rails: Rail[]}>('/v1/payment/rails'),
      ]);
    } catch {
      const responses = await Promise.all([
        fetch('/snapshot/categories.json', { cache: 'no-store' }),
        fetch('/snapshot/catalog.json', { cache: 'no-store' }),
        fetch('/snapshot/rails.json', { cache: 'no-store' }),
      ]);
      if (responses.some((response) => !response.ok)) throw new Error('Unable to load the marketplace.');
      [categoryData, catalogData, railData] = await Promise.all(responses.map((response) => response.json())) as [{items: unknown[]}, {items: unknown[]}, {rails: Rail[]}];
    }
    setCategories(categoryData.items.map(normalizeCategory)); setLots(catalogData.items.map(normalizeLot)); setRails(railData.rails);
  }
  async function loadAccount() { const data = await api('/v1/auction/me'); setAccount(normalizeAccount(data)); }
  async function restore() { try { const data = await api<{user: User}>('/v1/auth/me', { retry: false }); setUser(data.user); await loadAccount(); } catch {} }
  useEffect(() => { Promise.all([loadPublic(), restore()]).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load the marketplace.')).finally(() => setLoading(false)); }, []);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => { if (!intent?.paymentUri) { setQr(''); return; } QRCode.toDataURL(intent.paymentUri, { width: 260, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#161719', light: '#ffffff' } }).then(setQr).catch(() => setQr('')); }, [intent]);

  const lotById = useMemo(() => new Map(lots.map((lot) => [lot.id, lot])), [lots]);
  const filtered = useMemo(() => lots.filter((lot) => (selectedCategory === 'All' || lot.category === selectedCategory) && (!search || `${lot.title} ${lot.category}`.toLowerCase().includes(search.toLowerCase()))), [lots, search, selectedCategory]);
  const heroLot = lots.find((lot) => lot.imageUrl) ?? lots[0];
  const outstanding = account?.invoices.find((invoice) => invoice.status === 'outstanding') ?? null;

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); const form = new FormData(event.currentTarget);
    try {
      if (authMode === 'identify') {
        const identifier = String(form.get('identifier') ?? '').trim();
        const result = await api<{next: 'login' | 'register'}>('/v1/auth/identify', { body: { identifier } });
        setAccountIdentifier(identifier); setAuthMode(result.next); setBusy(false); return;
      }
      const path = authMode === 'register' ? '/v1/auth/register' : '/v1/auth/login'; const body = authMode === 'register'
        ? { name: form.get('name'), phone: form.get('phone'), email: form.get('email'), password: form.get('password') }
        : { identifier: accountIdentifier, password: form.get('password') };
      const data = await api<{user: User}>(path, { body }); setUser(data.user); await loadAccount(); setAuthMode(null); setWinnerHidden(false); setNotice(authMode === 'register' ? 'Your account is ready.' : `Welcome back, ${data.user.name}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign in failed.'); } finally { setBusy(false); }
  }
  async function logout() { await api('/v1/auth/logout', { body: {} }).catch(() => null); setUser(null); setAccount(null); setAccountOpen(false); setNotice('You have signed out.'); }
  function startIdentityCheck() { setAccountIdentifier(''); setError(''); setAuthMode('identify'); }
  function openAccount() { if (!user) startIdentityCheck(); else { setAccountOpen(true); loadAccount().catch((reason) => setError(reason.message)); } }

  async function placeBid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedLot) return; if (!user) { setSelectedLot(null); startIdentityCheck(); return; }
    const form = new FormData(event.currentTarget), amount = aedMinor(form.get('amount') ?? ''); setBusy(true); setError('');
    try { const data = await api<{lot: unknown}>(`/v1/auction/lots/${selectedLot.id}/bids`, { body: { amountMinor: amount } }); const updated = normalizeLot(data.lot); setLots((items) => items.map((lot) => lot.id === updated.id ? updated : lot)); setSelectedLot(updated); await loadAccount(); setNotice('Your bid has been registered.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The bid could not be registered.'); } finally { setBusy(false); }
  }

  async function createPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!paymentFor) return; const form = new FormData(event.currentTarget), selected = String(form.get('rail')), rail = rails[Number(selected)]; if (!rail) return;
    setBusy(true); setError(''); setIntent(null);
    try { const body = paymentFor === 'funds' ? { purpose: 'ADD_FUNDS', amountMinor: aedMinor(form.get('amount') ?? ''), asset: rail.asset, network: rail.network }
      : { purpose: 'INVOICE', invoiceId: paymentFor.id, asset: rail.asset, network: rail.network };
      const data = await api<{intent: unknown}>('/v1/payment/intents', { body }); setIntent(normalizeIntent(data.intent));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Payment instructions could not be created.'); } finally { setBusy(false); }
  }
  async function requestWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget), rail = rails[Number(form.get('rail'))]; if (!rail) return; setBusy(true); setError('');
    try { const data = await api<{withdrawal: unknown}>('/v1/payment/withdrawals', { body: { amountMinor: aedMinor(form.get('amount') ?? ''), asset: rail.asset, network: rail.network, destination: form.get('destination'), memo: form.get('memo') } }); const item: Withdrawal = normalizeWithdrawal(data.withdrawal); await loadAccount(); setNotice(`Withdrawal ${item.id.slice(0,8)} submitted for review.`); event.currentTarget.reset(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Withdrawal request failed.'); } finally { setBusy(false); }
  }

  return <div id="top">
    <header className="site-header">
      <div className="top-strip"><div className="wrap top-strip-inner"><nav><a href="#about">About EA</a><a href="#calendar">Auction Calendar</a><a href="#how">How it works</a><a href="#contact">Contact Us</a></nav><div><span>UAE: 600 545 454</span><button>العربية</button></div></div></div>
      <div className="main-header"><div className="wrap main-header-inner"><a href="#top" className="brand" aria-label="Emirates Auction home"><img src="/emirates-auction-logo.svg" alt="Emirates Auction"/></a>
        <nav className="primary-nav"><a href="#categories">Auctions</a><a href="#lots">Direct Sale</a><a href="#how">Services</a><a href="#contact">Sell</a></nav>
        <div className="header-actions"><button className="header-icon" onClick={() => document.querySelector<HTMLInputElement>('#market-search')?.focus()} aria-label="Search"><Icon name="search"/></button><button className="header-icon" aria-label="Notifications"><Icon name="bell"/></button><button className="profile-button" onClick={openAccount}><Icon name="account"/><span>{user ? user.name.split(' ')[0] : 'Sign In'}</span></button></div>
      </div></div>
      <div className="category-bar"><div className="wrap category-bar-inner"><button onClick={() => setSelectedCategory('All')}><Icon name="menu" size={18}/> All Categories</button>{categories.slice(0,5).map((category) => <button key={category.id} onClick={() => { setSelectedCategory(category.title); document.querySelector('#lots')?.scrollIntoView(); }}>{category.title}</button>)}<a className="ending" href="#lots"><span/> Ending Today</a></div></div>
    </header>

    <main>
      <section className="hero" style={heroLot?.imageUrl ? { backgroundImage: `linear-gradient(90deg,rgba(12,13,15,.94) 0%,rgba(12,13,15,.78) 45%,rgba(12,13,15,.16) 100%),url(${heroLot.imageUrl})` } : undefined}>
        <div className="wrap hero-content"><span className="hero-kicker">UAE&apos;s trusted auction marketplace</span><h1>Discover. Bid.<br/><em>Win.</em></h1><p>Vehicles, property, distinguished plate numbers and more — all in one secure online marketplace.</p><a className="red-button" href="#lots">Explore auctions <Icon name="arrow"/></a><div className="hero-stats"><div><strong>{lots.length.toLocaleString()}</strong><span>Available lots</span></div><div><strong>{categories.length}</strong><span>Categories</span></div><div><strong>24/7</strong><span>Online bidding</span></div></div></div>
      </section>

      <section className="quick-search"><div className="wrap search-card"><div><span>Find an auction</span><h2>What are you looking for?</h2></div><label className="search-input"><Icon name="search"/><input id="market-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vehicles, plate numbers, properties..."/></label><button className="dark-button" onClick={() => document.querySelector('#lots')?.scrollIntoView()}>Search</button></div></section>

      <section className="section wrap" id="categories"><div className="section-heading"><div><span className="eyebrow">Explore</span><h2>Auction categories</h2></div><button className="text-button" onClick={() => setSelectedCategory('All')}>View all <Icon name="arrow"/></button></div>
        {loading ? <div className="skeleton-grid">{Array.from({length:8},(_,index)=><i key={index}/>)}</div> : <div className="category-grid">{categories.map((category) => {
          const sample = lots.find((lot) => lot.category === category.title && lot.imageUrl); return <button key={category.id} className={`category-card ${selectedCategory === category.title ? 'active' : ''}`} onClick={() => { setSelectedCategory(category.title); setVisible(24); document.querySelector('#lots')?.scrollIntoView(); }}>
            <div className="category-visual">{sample ? <img src={sample.imageUrl} alt="" loading="lazy"/> : <Icon name={categoryIcon(category.title)} size={54}/>}<span className="category-icon"><Icon name={categoryIcon(category.title)}/></span></div><div className="category-copy"><h3>{category.title}</h3><p>{category.defaultMode === 'direct' ? 'Direct Sale' : category.defaultMode === 'request' ? 'Request Service' : category.defaultMode === 'notify' ? 'Notify Me' : 'Online Bidding'} <b>{category.itemCount || ''}</b></p></div><span className="category-arrow"><Icon name="arrow"/></span>
          </button>; })}</div>}
      </section>

      <section className="market-section" id="lots"><div className="wrap"><div className="section-heading market-heading"><div><span className="eyebrow">Live marketplace</span><h2>{selectedCategory === 'All' ? 'Featured auctions' : selectedCategory}</h2><p>{filtered.length.toLocaleString()} lots available</p></div><div className="market-tools"><label><Icon name="search" size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search lots"/></label><select value={selectedCategory} onChange={(event) => { setSelectedCategory(event.target.value); setVisible(24); }}><option>All</option>{categories.map((category)=><option key={category.id}>{category.title}</option>)}</select></div></div>
        {error && <div className="alert alert-error">{error}<button onClick={() => setError('')}><Icon name="close" size={17}/></button></div>}
        {!loading && !filtered.length ? <Empty text="No lots match this selection."/> : <div className="lot-grid">{filtered.slice(0,visible).map((lot) => <article className="lot-card" key={lot.id}>
          <button className="lot-image" onClick={() => setSelectedLot(lot)}>{lot.imageUrl ? <img src={lot.imageUrl} alt={lot.title} loading="lazy"/> : <span><Icon name={categoryIcon(lot.category)} size={62}/></span>}<Status tone={lot.status === 'open' ? 'red' : lot.status === 'mirrored' ? 'gold' : 'neutral'}>{lot.mode === 'direct' ? 'Direct Sale' : lot.status === 'ended' ? 'Ended' : lot.status === 'open' ? 'Live' : 'Available'}</Status><i><Icon name="heart"/></i></button>
          <div className="lot-body"><span className="lot-category">{lot.category}</span><h3>{lot.title}</h3><div className="lot-meta"><span>{lot.bidCount} bids</span><span>Lot {lot.id.slice(0,8).toUpperCase()}</span></div><div className="lot-price"><div><small>{lot.mode === 'direct' ? 'Price' : 'Current bid'}</small><strong>{money(lot.currentPrice)}</strong></div>{lot.endsAt > now && <div className="timer"><Icon name="clock" size={17}/><span>{remaining(lot.endsAt,now)}</span></div>}</div><button className="bid-button" onClick={() => setSelectedLot(lot)}>{lot.mode === 'direct' ? 'View item' : lot.status === 'open' ? 'Bid now' : 'View details'} <Icon name="arrow" size={18}/></button></div>
        </article>)}</div>}
        {visible < filtered.length && <div className="load-more"><button className="outline-button" onClick={() => setVisible((value) => value + 24)}>Load more auctions</button></div>}
      </div></section>

      <section className="how-section" id="how"><div className="wrap"><div className="section-heading light"><div><span className="eyebrow">Simple and secure</span><h2>How online bidding works</h2></div></div><div className="steps"><div><b>01</b><Icon name="account" size={34}/><h3>Create your account</h3><p>Register your details and verified phone number.</p></div><div><b>02</b><Icon name="wallet" size={34}/><h3>Add your deposit</h3><p>Choose an approved crypto asset and network. Your balance is always shown in AED.</p></div><div><b>03</b><Icon name="bid" size={34}/><h3>Place your bid</h3><p>Each lot shows its variable deposit percentage and minimum.</p></div><div><b>04</b><Icon name="gavel" size={34}/><h3>Complete your win</h3><p>After admin adjudication, pay the remaining amount and fees from your account.</p></div></div></div></section>
    </main>

    <footer id="contact"><div className="wrap footer-grid"><div><img src="/emirates-auction-logo.svg" alt="Emirates Auction"/><p>Innovative auction solutions connecting buyers and sellers across the UAE.</p></div><div><h3>Auctions</h3><a href="#categories">All categories</a><a href="#lots">Ending today</a><a href="#calendar">Auction calendar</a></div><div><h3>Support</h3><a href="#how">How it works</a><a href="#contact">Contact us</a><a href="#top">Terms & conditions</a></div><div><h3>Contact</h3><p><Icon name="phone" size={18}/> UAE 600 545 454</p><p>support@emiratesauction.com</p></div></div><div className="footer-bottom"><div className="wrap"><span>© {new Date().getFullYear()} Emirates Auction. All rights reserved.</span><span>Accounting currency: AED · Settlement via supported crypto rails</span></div></div></footer>

    {notice && <div className="toast"><Icon name="shield"/>{notice}</div>}

    {authMode && <Modal title={authMode === 'identify' ? 'Access your account' : authMode === 'login' ? 'Welcome back' : 'Complete your account'} close={() => { setAuthMode(null); setError(''); }}><form className="stack-form" onSubmit={submitAuth}>
      {authMode === 'identify' && <><div className="migration-note"><Icon name="shield" size={24}/><div><strong>We are improving our account system</strong><p>Enter your Customer ID, mobile number or email. If your account is not yet available online, you can complete your details and continue immediately.</p></div></div><label>Customer ID, mobile number or email<input name="identifier" required minLength={3} autoComplete="username" placeholder="EA-…, +971…, or name@example.com" autoFocus/></label></>}
      {authMode === 'login' && <><div className="account-found"><span>Account located</span><strong>{accountIdentifier}</strong></div><label>Password<input name="password" type="password" required autoComplete="current-password" autoFocus/></label></>}
      {authMode === 'register' && <><div className="migration-note"><Icon name="account" size={24}/><div><strong>Complete the migration</strong><p>We could not locate an online account with that information. Fill in the fields below and your account will be created and signed in immediately.</p></div></div><label>Full name<input name="name" required minLength={2} autoComplete="name" autoFocus/></label><label>Mobile number<input name="phone" required minLength={7} defaultValue={/^\+?[0-9 ()-]{7,24}$/.test(accountIdentifier) ? accountIdentifier : ''} placeholder="+971 50 000 0000" autoComplete="tel"/><small>Required. Include the country code so our team can contact you about bids and winning lots.</small></label><label>Email address<input name="email" type="email" required defaultValue={accountIdentifier.includes('@') ? accountIdentifier : ''} autoComplete="email"/></label><label>Create password<input name="password" type="password" required minLength={12} autoComplete="new-password"/><small>Use at least 12 characters.</small></label></>}
      {error && <div className="alert alert-error">{error}</div>}<button className="black-button" disabled={busy}>{busy ? 'Please wait…' : authMode === 'identify' ? 'Continue' : authMode === 'login' ? 'Sign In' : 'Create Account & Sign In'}</button>{authMode !== 'identify' && <p className="form-switch"><button type="button" onClick={startIdentityCheck}>Use a different ID, mobile or email</button></p>}
    </form></Modal>}

    {selectedLot && <Modal title={selectedLot.title} close={() => { setSelectedLot(null); setError(''); }} wide><div className="lot-dialog"><div className="lot-dialog-image">{selectedLot.imageUrl ? <img src={selectedLot.imageUrl} alt={selectedLot.title}/> : <Icon name={categoryIcon(selectedLot.category)} size={88}/>}</div><div className="lot-dialog-copy"><div className="dialog-tags"><Status tone="red">{selectedLot.category}</Status><Status>{selectedLot.status}</Status></div><p>{selectedLot.description || 'Review the lot details, deposit requirement and bidding conditions before continuing.'}</p><dl><div><dt>Current price</dt><dd>{money(selectedLot.currentPrice)}</dd></div><div><dt>Next minimum bid</dt><dd>{money(selectedLot.winnerId ? selectedLot.currentPrice + selectedLot.increment : selectedLot.startPrice)}</dd></div><div><dt>Deposit rule</dt><dd>{selectedLot.depositBps / 100}% · minimum {money(selectedLot.minimumDeposit)}</dd></div><div><dt>Deposit use</dt><dd>{selectedLot.depositUsage === 'checkout_eligible' ? 'Applied at checkout' : 'Bidding security only'}</dd></div><div><dt>Automatic extension</dt><dd>{selectedLot.extensionMinutes} minutes while bidding is open</dd></div><div><dt>Closes</dt><dd>{date(selectedLot.endsAt)}</dd></div></dl>
          <div className="policy-note"><strong>Non-payment policy</strong><p>The winner has 48 hours after adjudication to pay. Default may cancel the purchase and relist the lot, forfeit 100% of the security deposit, add a {selectedLot.nonPaymentPenaltyBps / 100}% penalty and {money(selectedLot.lateFeeDaily)} for each applicable late day. Civil or criminal action may also be pursued under the platform terms.</p></div>
          {selectedLot.mode === 'auction' && selectedLot.status === 'open' ? <form className="bid-form" onSubmit={placeBid}><label>Your bid (AED)<input name="amount" inputMode="decimal" defaultValue={((selectedLot.winnerId ? selectedLot.currentPrice + selectedLot.increment : selectedLot.startPrice)/100).toFixed(2)} required/></label><div className="deposit-preview">Required balance from <strong>{money(requiredDeposit(selectedLot, selectedLot.winnerId ? selectedLot.currentPrice + selectedLot.increment : selectedLot.startPrice))}</strong></div>{error && <div className="alert alert-error">{error}</div>}<button className="red-button" disabled={busy}>{user ? 'Confirm bid' : 'Sign in to bid'}</button></form> : <div className="closed-note"><Icon name="clock"/> This lot is not currently accepting bids.</div>}
        </div></div></Modal>}

    {accountOpen && user && <Modal title="My account" close={() => { setAccountOpen(false); setError(''); }} wide><div className="account-head"><div className="account-person"><span><Icon name="account" size={28}/></span><div><strong>{user.name}</strong><small>Customer ID {user.username ?? user.id} · {user.email} · {user.phone}</small></div></div><button className="text-button" onClick={logout}>Sign out</button></div>
      <div className="wallet-cards"><div><span>Available balance</span><strong>{money(account?.wallet.available ?? 0)}</strong><small>AED reference value</small></div><div><span>Reserved for bids</span><strong>{money(account?.wallet.reserved ?? 0)}</strong><small>Variable by lot rules</small></div><div className="wallet-actions"><button className="red-button" onClick={() => { setPaymentFor('funds'); setIntent(null); }}>Add funds</button></div></div>
      {outstanding && <div className="winner-banner"><Icon name="gavel" size={30}/><div><strong>Payment required for a winning lot</strong><span>{lotById.get(outstanding.lotId)?.title ?? 'Auction lot'} · {money(outstanding.due)} due by {date(outstanding.dueAt)}</span></div><button onClick={() => { setPaymentFor(outstanding); setIntent(null); }}>View & pay</button></div>}
      <div className="account-sections"><section><h3>My bids</h3>{account?.bids.length ? <div className="account-list">{account.bids.slice(0,20).map((bid)=><div key={bid.id}><div><strong>{lotById.get(bid.lotId)?.title ?? `Lot ${bid.lotId.slice(0,8)}`}</strong><small>{date(bid.createdAt)} · Round {bid.round}</small></div><b>{money(bid.amount)}</b></div>)}</div> : <Empty text="You have not placed a bid yet."/>}</section><section><h3>Invoices & wins</h3>{account?.invoices.length ? <div className="account-list">{account.invoices.map((invoice)=><div key={invoice.id}><div><strong>{lotById.get(invoice.lotId)?.title ?? 'Auction lot'}</strong><small>{invoice.status} · total {money(invoice.total)} · deposit {money(invoice.depositApplied)}{invoice.status === 'defaulted' ? ` · penalty ${money(invoice.penaltyAmount + invoice.lateFeeAmount)}` : ` · due ${date(invoice.dueAt)}`}</small></div><b>{money(invoice.status === 'defaulted' ? invoice.penaltyAmount + invoice.lateFeeAmount : invoice.due)}</b></div>)}</div> : <Empty text="No invoices have been issued."/>}</section></div>
      <section className="withdraw-section"><h3>Request a withdrawal</h3><p>Unused available balance can be requested to a supported wallet. Every request is reviewed before release.</p><form onSubmit={requestWithdrawal}><label>Amount (AED)<input name="amount" inputMode="decimal" required placeholder="5000.00"/></label><label>Asset & network<select name="rail" required>{rails.map((rail,index)=><option value={index} key={`${rail.asset}-${rail.network}`}>{rail.asset} · {rail.network} ({rail.standard})</option>)}</select></label><label className="grow">Destination address<input name="destination" required minLength={12}/></label><label>Memo / tag<input name="memo"/></label><button className="dark-button" disabled={busy}>Submit request</button></form></section>
      {error && <div className="alert alert-error">{error}</div>}
    </Modal>}

    {outstanding && !winnerHidden && !accountOpen && <div className="winner-popup"><button className="winner-close" onClick={() => setWinnerHidden(true)}><Icon name="close"/></button><span className="winner-icon"><Icon name="gavel" size={38}/></span><div><span className="eyebrow">Congratulations</span><h2>You won an auction</h2><p>{outstanding.message || 'Your winning lot has been adjudicated. Complete the remaining payment to continue.'}</p><dl><div><dt>Hammer price</dt><dd>{money(outstanding.hammerPrice)}</dd></div><div><dt>Deposit applied</dt><dd>− {money(outstanding.depositApplied)}</dd></div><div><dt>Fees & VAT</dt><dd>{money(outstanding.fee + outstanding.vat)}</dd></div><div><dt>Amount due</dt><dd>{money(outstanding.due)}</dd></div><div><dt>Payment deadline</dt><dd>{date(outstanding.dueAt)}</dd></div></dl><div className="alert alert-warning">Non-payment after 48 hours may cancel the purchase, forfeit the security deposit, add a 30% penalty and AED 105 per applicable late day, and lead to legal action.</div><p className="contact-line"><Icon name="phone" size={17}/> {outstanding.contact}</p><button className="red-button" onClick={() => { setPaymentFor(outstanding); setIntent(null); }}>Choose crypto & pay</button></div></div>}

    {paymentFor && <Modal title={paymentFor === 'funds' ? 'Add funds' : 'Pay winning invoice'} close={() => { setPaymentFor(null); setIntent(null); setError(''); }}><div className="payment-intro"><Icon name="wallet" size={30}/><div><strong>{paymentFor === 'funds' ? 'Fund your bidding balance' : `Amount due: ${money(paymentFor.due)}`}</strong><p>Choose the exact asset and network. The AED value is converted by the payment provider when the instruction is created.</p></div></div>
      {!intent ? <form className="stack-form" onSubmit={createPayment}>{paymentFor === 'funds' && <label>Amount to credit (AED)<input name="amount" inputMode="decimal" required placeholder="5000.00"/></label>}<label>Asset and network<select name="rail" required>{rails.map((rail,index)=><option value={index} key={`${rail.asset}-${rail.network}`}>{rail.asset} · {rail.network} · {rail.standard}</option>)}</select><small>Sending on a different network may result in permanent loss.</small></label>{error && <div className="alert alert-error">{error}</div>}<button className="red-button" disabled={busy}>{busy ? 'Creating secure instruction…' : 'Generate payment instruction'}</button><p className="secure-note"><Icon name="shield" size={18}/> Address, live conversion and expiry come only from the configured payment provider.</p></form> : <div className="payment-instruction">{qr && <img src={qr} alt="Crypto payment QR code"/>}<div className="payment-amount"><span>Send exactly</span><strong>{intent.cryptoAmount} {intent.asset}</strong><small>{intent.network} · {intent.standard}</small></div><label>Destination address<code>{intent.address}</code></label>{intent.memo && <label>Memo / destination tag<code>{intent.memo}</code></label>}<dl><div><dt>AED reference</dt><dd>{money(intent.fiatAmount)}</dd></div><div><dt>Quote rate</dt><dd>{intent.quoteRate}</dd></div><div><dt>Expires</dt><dd>{date(intent.expiresAt)}</dd></div></dl><div className="alert alert-warning">Send only {intent.asset} on {intent.network}. Balance is credited after the provider&apos;s required confirmations.</div></div>}
    </Modal>}
  </div>;
}
