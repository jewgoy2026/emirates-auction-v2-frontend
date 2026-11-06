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

function Modal({ title, children, close, wide = false, rtl = false }: { title: string; children: ReactNode; close: () => void; wide?: boolean; rtl?: boolean }) {
  return <div className="modal-layer" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.currentTarget === event.target && close()}>
    <section className={`modal ${wide ? 'modal-wide' : ''}`}><header><div><span className="eyebrow">{rtl ? 'الإمارات للمزادات' : 'Emirates Auction'}</span><h2>{title}</h2></div><button className="round-button" onClick={close} aria-label={rtl ? 'إغلاق' : 'Close'}><Icon name="close"/></button></header>{children}</section>
  </div>;
}

function Status({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'red' | 'green' | 'gold' }) { return <span className={`status status-${tone}`}>{children}</span>; }
function Empty({ text }: { text: string }) { return <div className="empty-state"><Icon name="gavel" size={32}/><p>{text}</p></div>; }

const categoryIcons: Record<string, IconName> = { vehicle: 'car', property: 'grid', plate: 'grid', jewellery: 'heart', police: 'shield', rent: 'calendar' };
function categoryIcon(name: string) { const key = Object.keys(categoryIcons).find((item) => name.toLowerCase().includes(item)); return key ? categoryIcons[key]! : 'gavel'; }

type Language = 'en' | 'ar';

const copy = {
  en: {
    homeTitle: 'Car, Plate and Property Auctions in the UAE', endingToday: 'ENDING TODAY', endingDescription: "Don't miss out, these auctions are ending today.", endingNow: 'Ending Now',
    search: 'Search', searchPlaceholder: 'Search auctions, vehicles, plates and properties', auctionCategories: 'Auction Categories', emiratesAuction: 'Emirates Auction',
    about: 'About EA', calendar: 'Auction Calendar', sell: 'Sell with us', help: 'Help', findUs: 'Find Us', contact: 'Contact Us', language: 'Change Language',
    profile: 'My Profile', signIn: 'Sign In', allCategories: 'All Categories', onlineBidding: 'Online Bidding', directSale: 'Direct Sale', request: 'Request Service', notify: 'Get Notified',
    requestPlate: 'Request Plate', requestPackage: 'Request Package', buyNow: 'Buy Now', lotsAvailable: 'lots available', liveMarketplace: 'LIVE MARKETPLACE', featured: 'Featured auctions',
    bids: 'bids', lot: 'Lot', currentBid: 'Current bid', price: 'Price', bidNow: 'Bid now', viewItem: 'View item', viewDetails: 'View details', loadMore: 'Load more auctions', noLots: 'No lots match this selection.',
    recordsEyebrow: '10 World Records', recordsTitle: 'OUR GUINNESS WORLD RECORDS', recordsCta: 'View All Records', recordCaption: 'The most valuable assets sold through trusted auctions', auctionPrice: 'Auction Price',
    numbersEyebrow: 'Emirates Auction', numbersTitle: 'OUR SUCCESS IN NUMBERS', activeUsers: 'Active users', years: 'Years of Auctions', auctions: 'Auctions', employees: 'Employees', branches: 'Branches',
    storyEyebrow: 'Where dreams met reality', storyTitle: 'EMIRATES AUCTION SUCCESS STORY',
    partnerEyebrow: 'Partnership with Emirates Auction', partnerTitle: 'GROW YOUR BUSINESS WITH EMIRATES AUCTION', partnerText: "Whether you're a government entity or a private business, we support your needs every step of the way.", letsTalk: "Let's Talk",
    newsEyebrow: 'Know more about us', newsTitle: 'EMIRATES AUCTION NEWS', moreNews: 'More News', galleryEyebrow: 'Memories in motion', galleryTitle: 'EMIRATES AUCTION GALLERY', viewAlbums: 'View All Albums',
    sellEyebrow: 'Turn your valuables into opportunities', sellTitle: 'DISCOVER WHAT YOU CAN SELL WITH US', sellNow: 'Sell Now',
    faqTitle: 'Have a question in mind?', faqSubtitle: "We’ve got the answer.", faqIntro: 'Find answers to the most popular questions from our users for an exceptional auction experience.', readAll: 'Read All',
    footerAbout: 'About Emirates Auction', footerAuctions: 'Auctions', footerHelp: 'Help Center', footerQuick: 'Quick Links', available247: "Need help? We're here to help you 24/7", copyright: 'Emirates Auction LLC',
  },
  ar: {
    homeTitle: 'مزادات السيارات واللوحات والعقارات في الإمارات', endingToday: 'ينتهي اليوم', endingDescription: 'لا تفوتوا هذه الفرصة، فالمزادات تنتهي اليوم.', endingNow: 'ينتهي الآن',
    search: 'بحث', searchPlaceholder: 'ابحث في المزادات والمركبات واللوحات والعقارات', auctionCategories: 'فئات المزادات', emiratesAuction: 'الإمارات للمزادات',
    about: 'عن الإمارات للمزادات', calendar: 'تقويم المزادات', sell: 'بيع معنا', help: 'المساعدة', findUs: 'أين تجدنا', contact: 'تواصل معنا', language: 'تغيير اللغة',
    profile: 'حسابي', signIn: 'تسجيل الدخول', allCategories: 'جميع الفئات', onlineBidding: 'مزاد إلكتروني', directSale: 'البيع المباشر', request: 'طلب خدمة', notify: 'خدمة التنبيه',
    requestPlate: 'طلب لوحة', requestPackage: 'طلب باقة مميزة', buyNow: 'الشراء الآن', lotsAvailable: 'عنصر متاح', liveMarketplace: 'المزادات المباشرة', featured: 'مزادات مميزة',
    bids: 'مزايدات', lot: 'رقم', currentBid: 'المزايدة الحالية', price: 'السعر', bidNow: 'زايد الآن', viewItem: 'عرض العنصر', viewDetails: 'عرض التفاصيل', loadMore: 'عرض المزيد', noLots: 'لا توجد عناصر مطابقة.',
    recordsEyebrow: '10 أرقام قياسية عالمية', recordsTitle: 'الإمارات للمزادات تصنع المُعجزات', recordsCta: 'عرض الكل', recordCaption: 'أعلى قيمة للأصول المباعة عبر مزادات موثوقة', auctionPrice: 'سعر المزاد',
    numbersEyebrow: 'الإمارات للمزادات', numbersTitle: 'الأرقام تحكي قصة نجاحنا', activeUsers: 'مليون مستخدم فعّال', years: 'عامًا من المزادات', auctions: 'مزاد', employees: 'موظف', branches: 'فرع',
    storyEyebrow: 'نحن رواد النجاح', storyTitle: 'قصة نجاح الإمارات للمزادات',
    partnerEyebrow: 'شراكة مع الإمارات للمزادات', partnerTitle: 'استثمر معنا وشاركنا النجاح', partnerText: 'نحن نعمل على إتاحة فرص عظيمة لشركائنا ومساعدتهم في بيع ممتلكاتهم بأعلى قيمة.', letsTalk: 'تحدث معنا',
    newsEyebrow: 'تابع أخبارنا باستمرار', newsTitle: 'أخبار الإمارات للمزادات', moreNews: 'المزيد من الأخبار', galleryEyebrow: 'نصنع من الذكريات لحظات خالدة', galleryTitle: 'معرض الإمارات للمزادات', viewAlbums: 'عرض كل الألبومات',
    sellEyebrow: 'حوّل مقتنياتك القيّمة إلى فرص', sellTitle: 'بخطوات سريعة وموثوقة ابدأ البيع', sellNow: 'بِعْ الآن',
    faqTitle: 'هل لديك العديد من التساؤلات في ذهنك؟', faqSubtitle: 'نحن لدينا الإجابة.', faqIntro: 'يمكنك الحصول على إجابة لأكثر الاستفسارات الرائجة بين عملائنا لضمان تجربة مزادات رائعة واستثنائية.', readAll: 'قراءة الكل',
    footerAbout: 'عن الإمارات للمزادات', footerAuctions: 'المزادات', footerHelp: 'مركز المساعدة', footerQuick: 'روابط سريعة', available247: 'تواصل معنا الآن على مدار الساعة 24/7', copyright: 'الإمارات للمزادات ش.ذ.م.م',
  },
} as const;

