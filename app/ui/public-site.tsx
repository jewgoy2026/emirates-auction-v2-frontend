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

type V1HomeCategory = {
  key: string; titleEn: string; titleAr: string; targetCategory: string; count: number; active: boolean;
  mode: Category['defaultMode']; imageEn: string; imageAr: string; backgroundImageEn: string; backgroundImageAr: string;
  mainTextColor: string; secondaryTextColor: string; cardSize: string; cardCategory: string; navLink: string;
};
type V1HomeSnapshot = {
  generatedAt: string;
  endingToday: { count: number; minimumEndDate: string | null };
  banners: Array<{ type: number; order: number; url: string; tabletUrl: string; mobileUrl: string; title: string; subtitle: string }>;
  categories: V1HomeCategory[];
  achievements: Array<{ title: string; price: string; date: string; imageUrl: string }>;
  statistics: Array<{ value: string; key: 'activeUsers' | 'years' | 'auctions' | 'employees' | 'branches' }>;
  stories: Array<{ year: string; items: Array<{ title: string; subtitle: string; imageUrl: string }> }>;
  news: Array<{ id: string; title: string; titleAr: string; description: string; date: string; imageUrl: string; sourceTitle: string }>;
  gallery: Array<{ id: string; title: string; subtitle: string; imageUrl: string; mediaType: number }>;
  faqs: Array<{ id: string; question: string; answer: string }>;
};
type PlatePreviewSnapshot = {
  generatedAt: string;
  formats: Array<{ category: string; auctionTypeId: number; suffix: string; shortSuffix: string; cardSize: number; plateType: number }>;
  makes: Array<{ id: number; title: string; logoUrl: string; models: Array<{ id: string; title: string; imageTemplate: string }> }>;
};
type PlateMeta = { auctionTypeId: number; suffix: string; plateType: number; code: string; number: string };

type HomeCategory = V1HomeCategory & { source: Category | null };

function plateMeta(lot: Lot, preview: PlatePreviewSnapshot | null): PlateMeta | null {
  const format = preview?.formats.find((item) => item.category === lot.category);
  if (!format) return null;
  const title = lot.title.startsWith(lot.category) ? lot.title.slice(lot.category.length).trim() : lot.title.trim();
  const parts = title.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  const number = parts.at(-1) ?? '', code = parts.slice(0, -1).join(' ');
  if (!/^[A-Za-z0-9-]{1,12}$/.test(code) || !/^\d{1,12}$/.test(number)) return null;
  return { auctionTypeId: format.auctionTypeId, suffix: format.suffix, plateType: format.plateType, code, number };
}

function plateWorkerUrl(template: string, plate: PlateMeta, width = 900, height = 700, download = false) {
  const image = new URL(template).searchParams.get('image') ?? '';
  const query = new URLSearchParams({ image, auctionTypeId: String(plate.auctionTypeId), plateno: plate.number, code: plate.code, platetype: plate.suffix, width: String(width), height: String(height) });
  if (download) query.set('download','1');
  return `/api/v1/public/plate-preview?${query}`;
}

function plateCardUrl(plate: PlateMeta) {
  return `/api/v1/public/plate-image?${new URLSearchParams({ auctionTypeId: String(plate.auctionTypeId), plateno: plate.number, code: plate.code })}`;
}

function PlateVisual({ plate, title, className = '' }: { plate: PlateMeta; title: string; className?: string }) {
  const [imageLoaded,setImageLoaded]=useState(false);
  return <span className={`ea-plate-card-visual ${className}`} data-image-loaded={imageLoaded ? 'true' : 'false'}>
    <span className="ea-plate-art" aria-hidden="true"><small>UNITED ARAB EMIRATES</small><strong><i>{plate.code}</i>{plate.number}</strong></span>
    <img src={plateCardUrl(plate)} alt={title} loading="lazy" onLoad={()=>setImageLoaded(true)} onError={(event) => { setImageLoaded(false); event.currentTarget.hidden = true; }}/>
  </span>;
}