const arabicCategoryNames: Array<[RegExp, string]> = [
  [/abu dhabi plates/i, 'لوحات أبوظبي'], [/sharjah plates/i, 'لوحات الشارقة'], [/ajman plates/i, 'لوحات عجمان'], [/fujairah plates/i, 'لوحات الفجيرة'],
  [/rak plates/i, 'لوحات رأس الخيمة'], [/uaq plates/i, 'لوحات أم القيوين'], [/dubai plates/i, 'لوحات دبي'], [/uae plates/i, 'لوحات الإمارات'],
  [/vehicle|car/i, 'المركبات والآليات'], [/propert/i, 'العقارات'], [/plate/i, 'لوحات مميزة'], [/jewell|watch/i, 'ساعات ومجوهرات'],
  [/general items \(dubai police\)/i, 'بضائع متنوعة (شرطة دبي)'], [/general items \(abu dhabi police\)/i, 'بضائع متنوعة (شرطة أبوظبي)'], [/general item/i, 'بضائع متنوعة'],
  [/rent|space/i, 'مساحات للإيجار'], [/\b(?:ships|barges)\b/i, 'السفن والبوارج'], [/premium package/i, 'الباقات المميزة'], [/custom/i, 'جمارك دبي'],
  [/skywards/i, 'عضويات سكاي واردز طيران الإمارات'], [/expo/i, 'إكسبو 2020 دبي'], [/dubai dates/i, 'دبي للرطب'], [/exclusive plots/i, 'أراضٍ حصرية'],
];
function localizedCategory(title: string, language: Language) { return language === 'en' ? title : arabicCategoryNames.find(([pattern]) => pattern.test(title))?.[1] ?? title; }

const news = {
  en: [
    ['Emirates Auction: Emirati Women Are a Key Pillar of the UAE’s Vision for the Next 50 Years', '28 August 2026'],
    ['Darbak Sahal Enhances Traffic and Licensing Services for Students', '20 August 2026'],
    ['The Third Edition of Dubai Dates Officially Kicks Off', '18 July 2026'],
  ],
  ar: [
    ['الإمارات للمزادات: المرأة الإماراتية ركيزة أساسية في رؤية الدولة للخمسين عاماً المقبلة', '28 أغسطس 2026'],
    ['دربك سهل تعزّز خدمات المرور والترخيص للطلبة والكوادر التعليمية', '20 أغسطس 2026'],
    ['انطلاق النسخة الثالثة من دبي للرطب', '18 يوليو 2026'],
  ],
} as const;

const faqs = {
  en: [
    ['What services does Emirates Auction provide?', 'Emirates Auction provides auctions for vehicles, real estate, distinguished plates, machinery, jewellery and general items through online bidding and direct sales.'],
    ['How can I buy an item at auction?', 'Create your account, fund the security deposit required by the lot, place your bid and complete payment after adjudication.'],
    ['Is registration free of charge?', 'Creating an account is free. Individual auctions can require a refundable or checkout-eligible security deposit.'],
    ['Can any nationality participate?', 'Eligible customers can register using their Customer ID, mobile number or email and complete the required account details.'],
  ],
  ar: [
    ['ما هي الخدمات التي تقدمها الإمارات للمزادات؟', 'تقدم المنصة مزادات المركبات والعقارات واللوحات المميزة والمعدات والساعات والمجوهرات والبضائع المتنوعة عبر المزايدة الإلكترونية والبيع المباشر.'],
    ['كيف يمكنني الشراء عبر المزاد؟', 'أنشئ حسابك، أضف مبلغ التأمين المطلوب للعنصر، قدم مزايدتك ثم أكمل الدفع بعد اعتماد الفائز.'],
    ['هل التسجيل مجاني؟', 'إنشاء الحساب مجاني، وقد يتطلب كل مزاد مبلغ تأمين وفق القواعد المحددة للعنصر.'],
    ['هل يمكن لأي جنسية المشاركة؟', 'يمكن للعملاء المؤهلين التسجيل برقم العميل أو الهاتف أو البريد الإلكتروني واستكمال بيانات الحساب المطلوبة.'],
  ],
} as const;

export default function PublicSite({ initialLanguage = 'en' }: { initialLanguage?: Language }) {
  const language = initialLanguage, rtl = language === 'ar', t = copy[language];
  const [categories, setCategories] = useState<Category[]>([]), [lots, setLots] = useState<Lot[]>([]), [rails, setRails] = useState<Rail[]>([]);
  const [user, setUser] = useState<User | null>(null), [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All'), [search, setSearch] = useState(''), [visible, setVisible] = useState(24), [now, setNow] = useState(Date.now());
  const [authMode, setAuthMode] = useState<'identify' | 'login' | 'register' | null>(null), [accountIdentifier, setAccountIdentifier] = useState(''), [accountOpen, setAccountOpen] = useState(false), [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [paymentFor, setPaymentFor] = useState<Invoice | 'funds' | null>(null), [intent, setIntent] = useState<PaymentIntent | null>(null), [qr, setQr] = useState(''), [winnerHidden, setWinnerHidden] = useState(false), [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false), [searchOpen, setSearchOpen] = useState(false), [activeFaq, setActiveFaq] = useState(0), [activeSell, setActiveSell] = useState(0);

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
  useEffect(() => {
    document.documentElement.lang = rtl ? 'ar-AE' : 'en-AE'; document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    return () => { document.documentElement.lang = 'en-AE'; document.documentElement.dir = 'ltr'; };
  }, [rtl]);

  const lotById = useMemo(() => new Map(lots.map((lot) => [lot.id, lot])), [lots]);
  const filtered = useMemo(() => lots.filter((lot) => (selectedCategory === 'All' || lot.category === selectedCategory) && (!search || `${lot.title} ${lot.category}`.toLowerCase().includes(search.toLowerCase()))), [lots, search, selectedCategory]);
  const imageLots = useMemo(() => lots.filter((lot) => lot.imageUrl), [lots]);
  const endingCount = useMemo(() => lots.filter((lot) => lot.status === 'open' && lot.endsAt > now && lot.endsAt - now < 86_400_000).length, [lots, now]);
  const sellCategories = language === 'ar' ? ['المركبات والآليات', 'ساعات ومجوهرات', 'العقارات', 'أرقام لوحات'] : ['Vehicles & Machinery', 'Watches and Jewellery', 'Properties', 'License Plates'];
  const storyItems = language === 'ar' ? [
    ['2026', 'مزاد خيري لمؤسسة طيران الإمارات يجمع 8.8 ملايين درهم'], ['2025', 'الإمارات ترسّخ ريادتها الإنسانية عبر أنبل رقم'], ['2024', 'جهود الإمارات للمزادات في دعم الطرق خلال أمطار الإمارات'],
  ] : [
    ['2026', 'Emirates Airline Foundation charity auction raises AED 8.8 million'], ['2025', 'The UAE reinforces its humanitarian leadership through Noble Number'], ['2024', 'Emirates Auction rain rescue fleet supports UAE roads'],
  ];
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

  return <div id="top" className="ea-shell" dir={rtl ? 'rtl' : 'ltr'}>
    <header className="ea-header">
      <div className="ea-header-inner">
        <a href="#top" className="ea-brand" aria-label={t.emiratesAuction}><img src="/emirates-auction-logo.svg" alt={t.emiratesAuction}/></a>
        <div className="ea-header-actions">
          <button className="ea-icon-button" onClick={() => setSearchOpen((value) => !value)} aria-label={t.search}><Icon name="search" size={25}/></button>
          <button className="ea-icon-button" onClick={() => { setSelectedCategory('All'); document.querySelector('#lots')?.scrollIntoView({behavior:'smooth'}); }} aria-label={t.featured}><Icon name="wallet" size={24}/></button>
          <button className="ea-icon-button" onClick={() => document.querySelector('#lots')?.scrollIntoView({behavior:'smooth'})} aria-label={t.liveMarketplace}><Icon name="gavel" size={24}/></button>
          <button className="ea-icon-button" onClick={openAccount} aria-label={user ? t.profile : t.signIn}><Icon name="account" size={24}/>{user && <span className="ea-user-dot"/>}</button>
          <button className="ea-icon-button ea-menu-button" onClick={() => setMenuOpen(true)} aria-label={t.auctionCategories}><Icon name="menu" size={25}/><span/></button>
        </div>
      </div>
      {searchOpen && <div className="ea-header-search"><label><Icon name="search"/><input id="market-search" autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.searchPlaceholder}/><button onClick={() => setSearchOpen(false)} aria-label={rtl?'إغلاق':'Close'}><Icon name="close"/></button></label></div>}
    </header>

    {menuOpen && <div className="ea-drawer-layer" onMouseDown={(event) => event.currentTarget === event.target && setMenuOpen(false)}><aside className="ea-drawer" aria-label={t.auctionCategories}>
      <div className="ea-drawer-head"><img src="/emirates-auction-logo.svg" alt={t.emiratesAuction}/><button onClick={() => setMenuOpen(false)} aria-label={rtl?'إغلاق':'Close'}><Icon name="close"/></button></div>
      <div className="ea-drawer-content"><section><h2>{t.auctionCategories}</h2>{categories.map((category) => <button key={category.id} onClick={() => { setSelectedCategory(category.title); setMenuOpen(false); document.querySelector('#lots')?.scrollIntoView({behavior:'smooth'}); }}><span><Icon name={categoryIcon(category.title)} size={19}/>{localizedCategory(category.title, language)}</span><b>{category.itemCount || ''}</b></button>)}</section>
      <section><h2>{t.emiratesAuction}</h2>{[[t.about,'#about'],[t.calendar,'#story'],[t.sell,'#sell'],[t.help,'#faq'],[t.findUs,'#contact'],[t.contact,'#contact']].map(([label,href]) => <a key={label} href={href} onClick={() => setMenuOpen(false)}><span>{label}</span><Icon name="arrow" size={18}/></a>)}</section>
      <section className="ea-language"><h2>{t.language}</h2><a href={rtl ? '/' : '/ar'}>{rtl ? 'English' : 'العربية'} <Icon name="arrow" size={18}/></a></section></div>
    </aside></div>}

    <main>
      <h1 className="sr-only">{t.homeTitle}</h1>
      <section className="ea-auction-home" id="categories"><div className="ea-home-wrap">
        <a className="ea-ending-card" href="#lots"><div><strong>{t.endingToday}</strong><span>{t.endingDescription}</span></div><div className="ea-ending-meta"><b><Icon name="grid" size={17}/>{endingCount || lots.filter((lot) => lot.status === 'open').length}</b><b><Icon name="clock" size={18}/>{t.endingNow}</b></div></a>
        {loading ? <div className="ea-mosaic skeleton-grid">{Array.from({length:18},(_,index)=><i key={index}/>)}</div> : <div className="ea-mosaic">{categories.map((category,index) => {
          const sample = lots.find((lot) => lot.category === category.title && lot.imageUrl), featured = [4,6,13,18].includes(index);
          const mode = category.defaultMode === 'direct' ? t.directSale : category.defaultMode === 'request' ? t.request : category.defaultMode === 'notify' ? t.notify : t.onlineBidding;
          const action = category.defaultMode === 'direct' ? t.buyNow : category.defaultMode === 'request' ? (category.title.toLowerCase().includes('package') ? t.requestPackage : t.requestPlate) : category.defaultMode === 'notify' ? t.notify : t.onlineBidding;
          return <button key={category.id} className={`ea-category-tile ${featured ? 'ea-category-featured' : ''}`} style={featured && sample ? {backgroundImage:`linear-gradient(180deg,rgba(9,10,11,.05),rgba(9,10,11,.72)),url(${sample.imageUrl})`} : undefined} onClick={() => { setSelectedCategory(category.title); setVisible(24); document.querySelector('#lots')?.scrollIntoView({behavior:'smooth'}); }}>
            {!!category.itemCount && <span className="ea-count-badge">{category.itemCount}</span>}
            {!featured && <span className="ea-category-art">{sample ? <img src={sample.imageUrl} alt="" loading="lazy"/> : <Icon name={categoryIcon(category.title)} size={52}/>}</span>}
            <span className="ea-category-copy"><strong>{localizedCategory(category.title,language)}</strong><small>{mode}</small></span>
            <span className="ea-category-action">{category.defaultMode === 'direct' && <Icon name="wallet" size={15}/>} {action} <Icon name="arrow" size={15}/></span>
          </button>;
        })}</div>}
      </div></section>

      <section className="ea-market" id="lots"><div className="ea-content-wrap">
        <div className="ea-section-head"><div><span>{t.liveMarketplace}</span><h2>{selectedCategory === 'All' ? t.featured : localizedCategory(selectedCategory,language)}</h2><p>{filtered.length.toLocaleString(rtl?'ar-AE':'en-AE')} {t.lotsAvailable}</p></div><div className="ea-market-tools"><label><Icon name="search" size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search}/></label><select value={selectedCategory} onChange={(event) => { setSelectedCategory(event.target.value); setVisible(24); }}><option value="All">{t.allCategories}</option>{categories.map((category)=><option key={category.id} value={category.title}>{localizedCategory(category.title,language)}</option>)}</select></div></div>
        {error && <div className="alert alert-error">{error}<button onClick={() => setError('')}><Icon name="close" size={17}/></button></div>}
        {!loading && !filtered.length ? <Empty text={t.noLots}/> : <div className="ea-lot-grid">{filtered.slice(0,visible).map((lot) => <article className="ea-lot-card" key={lot.id}>
          <button className="ea-lot-image" onClick={() => setSelectedLot(lot)}>{lot.imageUrl ? <img src={lot.imageUrl} alt={lot.title} loading="lazy"/> : <span><Icon name={categoryIcon(lot.category)} size={62}/></span>}<span className="ea-lot-badge">{lot.bidCount}</span><Status tone={lot.status === 'open' ? 'red' : lot.status === 'mirrored' ? 'gold' : 'neutral'}>{lot.mode === 'direct' ? t.directSale : lot.status === 'open' ? t.onlineBidding : t.viewDetails}</Status></button>
          <div className="ea-lot-body"><span>{localizedCategory(lot.category,language)}</span><h3>{lot.title}</h3><div className="ea-lot-meta"><small>{lot.bidCount} {t.bids}</small><small>{t.lot} {lot.id.slice(0,8).toUpperCase()}</small></div><div className="ea-lot-price"><div><small>{lot.mode === 'direct' ? t.price : t.currentBid}</small><strong>{money(lot.currentPrice)}</strong></div>{lot.endsAt > now && <div className="timer"><Icon name="clock" size={16}/><span>{remaining(lot.endsAt,now)}</span></div>}</div><button onClick={() => setSelectedLot(lot)}>{lot.mode === 'direct' ? t.viewItem : lot.status === 'open' ? t.bidNow : t.viewDetails}<Icon name="arrow" size={17}/></button></div>
        </article>)}</div>}
        {visible < filtered.length && <div className="load-more"><button className="outline-button" onClick={() => setVisible((value) => value + 24)}>{t.loadMore}</button></div>}
      </div></section>

      <section className="ea-records" id="about"><div className="ea-content-wrap"><div className="ea-title-block"><span>{t.recordsEyebrow}</span><h2>{t.recordsTitle}</h2><p>{t.recordCaption}</p></div><div className="ea-record-track">{[0,4,8].map((imageIndex,index) => { const lot=imageLots[imageIndex] ?? imageLots[index]; return <article key={index}>{lot?.imageUrl && <img src={lot.imageUrl} alt="" loading="lazy"/>}<div><b>0{index+1}</b><h3>{index===0 ? (rtl?'أغلى لوحة مركبة في العالم':'The most expensive car license plate') : index===1 ? (rtl?'أغلى عقار في مزاد إلكتروني':'The most expensive property sold online') : (rtl?'أغلى مركبة في مزاد إلكتروني':'A landmark vehicle auction')}</h3><span>{t.auctionPrice}</span><strong>{index===0?'AED 55 million':index===1?'AED 700.2 million':'AED 74.1 million'}</strong></div></article>; })}</div><button className="ea-outline-light">{t.recordsCta}<Icon name="arrow" size={17}/></button></div></section>

      <section className="ea-numbers"><div className="ea-content-wrap"><div className="ea-title-block light"><span>{t.numbersEyebrow}</span><h2>{t.numbersTitle}</h2></div><div className="ea-number-grid">{[['15M+',t.activeUsers,'account'],['20+',t.years,'calendar'],['2300+',t.auctions,'gavel'],['1000+',t.employees,'grid'],['32',t.branches,'location']].map(([value,label,icon],index)=><div key={String(label)} className={index===4?'ea-branches':''}><Icon name={(icon==='location'?'grid':icon) as IconName} size={30}/><strong>{value}</strong><span>{label}</span></div>)}</div></div></section>

      <section className="ea-story" id="story"><div className="ea-content-wrap"><div className="ea-title-block"><span>{t.storyEyebrow}</span><h2>{t.storyTitle}</h2></div><div className="ea-year-line">{['2026','2025','2024','2023','2022','2021','2020','2018','2016','2014','2010','2004'].map((year,index)=><span className={index===0?'active':''} key={year}>{year}</span>)}</div><div className="ea-story-grid">{storyItems.map(([year,title],index)=>{const lot=imageLots[10+index]??imageLots[index];return <article key={year}>{lot?.imageUrl&&<img src={lot.imageUrl} alt="" loading="lazy"/>}<div><span>{year}</span><h3>{title}</h3><p>{rtl?'محطة بارزة في مسيرة الإمارات للمزادات ودورها في المبادرات المجتمعية والإنسانية.':'A defining milestone in Emirates Auction’s journey and its community and humanitarian initiatives.'}</p></div></article>;})}</div></div></section>

      <section className="ea-partner" style={imageLots[14]?.imageUrl?{backgroundImage:`linear-gradient(90deg,rgba(10,10,11,.9),rgba(10,10,11,.35)),url(${imageLots[14].imageUrl})`}:undefined}><div className="ea-content-wrap"><span>{t.partnerEyebrow}</span><h2>{t.partnerTitle}</h2><p>{t.partnerText}</p><a href="#contact">{t.letsTalk}<Icon name="arrow"/></a></div></section>

      <section className="ea-media"><div className="ea-content-wrap"><div className="ea-title-row"><div><span>{t.newsEyebrow}</span><h2>{t.newsTitle}</h2></div><a href="#news">{t.moreNews}<Icon name="arrow" size={17}/></a></div><div className="ea-news-grid" id="news">{news[language].map(([title,published],index)=>{const lot=imageLots[16+index]??imageLots[index];return <article key={title} className={index===0?'featured':''}>{lot?.imageUrl&&<img src={lot.imageUrl} alt="" loading="lazy"/>}<div><time>{published}</time><h3>{title}</h3>{index===0&&<p>{rtl?'المصدر: المركز الإعلامي للإمارات للمزادات':'Source: Emirates Auction Media Center'}</p>}</div></article>;})}</div><div className="ea-title-row gallery-title"><div><span>{t.galleryEyebrow}</span><h2>{t.galleryTitle}</h2></div><a href="#gallery">{t.viewAlbums}<Icon name="arrow" size={17}/></a></div><div className="ea-gallery-grid" id="gallery">{[20,21,22].map((imageIndex,index)=>{const lot=imageLots[imageIndex]??imageLots[index];return <figure key={index}>{lot?.imageUrl&&<img src={lot.imageUrl} alt="" loading="lazy"/>}<figcaption>{index===0?(rtl?'مزاد أنبل رقم الخيري':'Most Noble Number charity auction'):index===1?(rtl?'وقف المليار وجبة':'One Billion Meals Endowment Auction'):(rtl?'ذكريات الإمارات للمزادات':'Emirates Auction memories')}</figcaption></figure>;})}</div></div></section>

      <section className="ea-sell" id="sell"><div className="ea-content-wrap"><div className="ea-title-block light"><span>{t.sellEyebrow}</span><h2>{t.sellTitle}</h2></div><div className="ea-sell-grid"><nav>{sellCategories.map((title,index)=><button className={activeSell===index?'active':''} onClick={()=>setActiveSell(index)} key={title}><span>0{index+1}</span>{title}<b>+</b></button>)}</nav><article style={imageLots[24+activeSell]?.imageUrl?{backgroundImage:`linear-gradient(90deg,rgba(6,7,8,.9),rgba(6,7,8,.25)),url(${imageLots[24+activeSell].imageUrl})`}:undefined}><span>0{activeSell+1} / 04</span><h3>{sellCategories[activeSell]}</h3><p>{rtl?'استفد من أفضل قيمة لمقتنياتك من خلال منصتنا الموثوقة، وتمتع بعملية بيع منظمة وسلسة حتى النهاية.':'Benefit from the best value for your assets through our trusted platform and enjoy an organized, seamless selling journey from start to finish.'}</p><a href="#contact">{t.sellNow}<Icon name="arrow" size={17}/></a></article></div></div></section>

      <section className="ea-faq" id="faq"><div className="ea-content-wrap"><div><h2>{t.faqTitle}<br/><strong>{t.faqSubtitle}</strong></h2><p>{t.faqIntro}</p></div><div className="ea-faq-list">{faqs[language].map(([question,answer],index)=><article className={activeFaq===index?'active':''} key={question}><button onClick={()=>setActiveFaq(index)} aria-expanded={activeFaq===index}>{question}<span>{activeFaq===index?'−':'+'}</span></button>{activeFaq===index&&<p>{answer}</p>}</article>)}<a href="#contact">{t.readAll}<Icon name="arrow" size={17}/></a></div></div></section>
    </main>

    <footer className="ea-footer" id="contact"><div className="ea-content-wrap"><div className="ea-footer-links"><section><h3>{t.footerAbout}</h3><a href="#about">{t.about}</a><a href="#story">{t.storyTitle}</a><a href="#news">{t.newsTitle}</a><a href="#contact">{t.findUs}</a></section><section><h3>{t.footerAuctions}</h3>{categories.slice(0,7).map((category)=><a href="#categories" key={category.id}>{localizedCategory(category.title,language)}</a>)}</section><section><h3>{t.footerHelp}</h3><a href="#faq">{t.help}</a><a href="#faq">{rtl?'الأسئلة الشائعة':'FAQ'}</a><a href="#contact">{t.contact}</a></section><section><h3>{t.footerQuick}</h3><a href="#sell">{t.sell}</a><a href="#categories">{t.requestPlate}</a><a href="#categories">{t.requestPackage}</a></section><section className="ea-help-card"><h3>{t.available247}</h3><p>UAE 600 545 454</p><p>support@emiratesauction.com</p></section></div><div className="ea-footer-social"><div><h3>{t.contact}</h3><p>{rtl?'تابعنا واكتشف أكبر منصة مزادات في المنطقة.':'Follow our channels and discover the region’s trusted auction marketplace.'}</p></div><img src="/emirates-auction-logo.svg" alt={t.emiratesAuction}/></div></div><div className="ea-footer-bottom"><div className="ea-content-wrap"><span>© {new Date().getFullYear()} {t.copyright}</span><span>{rtl?'الدرهم الإماراتي · التسوية بالعملات الرقمية':'AED · Crypto settlement rails'}</span><a href={rtl?'/' : '/ar'}>{rtl?'English':'العربية'}</a></div></div></footer>

    {notice && <div className="toast"><Icon name="shield"/>{notice}</div>}

    {authMode && <Modal rtl={rtl} title={authMode === 'identify' ? (rtl?'الدخول إلى حسابك':'Access your account') : authMode === 'login' ? (rtl?'مرحباً بعودتك':'Welcome back') : (rtl?'استكمال حسابك':'Complete your account')} close={() => { setAuthMode(null); setError(''); }}><form className="stack-form" onSubmit={submitAuth}>
      {authMode === 'identify' && <><div className="migration-note"><Icon name="shield" size={24}/><div><strong>{rtl?'نعمل على تحسين نظام الحسابات':'We are improving our account system'}</strong><p>{rtl?'أدخل رقم العميل أو رقم الهاتف أو البريد الإلكتروني. إذا لم يكن حسابك متاحاً بعد، يمكنك استكمال بياناتك والمتابعة فوراً.':'Enter your Customer ID, mobile number or email. If your account is not yet available online, you can complete your details and continue immediately.'}</p></div></div><label>{rtl?'رقم العميل أو الهاتف أو البريد الإلكتروني':'Customer ID, mobile number or email'}<input name="identifier" required minLength={3} autoComplete="username" placeholder="EA-…, +971…, or name@example.com" autoFocus/></label></>}
      {authMode === 'login' && <><div className="account-found"><span>{rtl?'تم العثور على الحساب':'Account located'}</span><strong>{accountIdentifier}</strong></div><label>{rtl?'كلمة المرور':'Password'}<input name="password" type="password" required autoComplete="current-password" autoFocus/></label></>}
      {authMode === 'register' && <><div className="migration-note"><Icon name="account" size={24}/><div><strong>{rtl?'استكمال التحديث':'Complete the migration'}</strong><p>{rtl?'لم نعثر على حساب إلكتروني بهذه البيانات. أكمل الحقول التالية وسيتم إنشاء حسابك وتسجيل دخولك فوراً.':'We could not locate an online account with that information. Fill in the fields below and your account will be created and signed in immediately.'}</p></div></div><label>{rtl?'الاسم الكامل':'Full name'}<input name="name" required minLength={2} autoComplete="name" autoFocus/></label><label>{rtl?'رقم الهاتف':'Mobile number'}<input name="phone" required minLength={7} defaultValue={/^\+?[0-9 ()-]{7,24}$/.test(accountIdentifier) ? accountIdentifier : ''} placeholder="+971 50 000 0000" autoComplete="tel"/><small>{rtl?'مطلوب. أضف رمز الدولة حتى يتمكن فريقنا من التواصل معك بشأن المزايدات والعناصر الفائزة.':'Required. Include the country code so our team can contact you about bids and winning lots.'}</small></label><label>{rtl?'البريد الإلكتروني':'Email address'}<input name="email" type="email" required defaultValue={accountIdentifier.includes('@') ? accountIdentifier : ''} autoComplete="email"/></label><label>{rtl?'إنشاء كلمة مرور':'Create password'}<input name="password" type="password" required minLength={12} autoComplete="new-password"/><small>{rtl?'استخدم 12 حرفاً على الأقل.':'Use at least 12 characters.'}</small></label></>}
      {error && <div className="alert alert-error">{error}</div>}<button className="black-button" disabled={busy}>{busy ? (rtl?'يرجى الانتظار…':'Please wait…') : authMode === 'identify' ? (rtl?'متابعة':'Continue') : authMode === 'login' ? (rtl?'تسجيل الدخول':'Sign In') : (rtl?'إنشاء الحساب وتسجيل الدخول':'Create Account & Sign In')}</button>{authMode !== 'identify' && <p className="form-switch"><button type="button" onClick={startIdentityCheck}>{rtl?'استخدام رقم عميل أو هاتف أو بريد مختلف':'Use a different ID, mobile or email'}</button></p>}
    </form></Modal>}

    {selectedLot && <Modal rtl={rtl} title={selectedLot.title} close={() => { setSelectedLot(null); setError(''); }} wide><div className="lot-dialog"><div className="lot-dialog-image">{selectedLot.imageUrl ? <img src={selectedLot.imageUrl} alt={selectedLot.title}/> : <Icon name={categoryIcon(selectedLot.category)} size={88}/>}</div><div className="lot-dialog-copy"><div className="dialog-tags"><Status tone="red">{localizedCategory(selectedLot.category,language)}</Status><Status>{selectedLot.status}</Status></div><p>{selectedLot.description || (rtl?'راجع تفاصيل العنصر ومتطلبات التأمين وشروط المزايدة قبل المتابعة.':'Review the lot details, deposit requirement and bidding conditions before continuing.')}</p><dl><div><dt>{rtl?'السعر الحالي':'Current price'}</dt><dd>{money(selectedLot.currentPrice)}</dd></div><div><dt>{rtl?'الحد الأدنى للمزايدة التالية':'Next minimum bid'}</dt><dd>{money(selectedLot.winnerId ? selectedLot.currentPrice + selectedLot.increment : selectedLot.startPrice)}</dd></div><div><dt>{rtl?'قاعدة التأمين':'Deposit rule'}</dt><dd>{selectedLot.depositBps / 100}% · {rtl?'الحد الأدنى':'minimum'} {money(selectedLot.minimumDeposit)}</dd></div><div><dt>{rtl?'استخدام التأمين':'Deposit use'}</dt><dd>{selectedLot.depositUsage === 'checkout_eligible' ? (rtl?'يُخصم عند الدفع':'Applied at checkout') : (rtl?'تأمين للمزايدة فقط':'Bidding security only')}</dd></div><div><dt>{rtl?'التمديد التلقائي':'Automatic extension'}</dt><dd>{selectedLot.extensionMinutes} {rtl?'دقيقة أثناء فتح المزايدة':'minutes while bidding is open'}</dd></div><div><dt>{rtl?'موعد الإغلاق':'Closes'}</dt><dd>{date(selectedLot.endsAt)}</dd></div></dl>
          <div className="policy-note"><strong>{rtl?'سياسة عدم الدفع':'Non-payment policy'}</strong><p>{rtl?`لدى الفائز 48 ساعة بعد اعتماد النتيجة للدفع. قد يؤدي التخلف إلى إلغاء الشراء وإعادة العنصر، ومصادرة 100% من مبلغ التأمين، وإضافة غرامة ${selectedLot.nonPaymentPenaltyBps / 100}% و${money(selectedLot.lateFeeDaily)} عن كل يوم تأخير مطبق، مع إمكانية اتخاذ الإجراءات القانونية.`:`The winner has 48 hours after adjudication to pay. Default may cancel the purchase and relist the lot, forfeit 100% of the security deposit, add a ${selectedLot.nonPaymentPenaltyBps / 100}% penalty and ${money(selectedLot.lateFeeDaily)} for each applicable late day. Civil or criminal action may also be pursued under the platform terms.`}</p></div>
          {selectedLot.mode === 'auction' && selectedLot.status === 'open' ? <form className="bid-form" onSubmit={placeBid}><label>{rtl?'مزايدتك (درهم)':'Your bid (AED)'}<input name="amount" inputMode="decimal" defaultValue={((selectedLot.winnerId ? selectedLot.currentPrice + selectedLot.increment : selectedLot.startPrice)/100).toFixed(2)} required/></label><div className="deposit-preview">{rtl?'الرصيد المطلوب يبدأ من':'Required balance from'} <strong>{money(requiredDeposit(selectedLot, selectedLot.winnerId ? selectedLot.currentPrice + selectedLot.increment : selectedLot.startPrice))}</strong></div>{error && <div className="alert alert-error">{error}</div>}<button className="red-button" disabled={busy}>{user ? (rtl?'تأكيد المزايدة':'Confirm bid') : (rtl?'سجل الدخول للمزايدة':'Sign in to bid')}</button></form> : <div className="closed-note"><Icon name="clock"/> {rtl?'هذا العنصر لا يقبل المزايدات حالياً.':'This lot is not currently accepting bids.'}</div>}
        </div></div></Modal>}

    {accountOpen && user && <Modal rtl={rtl} title={rtl?'حسابي':'My account'} close={() => { setAccountOpen(false); setError(''); }} wide><div className="account-head"><div className="account-person"><span><Icon name="account" size={28}/></span><div><strong>{user.name}</strong><small>{rtl?'رقم العميل':'Customer ID'} {user.username ?? user.id} · {user.email} · {user.phone}</small></div></div><button className="text-button" onClick={logout}>{rtl?'تسجيل الخروج':'Sign out'}</button></div>
      <div className="wallet-cards"><div><span>{rtl?'الرصيد المتاح':'Available balance'}</span><strong>{money(account?.wallet.available ?? 0)}</strong><small>{rtl?'القيمة المرجعية بالدرهم':'AED reference value'}</small></div><div><span>{rtl?'محجوز للمزايدات':'Reserved for bids'}</span><strong>{money(account?.wallet.reserved ?? 0)}</strong><small>{rtl?'متغير وفق قواعد العنصر':'Variable by lot rules'}</small></div><div className="wallet-actions"><button className="red-button" onClick={() => { setPaymentFor('funds'); setIntent(null); }}>{rtl?'إضافة رصيد':'Add funds'}</button></div></div>
      {outstanding && <div className="winner-banner"><Icon name="gavel" size={30}/><div><strong>{rtl?'الدفع مطلوب لعنصر فائز':'Payment required for a winning lot'}</strong><span>{lotById.get(outstanding.lotId)?.title ?? (rtl?'عنصر مزاد':'Auction lot')} · {money(outstanding.due)} {rtl?'مستحق قبل':'due by'} {date(outstanding.dueAt)}</span></div><button onClick={() => { setPaymentFor(outstanding); setIntent(null); }}>{rtl?'عرض ودفع':'View & pay'}</button></div>}
      <div className="account-sections"><section><h3>{rtl?'مزايداتي':'My bids'}</h3>{account?.bids.length ? <div className="account-list">{account.bids.slice(0,20).map((bid)=><div key={bid.id}><div><strong>{lotById.get(bid.lotId)?.title ?? `${rtl?'عنصر':'Lot'} ${bid.lotId.slice(0,8)}`}</strong><small>{date(bid.createdAt)} · {rtl?'الجولة':'Round'} {bid.round}</small></div><b>{money(bid.amount)}</b></div>)}</div> : <Empty text={rtl?'لم تقدم أي مزايدة بعد.':'You have not placed a bid yet.'}/>}</section><section><h3>{rtl?'الفواتير والعناصر الفائزة':'Invoices & wins'}</h3>{account?.invoices.length ? <div className="account-list">{account.invoices.map((invoice)=><div key={invoice.id}><div><strong>{lotById.get(invoice.lotId)?.title ?? (rtl?'عنصر مزاد':'Auction lot')}</strong><small>{invoice.status} · {rtl?'الإجمالي':'total'} {money(invoice.total)} · {rtl?'التأمين':'deposit'} {money(invoice.depositApplied)}{invoice.status === 'defaulted' ? ` · ${rtl?'الغرامة':'penalty'} ${money(invoice.penaltyAmount + invoice.lateFeeAmount)}` : ` · ${rtl?'مستحق':'due'} ${date(invoice.dueAt)}`}</small></div><b>{money(invoice.status === 'defaulted' ? invoice.penaltyAmount + invoice.lateFeeAmount : invoice.due)}</b></div>)}</div> : <Empty text={rtl?'لم تصدر أي فواتير.':'No invoices have been issued.'}/>}</section></div>
      <section className="withdraw-section"><h3>{rtl?'طلب سحب':'Request a withdrawal'}</h3><p>{rtl?'يمكن طلب سحب الرصيد المتاح غير المستخدم إلى محفظة مدعومة. تتم مراجعة كل طلب قبل التحويل.':'Unused available balance can be requested to a supported wallet. Every request is reviewed before release.'}</p><form onSubmit={requestWithdrawal}><label>{rtl?'المبلغ (درهم)':'Amount (AED)'}<input name="amount" inputMode="decimal" required placeholder="5000.00"/></label><label>{rtl?'العملة والشبكة':'Asset & network'}<select name="rail" required>{rails.map((rail,index)=><option value={index} key={`${rail.asset}-${rail.network}`}>{rail.asset} · {rail.network} ({rail.standard})</option>)}</select></label><label className="grow">{rtl?'عنوان الاستلام':'Destination address'}<input name="destination" required minLength={12}/></label><label>{rtl?'مذكرة / وسم':'Memo / tag'}<input name="memo"/></label><button className="dark-button" disabled={busy}>{rtl?'إرسال الطلب':'Submit request'}</button></form></section>
      {error && <div className="alert alert-error">{error}</div>}
    </Modal>}

    {outstanding && !winnerHidden && !accountOpen && <div className="winner-popup"><button className="winner-close" onClick={() => setWinnerHidden(true)}><Icon name="close"/></button><span className="winner-icon"><Icon name="gavel" size={38}/></span><div><span className="eyebrow">{rtl?'تهانينا':'Congratulations'}</span><h2>{rtl?'لقد فزت بالمزاد':'You won an auction'}</h2><p>{outstanding.message || (rtl?'تم اعتماد العنصر الفائز. أكمل المبلغ المتبقي للمتابعة.':'Your winning lot has been adjudicated. Complete the remaining payment to continue.')}</p><dl><div><dt>{rtl?'قيمة الإرساء':'Hammer price'}</dt><dd>{money(outstanding.hammerPrice)}</dd></div><div><dt>{rtl?'التأمين المخصوم':'Deposit applied'}</dt><dd>− {money(outstanding.depositApplied)}</dd></div><div><dt>{rtl?'الرسوم والضريبة':'Fees & VAT'}</dt><dd>{money(outstanding.fee + outstanding.vat)}</dd></div><div><dt>{rtl?'المبلغ المستحق':'Amount due'}</dt><dd>{money(outstanding.due)}</dd></div><div><dt>{rtl?'آخر موعد للدفع':'Payment deadline'}</dt><dd>{date(outstanding.dueAt)}</dd></div></dl><div className="alert alert-warning">{rtl?'قد يؤدي عدم الدفع خلال 48 ساعة إلى إلغاء الشراء ومصادرة التأمين وإضافة غرامة 30% و105 دراهم عن كل يوم تأخير مطبق واتخاذ إجراءات قانونية.':'Non-payment after 48 hours may cancel the purchase, forfeit the security deposit, add a 30% penalty and AED 105 per applicable late day, and lead to legal action.'}</div><p className="contact-line"><Icon name="phone" size={17}/> {outstanding.contact}</p><button className="red-button" onClick={() => { setPaymentFor(outstanding); setIntent(null); }}>{rtl?'اختر العملة الرقمية وادفع':'Choose crypto & pay'}</button></div></div>}

    {paymentFor && <Modal rtl={rtl} title={paymentFor === 'funds' ? (rtl?'إضافة رصيد':'Add funds') : (rtl?'دفع فاتورة العنصر الفائز':'Pay winning invoice')} close={() => { setPaymentFor(null); setIntent(null); setError(''); }}><div className="payment-intro"><Icon name="wallet" size={30}/><div><strong>{paymentFor === 'funds' ? (rtl?'تمويل رصيد المزايدة':'Fund your bidding balance') : `${rtl?'المبلغ المستحق':'Amount due'}: ${money(paymentFor.due)}`}</strong><p>{rtl?'اختر العملة والشبكة بدقة. يحول مزود الدفع القيمة من الدرهم عند إنشاء تعليمات الدفع.':'Choose the exact asset and network. The AED value is converted by the payment provider when the instruction is created.'}</p></div></div>
      {!intent ? <form className="stack-form" onSubmit={createPayment}>{paymentFor === 'funds' && <label>{rtl?'المبلغ المراد إضافته (درهم)':'Amount to credit (AED)'}<input name="amount" inputMode="decimal" required placeholder="5000.00"/></label>}<label>{rtl?'العملة والشبكة':'Asset and network'}<select name="rail" required>{rails.map((rail,index)=><option value={index} key={`${rail.asset}-${rail.network}`}>{rail.asset} · {rail.network} · {rail.standard}</option>)}</select><small>{rtl?'قد يؤدي الإرسال عبر شبكة مختلفة إلى فقدان دائم للأموال.':'Sending on a different network may result in permanent loss.'}</small></label>{error && <div className="alert alert-error">{error}</div>}<button className="red-button" disabled={busy}>{busy ? (rtl?'جارٍ إنشاء تعليمات آمنة…':'Creating secure instruction…') : (rtl?'إنشاء تعليمات الدفع':'Generate payment instruction')}</button><p className="secure-note"><Icon name="shield" size={18}/> {rtl?'العنوان والتحويل المباشر ووقت الانتهاء تأتي حصراً من مزود الدفع المهيأ.':'Address, live conversion and expiry come only from the configured payment provider.'}</p></form> : <div className="payment-instruction">{qr && <img src={qr} alt={rtl?'رمز QR للدفع بالعملات الرقمية':'Crypto payment QR code'}/>}<div className="payment-amount"><span>{rtl?'أرسل بالضبط':'Send exactly'}</span><strong>{intent.cryptoAmount} {intent.asset}</strong><small>{intent.network} · {intent.standard}</small></div><label>{rtl?'عنوان الاستلام':'Destination address'}<code>{intent.address}</code></label>{intent.memo && <label>{rtl?'مذكرة / وسم الوجهة':'Memo / destination tag'}<code>{intent.memo}</code></label>}<dl><div><dt>{rtl?'القيمة المرجعية بالدرهم':'AED reference'}</dt><dd>{money(intent.fiatAmount)}</dd></div><div><dt>{rtl?'سعر التحويل':'Quote rate'}</dt><dd>{intent.quoteRate}</dd></div><div><dt>{rtl?'ينتهي':'Expires'}</dt><dd>{date(intent.expiresAt)}</dd></div></dl><div className="alert alert-warning">{rtl?`أرسل ${intent.asset} فقط عبر شبكة ${intent.network}. يضاف الرصيد بعد عدد التأكيدات المطلوب من مزود الدفع.`:`Send only ${intent.asset} on ${intent.network}. Balance is credited after the provider's required confirmations.`}</div></div>}
    </Modal>}
  </div>;
}