function ResponsiveHeroBanner({ banner }: { banner: V1HomeSnapshot['banners'][number] }) {
  const [media, setMedia] = useState({ src: banner.url, layout: 'desktop' });
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 620px)'), tablet = window.matchMedia('(min-width: 621px) and (max-width: 1180px)');
    const update = () => setMedia(mobile.matches ? { src: banner.mobileUrl || banner.url, layout: 'mobile' } : tablet.matches ? { src: banner.tabletUrl || banner.url, layout: 'tablet' } : { src: banner.url, layout: 'desktop' });
    update(); mobile.addEventListener('change', update); tablet.addEventListener('change', update);
    return () => { mobile.removeEventListener('change', update); tablet.removeEventListener('change', update); };
  }, [banner.mobileUrl, banner.tabletUrl, banner.url]);
  return <div className={`ea-hero-banner ea-hero-banner-${media.layout}`} aria-label={banner.title || 'Proud UAE'}>
    <video key={media.src} src={media.src} autoPlay muted loop playsInline preload="auto"/>
    <span className="sr-only">{banner.subtitle || banner.title}</span>
  </div>;
}

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
  const [v1Home, setV1Home] = useState<V1HomeSnapshot | null>(null);
  const [platePreview, setPlatePreview] = useState<PlatePreviewSnapshot | null>(null), [plateCarLot, setPlateCarLot] = useState<Lot | null>(null), [plateMakeId, setPlateMakeId] = useState(0), [plateModelId, setPlateModelId] = useState(''), [plateLoading, setPlateLoading] = useState(false), [plateDownloading, setPlateDownloading] = useState(false);
  const [user, setUser] = useState<User | null>(null), [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All'), [search, setSearch] = useState(''), [visible, setVisible] = useState(24), [now, setNow] = useState(Date.now());
  const [authMode, setAuthMode] = useState<'identify' | 'login' | 'register' | null>(null), [accountIdentifier, setAccountIdentifier] = useState(''), [accountOpen, setAccountOpen] = useState(false), [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]), [galleryIndex, setGalleryIndex] = useState(0), [galleryLoading, setGalleryLoading] = useState(false);
  const [vehicleSpecs,setVehicleSpecs]=useState<Array<{label:string;value:string}>>([]), [sourceDescription,setSourceDescription]=useState('');
  const [paymentFor, setPaymentFor] = useState<Invoice | 'funds' | null>(null), [intent, setIntent] = useState<PaymentIntent | null>(null), [qr, setQr] = useState(''), [winnerHidden, setWinnerHidden] = useState(false), [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false), [searchOpen, setSearchOpen] = useState(false), [activeFaq, setActiveFaq] = useState(0), [activeSell, setActiveSell] = useState(0), [activeStoryYear, setActiveStoryYear] = useState('');

  async function loadPublic() {
    const homeRequest = fetch('/snapshot/v1-home.json', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('V1 homepage snapshot is unavailable.');
      return response.json() as Promise<V1HomeSnapshot>;
    }).catch(() => null);
    const plateRequest = fetch('/snapshot/plate-preview.json', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('Plate preview snapshot is unavailable.');
      return response.json() as Promise<PlatePreviewSnapshot>;
    }).catch(() => null);
    void homeRequest.then((home) => { if (home) { setV1Home(home); setActiveStoryYear((value) => value || home.stories[0]?.year || ''); } });
    void plateRequest.then((preview) => { if (preview) setPlatePreview(preview); });
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
  useEffect(() => {
    if (!lots.length) return;
    const syncRoute = () => {
      const id = window.location.pathname.match(/\/lots\/([0-9a-f-]{36})/i)?.[1];
      setSelectedLot(id ? lots.find((lot) => lot.id === id) ?? null : null);
    };
    syncRoute(); window.addEventListener('popstate', syncRoute); return () => window.removeEventListener('popstate', syncRoute);
  }, [lots]);
  useEffect(() => {
    if (!selectedLot) { setGalleryImages([]); setGalleryIndex(0); setGalleryLoading(false); setVehicleSpecs([]); setSourceDescription(''); return; }
    const primary = Array.from(new Set([selectedLot.imageUrl, ...selectedLot.mediaUrls].filter(Boolean)));
    setGalleryImages(primary); setGalleryIndex(0);
    const selectedPlate = plateMeta(selectedLot, platePreview);
    if (selectedPlate) {
      const carImages = (platePreview?.makes.flatMap((make) => make.models) ?? []).slice(0,4).map((model) => plateWorkerUrl(model.imageTemplate, selectedPlate, 900, 700));
      setGalleryImages(Array.from(new Set([plateCardUrl(selectedPlate), ...carImages]))); return;
    }
    if (!selectedLot.sourceUrl) return;
    const controller = new AbortController(); setGalleryLoading(true);
    fetch(`/api/v1/public/lot-gallery?source=${encodeURIComponent(selectedLot.sourceUrl)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : { items: [],specifications:[],description:'' })
      .then((data: { items?: string[]; specifications?: Array<{label:string;value:string}>; description?:string }) => { setGalleryImages(Array.from(new Set([...primary, ...(data.items ?? [])])).slice(0,60));setVehicleSpecs(data.specifications??[]);setSourceDescription(data.description??''); })
      .catch(() => undefined).finally(() => setGalleryLoading(false));
    return () => controller.abort();
  }, [selectedLot, platePreview]);

  const lotById = useMemo(() => new Map(lots.map((lot) => [lot.id, lot])), [lots]);
  const filtered = useMemo(() => lots.filter((lot) => {
    const categoryMatch = selectedCategory === 'All' || lot.category === selectedCategory ||
      (selectedCategory === 'Plate Numbers' && lot.category.endsWith(' Plates')) ||
      (selectedCategory === 'Surplus' && lot.category.includes('General Items')) ||
      (selectedCategory === 'Ending Today' && lot.endsAt > now && lot.endsAt - now <= 86_400_000);
    return categoryMatch && (!search || `${lot.title} ${lot.category}`.toLowerCase().includes(search.toLowerCase()));
  }).sort((a, b) => b.currentPrice - a.currentPrice || b.bidCount - a.bidCount || a.endsAt - b.endsAt), [lots, now, search, selectedCategory]);
  const imageLots = useMemo(() => lots.filter((lot) => lot.imageUrl), [lots]);
  const endingCount = useMemo(() => lots.filter((lot) => lot.status === 'open' && lot.endsAt > now && lot.endsAt - now < 86_400_000).length, [lots, now]);
  const headerCounts = useMemo(() => ({
    motors: lots.filter((lot) => lot.category === 'Vehicles & Machinery').length,
    plates: lots.filter((lot) => lot.category.endsWith(' Plates')).length,
    properties: lots.filter((lot) => lot.category === 'Properties').length,
    surplus: lots.filter((lot) => lot.category.includes('General Items')).length,
    rent: lots.filter((lot) => lot.category === 'Spaces For Rent').length,
  }), [lots]);
  const homeCategories = useMemo<HomeCategory[]>(() => {
    if (v1Home?.categories.length) return v1Home.categories.filter((category) => category.active).map((category) => ({ category, source: categories.find((item) => item.title === category.targetCategory) ?? null })).map(({ category, source }) => ({ ...category, source }));
    return categories.map((category) => ({
      key: category.id, titleEn: category.title, titleAr: localizedCategory(category.title, 'ar'), targetCategory: category.title,
      count: category.itemCount, active: category.status === 'active', mode: category.defaultMode, imageEn: '', imageAr: '', backgroundImageEn: '', backgroundImageAr: '',
      mainTextColor: '#15171A', secondaryTextColor: '#495361', cardSize: category.styleVariant === 'feature' ? 'Medium' : 'Small', cardCategory: category.styleVariant === 'feature' ? 'WithBackGround' : 'Plain', navLink: '', source: category,
    }));
  }, [categories, v1Home]);
  const activeStory = useMemo(() => v1Home?.stories.find((group) => group.year === activeStoryYear) ?? v1Home?.stories[0] ?? null, [activeStoryYear, v1Home]);
  const heroBanner = v1Home?.banners.slice().sort((a, b) => a.order - b.order)[0] ?? null;
  const selectedPlate = plateCarLot ? plateMeta(plateCarLot, platePreview) : null;
  const selectedDetailPlate = selectedLot ? plateMeta(selectedLot, platePreview) : null;
  const selectedMake = platePreview?.makes.find((make) => make.id === plateMakeId) ?? platePreview?.makes[0] ?? null;
  const selectedModel = selectedMake?.models.find((model) => model.id === plateModelId) ?? selectedMake?.models[0] ?? null;
  const selectedPlateImage = selectedPlate && selectedModel ? plateWorkerUrl(selectedModel.imageTemplate,selectedPlate) : '';
  useEffect(() => { if (selectedPlateImage) setPlateLoading(true); }, [selectedPlateImage]);
  const sellCategories = language === 'ar' ? ['المركبات والآليات', 'ساعات ومجوهرات', 'العقارات', 'أرقام لوحات'] : ['Vehicles & Machinery', 'Watches and Jewellery', 'Properties', 'License Plates'];
  const storyItems = language === 'ar' ? [
    ['2026', 'مزاد خيري لمؤسسة طيران الإمارات يجمع 8.8 ملايين درهم'], ['2025', 'الإمارات ترسّخ ريادتها الإنسانية عبر أنبل رقم'], ['2024', 'جهود الإمارات للمزادات في دعم الطرق خلال أمطار الإمارات'],
  ] : [
    ['2026', 'Emirates Airline Foundation charity auction raises AED 8.8 million'], ['2025', 'The UAE reinforces its humanitarian leadership through Noble Number'], ['2024', 'Emirates Auction rain rescue fleet supports UAE roads'],
  ];
  const achievements = v1Home?.achievements.length ? v1Home.achievements : [
    { title: rtl ? 'أغلى لوحة مركبة في العالم' : 'The most expensive car license plate', price: 'AED 55 million', date: '', imageUrl: imageLots[0]?.imageUrl ?? '' },
    { title: rtl ? 'أغلى عقار في مزاد إلكتروني' : 'The most expensive property sold online', price: 'AED 700.2 million', date: '', imageUrl: imageLots[4]?.imageUrl ?? '' },
    { title: rtl ? 'أغلى مركبة في مزاد إلكتروني' : 'A landmark vehicle auction', price: 'AED 74.1 million', date: '', imageUrl: imageLots[8]?.imageUrl ?? '' },
  ];
  const statistics = v1Home?.statistics.length ? v1Home.statistics : [
    { value: '11M+', key: 'activeUsers' as const }, { value: '5+', key: 'years' as const }, { value: '157+', key: 'auctions' as const },
    { value: '53+', key: 'employees' as const }, { value: '8', key: 'branches' as const },
  ];
  const storyGroups = v1Home?.stories.length ? v1Home.stories : [{ year: '2026', items: storyItems.map(([year, title], index) => ({ title, subtitle: year, imageUrl: imageLots[10 + index]?.imageUrl ?? imageLots[index]?.imageUrl ?? '' })) }];
  const selectedStory = activeStory ?? storyGroups[0] ?? null;
  const newsEntries = v1Home?.news.length ? v1Home.news : news[language].map(([title, published], index) => ({ id: String(index), title, titleAr: title, description: '', date: published, imageUrl: imageLots[16 + index]?.imageUrl ?? imageLots[index]?.imageUrl ?? '', sourceTitle: 'Emirates Auction Media Center' }));
  const galleryEntries = v1Home?.gallery.length ? v1Home.gallery : [0, 1, 2].map((index) => ({ id: String(index), title: index === 0 ? (rtl ? 'مزاد أنبل رقم الخيري' : 'Most Noble Number charity auction') : index === 1 ? (rtl ? 'وقف المليار وجبة' : 'One Billion Meals Endowment Auction') : (rtl ? 'ذكريات الإمارات للمزادات' : 'Emirates Auction memories'), subtitle: '', imageUrl: imageLots[20 + index]?.imageUrl ?? imageLots[index]?.imageUrl ?? '', mediaType: 1 }));
  const faqEntries = !rtl && v1Home?.faqs.length ? v1Home.faqs : faqs[language].map(([question, answer], index) => ({ id: String(index), question, answer }));
  const outstanding = account?.invoices.find((invoice) => invoice.status === 'outstanding') ?? null;
  const marketTitle = selectedCategory === 'All' ? t.featured : selectedCategory === 'Plate Numbers' ? (rtl ? 'الأرقام المميزة' : 'Prestigious Numbers') : selectedCategory === 'Surplus' ? (rtl ? 'الفائض والمقتنيات' : 'Surplus') : selectedCategory === 'Ending Today' ? t.endingToday : localizedCategory(selectedCategory,language);

  function selectMarketCategory(category: string) {
    if (selectedLot) { window.history.pushState({},'',rtl?'/ar':'/'); setSelectedLot(null); }
    setSelectedCategory(category); setVisible(24); setSearch(''); setTimeout(() => document.querySelector('#lots')?.scrollIntoView({ behavior: 'smooth' }),0);
  }
  function openLot(lot: Lot) { setSelectedLot(lot); setGalleryIndex(0); setError(''); window.history.pushState({ lotId: lot.id },'',`/lots/${lot.id}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function closeLot() { setSelectedLot(null); setGalleryImages([]); setError(''); window.history.pushState({},'',rtl?'/ar':'/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }

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
    event.preventDefault(); if (!selectedLot) return; if (!user) { startIdentityCheck(); return; }
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
  function openPlatePreview(lot: Lot) {
    const firstMake = platePreview?.makes[0];
    setPlateCarLot(lot); setPlateMakeId(firstMake?.id ?? 0); setPlateModelId(firstMake?.models[0]?.id ?? ''); setPlateLoading(true);
  }
  async function downloadPlatePreviewImage() {
    if (!selectedPlate || !selectedModel) return;
    setPlateDownloading(true); setError('');
    try {
      const response = await fetch(plateWorkerUrl(selectedModel.imageTemplate,selectedPlate,1600,900));
      if (!response.ok) throw new Error('Preview download is unavailable.');
      const bitmap = await createImageBitmap(await response.blob()), canvas = document.createElement('canvas');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext('2d'); if (!context) throw new Error('Preview download is unavailable.');
      context.drawImage(bitmap,0,0); bitmap.close();
      const coverWidth = Math.round(canvas.width * .44), coverHeight = Math.round(canvas.height * .18), coverX = Math.round((canvas.width - coverWidth) / 2), coverY = canvas.height - coverHeight;
      context.fillStyle = '#f7f7f7'; context.fillRect(coverX,coverY,coverWidth,coverHeight); context.fillStyle = '#c91b3b'; context.fillRect(coverX,coverY,coverWidth,Math.max(4,Math.round(canvas.height*.008)));
      context.fillStyle = '#1a1a1a'; context.textAlign = 'center'; context.font = `700 ${Math.max(18,Math.round(canvas.width*.026))}px Arial`; context.fillText('EMIRATES AUCTION',canvas.width/2,coverY+coverHeight*.52);
      context.fillStyle = '#777'; context.font = `500 ${Math.max(12,Math.round(canvas.width*.014))}px Arial`; context.fillText(`${selectedPlate.code} · ${selectedPlate.number}`,canvas.width/2,coverY+coverHeight*.76);
      const blob = await new Promise<Blob | null>((resolve)=>canvas.toBlob(resolve,'image/png',.95)); if (!blob) throw new Error('Preview download is unavailable.');
      const url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href=url; anchor.download=`plate-${selectedPlate.number}-${selectedPlate.code}.png`; anchor.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Preview download is unavailable.'); } finally { setPlateDownloading(false); }
  }

  return <div id="top" className="ea-shell" dir={rtl ? 'rtl' : 'ltr'}>
    <header className="ea-header">
      <div className="ea-header-inner">
        <a href={rtl?'/ar':'/'} className="ea-brand" aria-label={t.emiratesAuction} onClick={(event)=>{event.preventDefault();closeLot();}}><img src="/emirates-auction-logo.svg" alt={t.emiratesAuction}/></a>
        <div className="ea-header-actions">
          <button className="ea-icon-button" onClick={() => setSearchOpen((value) => !value)} aria-label={t.search}><Icon name="search" size={25}/></button>
          <button className="ea-icon-button" onClick={() => selectMarketCategory('All')} aria-label={t.featured}><Icon name="wallet" size={24}/></button>
          <button className="ea-icon-button" onClick={() => selectMarketCategory('All')} aria-label={t.liveMarketplace}><Icon name="gavel" size={24}/></button>
          <button className="ea-icon-button" onClick={openAccount} aria-label={user ? t.profile : t.signIn}><Icon name="account" size={24}/>{user && <span className="ea-user-dot"/>}</button>
          <button className="ea-icon-button ea-menu-button" onClick={() => setMenuOpen(true)} aria-label={t.auctionCategories}><Icon name="menu" size={25}/><span/></button>
        </div>
      </div>
      <nav className="ea-header-category-bar" aria-label={rtl ? 'فئات المزاد الرئيسية' : 'Main auction categories'}>
        <button onClick={() => selectMarketCategory('Vehicles & Machinery')}>{rtl?'المركبات والآليات':'Motors'} <b>({headerCounts.motors})</b></button>
        <button onClick={() => selectMarketCategory('Plate Numbers')}>{rtl?'الأرقام المميزة':'Prestigious Numbers'} <b>({headerCounts.plates})</b></button>
        <button onClick={() => selectMarketCategory('Properties')}>{rtl?'العقارات':'Properties'} <b>({headerCounts.properties})</b></button>
        <button onClick={() => selectMarketCategory('Surplus')}>{rtl?'الفائض':'Surplus'} <b>({headerCounts.surplus})</b></button>
        <button onClick={() => selectMarketCategory('Spaces For Rent')}>{rtl?'للإيجار':'For Rent'} <b>({headerCounts.rent})</b></button>
        <button className="ending" onClick={() => selectMarketCategory('Ending Today')}><i/>{t.endingToday} <b>({v1Home?.endingToday.count ?? endingCount})</b></button>
      </nav>
      {searchOpen && <div className="ea-header-search"><label><Icon name="search"/><input id="market-search" autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.searchPlaceholder}/><button onClick={() => setSearchOpen(false)} aria-label={rtl?'إغلاق':'Close'}><Icon name="close"/></button></label></div>}
    </header>

    {menuOpen && <div className="ea-drawer-layer" onMouseDown={(event) => event.currentTarget === event.target && setMenuOpen(false)}><aside className="ea-drawer" aria-label={t.auctionCategories}>
      <div className="ea-drawer-head"><img src="/emirates-auction-logo.svg" alt={t.emiratesAuction}/><button onClick={() => setMenuOpen(false)} aria-label={rtl?'إغلاق':'Close'}><Icon name="close"/></button></div>
      <div className="ea-drawer-content"><section><h2>{t.auctionCategories}</h2>{homeCategories.map((category) => <button key={category.key} onClick={() => { setSelectedCategory(category.targetCategory); setMenuOpen(false); document.querySelector('#lots')?.scrollIntoView({behavior:'smooth'}); }}><span><Icon name={categoryIcon(category.targetCategory)} size={19}/>{rtl ? category.titleAr : category.titleEn}</span><b>{category.count || ''}</b></button>)}</section>
      <section><h2>{t.emiratesAuction}</h2>{[[t.about,'#about'],[t.calendar,'#story'],[t.sell,'#sell'],[t.help,'#faq'],[t.findUs,'#contact'],[t.contact,'#contact']].map(([label,href]) => <a key={label} href={href} onClick={() => setMenuOpen(false)}><span>{label}</span><Icon name="arrow" size={18}/></a>)}</section>
      <section className="ea-language"><h2>{t.language}</h2><a href={rtl ? '/' : '/ar'}>{rtl ? 'English' : 'العربية'} <Icon name="arrow" size={18}/></a></section></div>
    </aside></div>}

    {!selectedLot && <main>
      <h1 className="sr-only">{t.homeTitle}</h1>
      <section className="ea-auction-home" id="categories"><div className="ea-home-wrap">
        <div className="ea-auction-stage">
        {heroBanner && <ResponsiveHeroBanner banner={heroBanner}/>}
        <div className="ea-auction-catalog"><a className="ea-ending-card" href="#lots" onClick={() => setSelectedCategory('Ending Today')}><div><strong>{t.endingToday}</strong><span>{t.endingDescription}</span></div><div className="ea-ending-meta"><b><Icon name="grid" size={17}/>{v1Home?.endingToday.count ?? (endingCount || lots.filter((lot) => lot.status === 'open').length)}</b><b><Icon name="clock" size={18}/>{t.endingNow}</b></div></a>
        {loading ? <div className="ea-mosaic skeleton-grid">{Array.from({length:18},(_,index)=><i key={index}/>)}</div> : <div className="ea-mosaic">{homeCategories.map((category) => {
          const sample = lots.find((lot) => lot.category === category.targetCategory && lot.imageUrl);
          const featured = category.cardSize.toLowerCase() === 'medium', withBackground = category.cardCategory.toLowerCase().includes('background');
          const tileImage = (rtl ? category.imageAr : category.imageEn).trim() || sample?.imageUrl || '';
          const backgroundImage = (rtl ? category.backgroundImageAr : category.backgroundImageEn).trim() || tileImage;
          const mode = category.mode === 'direct' ? t.directSale : category.mode === 'request' ? t.request : category.mode === 'notify' ? t.notify : t.onlineBidding;
          const action = category.mode === 'direct' ? t.buyNow : category.mode === 'request' ? (category.titleEn.toLowerCase().includes('package') ? t.requestPackage : t.requestPlate) : category.mode === 'notify' ? t.notify : t.onlineBidding;
          const title = rtl ? category.titleAr : category.titleEn;
          return <button key={category.key} className={`ea-category-tile ${featured ? 'ea-category-featured' : ''} ${withBackground ? 'ea-category-background' : ''}`} style={withBackground && backgroundImage ? {backgroundImage:`linear-gradient(180deg,rgba(9,10,11,.04),rgba(9,10,11,.68)),url(${backgroundImage})`} : undefined} onClick={() => { setSelectedCategory(category.targetCategory); setVisible(24); document.querySelector('#lots')?.scrollIntoView({behavior:'smooth'}); }}>
            {!!category.count && <span className="ea-count-badge">{category.count}</span>}
            {!withBackground && <span className="ea-category-art">{tileImage ? <img src={tileImage} alt={title} loading="lazy"/> : <Icon name={categoryIcon(category.targetCategory)} size={52}/>}</span>}
            <span className="ea-category-copy" style={withBackground ? {color:'#fff'} : {color:category.mainTextColor}}><strong>{title}</strong><small style={withBackground ? {color:'#eee'} : {color:category.secondaryTextColor}}>{mode}</small></span>
            <span className="ea-category-action">{category.mode === 'direct' && <Icon name="wallet" size={15}/>} {action} <Icon name="arrow" size={15}/></span>
          </button>;
        })}</div>}
        </div></div>
      </div></section>

      <section className="ea-market" id="lots"><div className="ea-content-wrap">
        <div className="ea-section-head"><div><span>{t.liveMarketplace}</span><h2>{marketTitle}</h2><p>{filtered.length.toLocaleString(rtl?'ar-AE':'en-AE')} {t.lotsAvailable}</p></div><div className="ea-market-tools"><label><Icon name="search" size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search}/></label><select value={selectedCategory} onChange={(event) => { setSelectedCategory(event.target.value); setVisible(24); }}><option value="All">{t.allCategories}</option><option value="Plate Numbers">{rtl?'الأرقام المميزة':'Prestigious Numbers'}</option><option value="Surplus">{rtl?'الفائض':'Surplus'}</option><option value="Ending Today">{t.endingToday}</option>{categories.map((category)=><option key={category.id} value={category.title}>{localizedCategory(category.title,language)}</option>)}</select></div></div>
        {error && <div className="alert alert-error">{error}<button onClick={() => setError('')}><Icon name="close" size={17}/></button></div>}
        {!loading && !filtered.length ? <Empty text={t.noLots}/> : <div className="ea-lot-grid">{filtered.slice(0,visible).map((lot) => { const plate = plateMeta(lot, platePreview); return <article className={`ea-lot-card ${plate ? 'ea-plate-lot-card' : ''}`} key={lot.id}>
          <button className="ea-lot-image" onClick={() => openLot(lot)}>{plate ? <PlateVisual plate={plate} title={lot.title}/> : lot.imageUrl ? <img src={lot.imageUrl} alt={lot.title} loading="lazy"/> : <span><Icon name={categoryIcon(lot.category)} size={62}/></span>}{lot.mode === 'auction' && <span className="ea-lot-badge">{lot.bidCount}</span>}<Status tone={lot.mode === 'direct' ? 'gold' : 'red'}>{lot.mode === 'direct' ? t.directSale : t.onlineBidding}</Status></button>
          <div className="ea-lot-body"><span>{localizedCategory(lot.category,language)}</span><h3>{lot.title}</h3>{plate && <button className="ea-view-on-car" onClick={() => openPlatePreview(lot)}><Icon name="car" size={16}/>{rtl?'عرض اللوحة على السيارة':'View on Car'}</button>}<div className="ea-lot-meta"><small>{lot.mode === 'direct' ? t.directSale : `${lot.bidCount} ${t.bids}`}</small><small>{t.lot} {lot.id.slice(0,8).toUpperCase()}</small></div><div className="ea-lot-price"><div><small>{lot.mode === 'direct' ? t.price : t.currentBid}</small><strong>{money(lot.currentPrice)}</strong></div>{lot.mode === 'auction' && lot.endsAt > now && <div className="timer"><Icon name="clock" size={16}/><span>{remaining(lot.endsAt,now)}</span></div>}</div><button className="ea-lot-primary" onClick={() => openLot(lot)}>{lot.mode === 'direct' ? t.buyNow : t.bidNow}<Icon name="arrow" size={17}/></button></div>
        </article>; })}</div>}
        {visible < filtered.length && <div className="load-more"><button className="outline-button" onClick={() => setVisible((value) => value + 24)}>{t.loadMore}</button></div>}
      </div></section>

      <section className="ea-records" id="about"><div className="ea-content-wrap"><div className="ea-title-block"><span>{t.recordsEyebrow}</span><h2>{t.recordsTitle}</h2><p>{t.recordCaption}</p></div><div className="ea-record-track" aria-label={t.recordsTitle}>{achievements.map((achievement,index) => <article key={`${achievement.title}-${achievement.date}-${index}`}>{achievement.imageUrl && <img src={achievement.imageUrl} alt={achievement.title} loading="lazy"/>}<div><b>{String(index+1).padStart(2,'0')}</b><h3>{achievement.title}</h3><span>{achievement.date || t.auctionPrice}</span><strong>{achievement.price}</strong></div></article>)}</div><button className="ea-outline-light">{t.recordsCta}<Icon name="arrow" size={17}/></button></div></section>

      <section className="ea-numbers"><div className="ea-content-wrap"><div className="ea-title-block light"><span>{t.numbersEyebrow}</span><h2>{t.numbersTitle}</h2></div><div className="ea-number-grid">{statistics.map((item,index) => { const labels = { activeUsers:t.activeUsers, years:t.years, auctions:t.auctions, employees:t.employees, branches:t.branches }; const icons: Record<typeof item.key,IconName> = {activeUsers:'account',years:'calendar',auctions:'gavel',employees:'grid',branches:'grid'}; return <div key={item.key} className={index===4?'ea-branches':''}><Icon name={icons[item.key]} size={30}/><strong>{item.value}</strong><span>{labels[item.key]}</span></div>; })}</div></div></section>

      <section className="ea-story" id="story"><div className="ea-content-wrap"><div className="ea-title-block"><span>{t.storyEyebrow}</span><h2>{t.storyTitle}</h2></div><div className="ea-year-line">{storyGroups.map((group)=><button type="button" className={group.year===(selectedStory?.year ?? storyGroups[0]?.year)?'active':''} onClick={()=>setActiveStoryYear(group.year)} key={group.year}>{group.year}</button>)}</div><div className="ea-story-grid" key={selectedStory?.year}>{selectedStory?.items.map((item,index)=><article key={`${selectedStory.year}-${index}`}>{item.imageUrl&&<img src={item.imageUrl} alt={item.title} loading="lazy"/>}<div><span>{selectedStory.year}</span><h3>{item.title}</h3><p>{item.subtitle || (rtl?'محطة بارزة في مسيرة الإمارات للمزادات ودورها في المبادرات المجتمعية والإنسانية.':'A defining milestone in Emirates Auction’s journey and its community and humanitarian initiatives.')}</p></div></article>)}</div></div></section>

      <section className="ea-partner" style={imageLots[14]?.imageUrl?{backgroundImage:`linear-gradient(90deg,rgba(10,10,11,.9),rgba(10,10,11,.35)),url(${imageLots[14].imageUrl})`}:undefined}><div className="ea-content-wrap"><span>{t.partnerEyebrow}</span><h2>{t.partnerTitle}</h2><p>{t.partnerText}</p><a href="#contact">{t.letsTalk}<Icon name="arrow"/></a></div></section>

      <section className="ea-media"><div className="ea-content-wrap"><div className="ea-title-row"><div><span>{t.newsEyebrow}</span><h2>{t.newsTitle}</h2></div><a href="#news">{t.moreNews}<Icon name="arrow" size={17}/></a></div><div className="ea-news-grid" id="news">{newsEntries.map((item,index)=>{const published = Number.isFinite(Date.parse(item.date)) ? new Date(item.date).toLocaleDateString(rtl?'ar-AE':'en-AE',{day:'numeric',month:'long',year:'numeric'}) : item.date; const title = rtl && item.titleAr ? item.titleAr : item.title; return <article key={item.id || `${title}-${index}`} className={index===0?'featured':''}>{item.imageUrl&&<img src={item.imageUrl} alt={title} loading="lazy"/>}<div><time>{published}</time><h3>{title}</h3>{index===0&&<p>{item.sourceTitle ? `${rtl?'المصدر':'Source'}: ${item.sourceTitle}` : item.description}</p>}</div></article>;})}</div><div className="ea-title-row gallery-title"><div><span>{t.galleryEyebrow}</span><h2>{t.galleryTitle}</h2></div><a href="#gallery">{t.viewAlbums}<Icon name="arrow" size={17}/></a></div><div className="ea-gallery-grid" id="gallery">{galleryEntries.map((item)=><figure key={item.id}>{item.imageUrl&&<img src={item.imageUrl} alt={item.title} loading="lazy"/>}<figcaption>{item.title}</figcaption></figure>)}</div></div></section>

      <section className="ea-sell" id="sell"><div className="ea-content-wrap"><div className="ea-title-block light"><span>{t.sellEyebrow}</span><h2>{t.sellTitle}</h2></div><div className="ea-sell-grid"><nav>{sellCategories.map((title,index)=><button className={activeSell===index?'active':''} onClick={()=>setActiveSell(index)} key={title}><span>0{index+1}</span>{title}<b>+</b></button>)}</nav><article style={imageLots[24+activeSell]?.imageUrl?{backgroundImage:`linear-gradient(90deg,rgba(6,7,8,.9),rgba(6,7,8,.25)),url(${imageLots[24+activeSell].imageUrl})`}:undefined}><span>0{activeSell+1} / 04</span><h3>{sellCategories[activeSell]}</h3><p>{rtl?'استفد من أفضل قيمة لمقتنياتك من خلال منصتنا الموثوقة، وتمتع بعملية بيع منظمة وسلسة حتى النهاية.':'Benefit from the best value for your assets through our trusted platform and enjoy an organized, seamless selling journey from start to finish.'}</p><a href="#contact">{t.sellNow}<Icon name="arrow" size={17}/></a></article></div></div></section>

      <section className="ea-faq" id="faq"><div className="ea-content-wrap"><div><h2>{t.faqTitle}<br/><strong>{t.faqSubtitle}</strong></h2><p>{t.faqIntro}</p></div><div className="ea-faq-list">{faqEntries.map((item,index)=><article className={activeFaq===index?'active':''} key={item.id || item.question}><button onClick={()=>setActiveFaq(index)} aria-expanded={activeFaq===index}>{item.question}<span>{activeFaq===index?'−':'+'}</span></button>{activeFaq===index&&<p>{item.answer}</p>}</article>)}<a href="#contact">{t.readAll}<Icon name="arrow" size={17}/></a></div></div></section>
    </main>}

    {selectedLot && <main className="ea-product-page"><div className="ea-content-wrap">
      <nav className="ea-product-breadcrumb" aria-label={rtl?'مسار الصفحة':'Breadcrumb'}><button onClick={closeLot}>{rtl?'الرئيسية':'Home'}</button><span>›</span><button onClick={()=>selectMarketCategory(selectedLot.category)}>{localizedCategory(selectedLot.category,language)}</button><span>›</span><b>{selectedLot.title}</b></nav>
      <div className="ea-product-title"><span>{t.lot} # {selectedLot.id.slice(0,8).toUpperCase()}</span><h1>{selectedLot.title}</h1></div>
      <div className="ea-product-layout"><section className="ea-product-main">
        <div className="ea-product-gallery">
          <div className="ea-product-stage">{selectedDetailPlate && galleryIndex===0 ? <PlateVisual plate={selectedDetailPlate} title={selectedLot.title} className="ea-product-plate"/> : galleryImages[galleryIndex] ? <img src={galleryImages[galleryIndex]} alt={`${selectedLot.title} — ${rtl?'صورة':'Photo'} ${galleryIndex+1}`}/> : <span className="ea-product-placeholder"><Icon name={categoryIcon(selectedLot.category)} size={96}/></span>}
            <Status tone={selectedLot.mode==='direct'?'gold':'green'}>{selectedLot.mode==='direct'?t.directSale:(rtl?'المزاد جارٍ الآن':'Now in auction')}</Status>
            {galleryImages.length>1&&<><button className="ea-gallery-arrow previous" aria-label={rtl?'الصورة السابقة':'Previous image'} onClick={()=>setGalleryIndex((galleryIndex-1+galleryImages.length)%galleryImages.length)}>‹</button><button className="ea-gallery-arrow next" aria-label={rtl?'الصورة التالية':'Next image'} onClick={()=>setGalleryIndex((galleryIndex+1)%galleryImages.length)}>›</button><span className="ea-gallery-counter"><Icon name="grid" size={14}/>{galleryIndex+1} / {galleryImages.length}</span></>}
            {galleryLoading&&<span className="ea-gallery-loading">{rtl?'جارٍ تحميل الصور…':'Loading gallery…'}</span>}
          </div>
          {galleryImages.length>1&&<div className="ea-product-thumbs">{galleryImages.map((image,index)=><button className={index===galleryIndex?'active':''} key={`${image}-${index}`} onClick={()=>setGalleryIndex(index)} aria-label={`${rtl?'صورة':'Photo'} ${index+1}`}><img src={image} alt="" loading="lazy"/></button>)}</div>}
          {selectedDetailPlate&&<button className="ea-detail-plate-preview" onClick={()=>openPlatePreview(selectedLot)}><Icon name="car" size={18}/>{rtl?'عرض اللوحة على السيارة':'View plate on car'}<Icon name="arrow" size={16}/></button>}
        </div>
        <article className="ea-product-section"><h2><Icon name="calendar" size={21}/>{rtl?'الوصف':'Description'}</h2><p>{selectedLot.description||sourceDescription|| (rtl?'يباع العنصر بحالته الراهنة، ويخضع لاعتماد الجهة المالكة. يرجى مراجعة الصور والشروط قبل تقديم العرض.':'The item is offered in its present condition and is subject to the provider’s approval. Review all images, deposit requirements and conditions before placing an offer.')}</p><ul><li>{rtl?'يخضع البيع لاعتماد الجهة المالكة.':'Conditional on provider’s approval.'}</li><li>{rtl?'يباع العنصر بحالته الراهنة.':'To be sold as is, where is.'}</li><li>{rtl?`تطبق ضريبة قيمة مضافة بنسبة ${selectedLot.vatBps/100}%.`:`${selectedLot.vatBps/100}% VAT will be applied to the final auction price.`}</li></ul></article>
        {selectedLot.category==='Vehicles & Machinery'&&vehicleSpecs.length>0&&<article className="ea-product-section"><h2><Icon name="car" size={21}/>{rtl?'نظرة عامة على المواصفات':'Specifications Overview'}</h2><p>{rtl?'التفاصيل الرئيسية المسجلة لهذه المركبة.':'Key details recorded for this vehicle.'}</p><div className="ea-vehicle-specs">{vehicleSpecs.map((item)=><div key={item.label}><span>{item.label}</span><b>{item.value}</b></div>)}</div></article>}
        {selectedLot.category==='Vehicles & Machinery'&&<article className="ea-product-section ea-documents-section"><h2><Icon name="shield" size={21}/>{rtl?'المستندات':'Documents'}</h2><p>{rtl?'راجع تقرير فحص المركبة قبل تقديم المزايدة.':'Review the vehicle inspection report before bidding.'}</p>{selectedLot.hasCarCheck?<a className="ea-car-check-download" href={`/api/v1/auction/lots/${selectedLot.id}/car-check`} download><Icon name="shield" size={19}/><span><b>{rtl?'تقرير الفحص':'Inspection Report'}</b><small>{rtl?'شهادة فحص المركبة بصيغة PDF':'Vehicle inspection certificate in PDF'}</small></span><Icon name="arrow" size={17}/></a>:<div className="ea-document-pending"><Icon name="clock" size={18}/>{rtl?'يتم تجهيز تقرير الفحص لهذا المركبة.':'The inspection report is being prepared for this vehicle.'}</div>}</article>}
        <article className="ea-product-section ea-product-terms"><h2><Icon name="shield" size={21}/>{rtl?'الشروط والأحكام':'Terms and Conditions'}</h2><div><p>{rtl?'يجب إتمام الدفع خلال 48 ساعة من اعتماد النتيجة. يطبق مبلغ التأمين المحدد لهذا العنصر وفق طريقة الاستخدام الموضحة.':'Payment must be completed within 48 hours of adjudication. The lot security deposit is applied according to the usage rule shown for this item.'}</p><p>{rtl?`قد يؤدي عدم الدفع إلى إلغاء الشراء وإعادة عرض العنصر، ومصادرة كامل التأمين، وغرامة ${selectedLot.nonPaymentPenaltyBps/100}% و${money(selectedLot.lateFeeDaily)} عن كل يوم تأخير مطبق، بالإضافة إلى الإجراءات القانونية.`:`Non-payment may cancel the purchase and relist the lot, forfeit the full security deposit, add a ${selectedLot.nonPaymentPenaltyBps/100}% penalty and ${money(selectedLot.lateFeeDaily)} per applicable late day, in addition to legal action.`}</p></div></article>
      </section><aside className="ea-product-sidebar">
        <section className="ea-bid-panel"><div className="ea-bid-head"><span>{selectedLot.mode==='direct'?(rtl?'السعر الثابت':'Fixed Price'):(rtl?'السعر الحالي':'Current Price')}</span><strong>{money(selectedLot.currentPrice)}</strong></div>{selectedLot.mode==='auction'&&<div className="ea-minimum"><span>{rtl?'الحد الأدنى للزيادة':'Min. Increment'}</span><b>{money(selectedLot.increment)}</b></div>}
          <div className="ea-bid-stats">{selectedLot.mode==='auction'&&<div><Icon name="gavel"/><span>{rtl?'عدد المزايدات':'No. of Bids'}<b>{selectedLot.bidCount}</b></span></div>}{selectedLot.mode==='auction'&&<div><Icon name="clock"/><span>{rtl?'الوقت المتبقي':'Time remaining'}<b>{remaining(selectedLot.endsAt,now)}</b></span></div>}<div><Icon name="calendar"/><span>{rtl?'ينتهي في':'Ends on'}<b>{date(selectedLot.endsAt)}</b></span></div></div>
          {selectedLot.mode==='auction'&&selectedLot.status==='open'?<form className="ea-page-bid-form" onSubmit={placeBid}><label>{rtl?'مبلغ المزايدة (درهم)':'Bid amount (AED)'}<input name="amount" inputMode="decimal" defaultValue={((selectedLot.winnerId?selectedLot.currentPrice+selectedLot.increment:selectedLot.startPrice)/100).toFixed(2)} required/></label><small>{rtl?'مبلغ التأمين المطلوب يبدأ من':'Required deposit starts at'} <b>{money(requiredDeposit(selectedLot,selectedLot.winnerId?selectedLot.currentPrice+selectedLot.increment:selectedLot.startPrice))}</b></small>{error&&<div className="alert alert-error">{error}</div>}<button className="red-button" disabled={busy}>{user?(rtl?'تأكيد المزايدة':'Place Your Bid'):(rtl?'تسجيل الدخول لبدء المزايدة':'Login to Start Bidding')}</button></form>:<button className="red-button" onClick={selectedLot.mode==='direct'?()=>setNotice(rtl?'تم إرسال طلب الشراء إلى الفريق.':'Your purchase request has been sent to the team.'):undefined} disabled={selectedLot.mode==='auction'}>{selectedLot.mode==='direct'?t.buyNow:(rtl?'هذا المزاد لا يقبل مزايدات الآن':'This auction is not accepting bids')}</button>}
        </section>
        <section className="ea-how-bid"><h2>{rtl?'كيف تقدم مزايدة؟':'How To Place A Bid?'}</h2><ol><li><b>{rtl?'سجل الدخول أو أنشئ حساباً':'Log in or Create an Account'}</b><span>{rtl?'ادخل إلى حسابك أو أكمل بياناتك خلال دقائق.':'Access your account or complete your details in minutes.'}</span></li><li><b>{rtl?'أضف مبلغ التأمين':'Add Security Deposit'}</b><span>{rtl?'موّل الرصيد المطلوب وفق قاعدة هذا العنصر.':'Fund the balance required by this lot’s rule.'}</span></li><li><b>{rtl?'قدم مزايدتك':'Place Your Bid'}</b><span>{rtl?'راجع القيمة ثم أكد المزايدة.':'Review the amount and confirm your bid.'}</span></li></ol></section>
      </aside></div>
    </div></main>}

    <footer className="ea-footer" id="contact"><div className="ea-content-wrap"><div className="ea-footer-links"><section><h3>{t.footerAbout}</h3><a href="#about">{t.about}</a><a href="#story">{t.storyTitle}</a><a href="#news">{t.newsTitle}</a><a href="#contact">{t.findUs}</a></section><section><h3>{t.footerAuctions}</h3>{categories.slice(0,7).map((category)=><a href="#categories" key={category.id}>{localizedCategory(category.title,language)}</a>)}</section><section><h3>{t.footerHelp}</h3><a href="#faq">{t.help}</a><a href="#faq">{rtl?'الأسئلة الشائعة':'FAQ'}</a><a href="#contact">{t.contact}</a></section><section><h3>{t.footerQuick}</h3><a href="#sell">{t.sell}</a><a href="#categories">{t.requestPlate}</a><a href="#categories">{t.requestPackage}</a></section><section className="ea-help-card"><h3>{t.available247}</h3><p>UAE 600 545 454</p><p>support@emiratesauction.com</p></section></div><div className="ea-footer-social"><div><h3>{t.contact}</h3><p>{rtl?'تابعنا واكتشف أكبر منصة مزادات في المنطقة.':'Follow our channels and discover the region’s trusted auction marketplace.'}</p></div><img src="/emirates-auction-logo.svg" alt={t.emiratesAuction}/></div></div><div className="ea-footer-bottom"><div className="ea-content-wrap"><span>© {new Date().getFullYear()} {t.copyright}</span><span>{rtl?'الدرهم الإماراتي · التسوية بالعملات الرقمية':'AED · Crypto settlement rails'}</span><a href={rtl?'/' : '/ar'}>{rtl?'English':'العربية'}</a></div></div></footer>

    {notice && <div className="toast"><Icon name="shield"/>{notice}</div>}

    {authMode && <Modal rtl={rtl} title={authMode === 'identify' ? (rtl?'الدخول إلى حسابك':'Access your account') : authMode === 'login' ? (rtl?'مرحباً بعودتك':'Welcome back') : (rtl?'استكمال حسابك':'Complete your account')} close={() => { setAuthMode(null); setError(''); }}><form className="stack-form" onSubmit={submitAuth}>
      {authMode === 'identify' && <><div className="migration-note"><Icon name="shield" size={24}/><div><strong>{rtl?'نعمل على تحسين نظام الحسابات':'We are improving our account system'}</strong><p>{rtl?'أدخل رقم العميل أو رقم الهاتف أو البريد الإلكتروني. إذا لم يكن حسابك متاحاً بعد، يمكنك استكمال بياناتك والمتابعة فوراً.':'Enter your Customer ID, mobile number or email. If your account is not yet available online, you can complete your details and continue immediately.'}</p></div></div><label>{rtl?'رقم العميل أو الهاتف أو البريد الإلكتروني':'Customer ID, mobile number or email'}<input name="identifier" required minLength={3} autoComplete="username" placeholder="EA-…, +971…, or name@example.com" autoFocus/></label></>}
      {authMode === 'login' && <><div className="account-found"><span>{rtl?'تم العثور على الحساب':'Account located'}</span><strong>{accountIdentifier}</strong></div><label>{rtl?'كلمة المرور':'Password'}<input name="password" type="password" required autoComplete="current-password" autoFocus/></label></>}
      {authMode === 'register' && <><div className="migration-note"><Icon name="account" size={24}/><div><strong>{rtl?'استكمال التحديث':'Complete the migration'}</strong><p>{rtl?'لم نعثر على حساب إلكتروني بهذه البيانات. أكمل الحقول التالية وسيتم إنشاء حسابك وتسجيل دخولك فوراً.':'We could not locate an online account with that information. Fill in the fields below and your account will be created and signed in immediately.'}</p></div></div><label>{rtl?'الاسم الكامل':'Full name'}<input name="name" required minLength={2} autoComplete="name" autoFocus/></label><label>{rtl?'رقم الهاتف':'Mobile number'}<input name="phone" required minLength={7} defaultValue={/^\+?[0-9 ()-]{7,24}$/.test(accountIdentifier) ? accountIdentifier : ''} placeholder="+971 50 000 0000" autoComplete="tel"/><small>{rtl?'مطلوب. أضف رمز الدولة حتى يتمكن فريقنا من التواصل معك بشأن المزايدات والعناصر الفائزة.':'Required. Include the country code so our team can contact you about bids and winning lots.'}</small></label><label>{rtl?'البريد الإلكتروني':'Email address'}<input name="email" type="email" required defaultValue={accountIdentifier.includes('@') ? accountIdentifier : ''} autoComplete="email"/></label><label>{rtl?'إنشاء كلمة مرور':'Create password'}<input name="password" type="password" required minLength={12} autoComplete="new-password"/><small>{rtl?'استخدم 12 حرفاً على الأقل.':'Use at least 12 characters.'}</small></label></>}
      {error && <div className="alert alert-error">{error}</div>}<button className="black-button" disabled={busy}>{busy ? (rtl?'يرجى الانتظار…':'Please wait…') : authMode === 'identify' ? (rtl?'متابعة':'Continue') : authMode === 'login' ? (rtl?'تسجيل الدخول':'Sign In') : (rtl?'إنشاء الحساب وتسجيل الدخول':'Create Account & Sign In')}</button>{authMode !== 'identify' && <p className="form-switch"><button type="button" onClick={startIdentityCheck}>{rtl?'استخدام رقم عميل أو هاتف أو بريد مختلف':'Use a different ID, mobile or email'}</button></p>}
    </form></Modal>}

    {plateCarLot && selectedPlate && selectedMake && selectedModel && <Modal rtl={rtl} title={rtl?'عرض اللوحة على السيارة':'View plate on car'} close={() => setPlateCarLot(null)} wide><div className="ea-plate-preview">
      <div className="ea-plate-selectors"><label><span>{rtl?'الشركة المصنعة':'Make'}</span><select value={selectedMake.id} onChange={(event)=>{const make=platePreview?.makes.find((item)=>item.id===Number(event.target.value));setPlateMakeId(Number(event.target.value));setPlateModelId(make?.models[0]?.id??'');}}>{platePreview?.makes.map((make)=><option key={make.id} value={make.id}>{make.title}</option>)}</select></label><label><span>{rtl?'الموديل':'Model'}</span><select value={selectedModel.id} onChange={(event)=>setPlateModelId(event.target.value)}>{selectedMake.models.map((model)=><option key={model.id} value={model.id}>{model.title}</option>)}</select></label></div>
      <div className="ea-plate-preview-stage">{plateLoading&&<div className="ea-plate-loader"><i/><span>{rtl?'جارٍ تجهيز المعاينة…':'Preparing preview…'}</span></div>}<img key={selectedPlateImage} src={selectedPlateImage} alt={`${plateCarLot.title} · ${selectedModel.title}`} onLoad={()=>setPlateLoading(false)} onError={()=>setPlateLoading(false)}/></div>
      <div className="ea-plate-preview-note"><span className="ea-mini-plate"><i>{selectedPlate.code}</i><b>{selectedPlate.number}</b></span><div><strong>{plateCarLot.title}</strong><small>{rtl?'معاينة توضيحية على السيارة المختارة':'Illustrative preview on the selected vehicle'}</small></div></div>
      {error&&<div className="alert alert-error">{error}</div>}<button className="ea-download-preview" onClick={downloadPlatePreviewImage} disabled={plateDownloading}><Icon name="arrow" size={18}/>{plateDownloading?(rtl?'جارٍ تجهيز الصورة…':'Preparing image…'):(rtl?'تنزيل الصورة':'Download Image')}</button>
    </div></Modal>}

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
