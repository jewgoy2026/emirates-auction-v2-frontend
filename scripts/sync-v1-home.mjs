import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SITE = 'https://www.emiratesauction.com';
const observedAt = new Date().toISOString();

async function fetchText(url) {
  const response = await fetch(url, { headers: { Accept: 'text/html,application/json' } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

function plainText(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function targetCategory(menu) {
  const path = String(menu.NavLink ?? '').toLowerCase();
  if (path.startsWith('/motors')) return 'Vehicles & Machinery';
  if (path.startsWith('/properties')) return 'Properties';
  if (path === '/general-items') return 'General Items';
  if (path === '/dxb-general-items') return 'General Items (Dubai Police)';
  if (path === '/abudhabi-police') return 'General Items (Abu Dhabi Police)';
  if (path === '/for-rent') return 'Spaces For Rent';
  if (path === '/jewellery-watches') return 'Jewellery & Watches';
  return String(menu.TitleEn ?? menu.AuctionTypeName ?? 'Auction');
}

function categoryMode(menu, count) {
  const path = String(menu.NavLink ?? '').toLowerCase();
  if (path.includes('/buy-now')) return 'direct';
  if (path.includes('premium-plans') || path.includes('abu-dhabi/online') || path.includes('uae-plates/online')) return 'request';
  return count > 0 ? 'auction' : 'notify';
}

const html = await fetchText(`${SITE}/`);
const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
if (!nextDataMatch) throw new Error('The V1 homepage did not expose __NEXT_DATA__.');
const nextData = JSON.parse(nextDataMatch[1]);
const buildId = String(nextData.buildId ?? '');
if (!buildId) throw new Error('The V1 build identifier is missing.');

const payload = JSON.parse(await fetchText(`${SITE}/_next/data/${buildId}/index.json`));
const page = payload?.pageProps ?? {};
const data = page.data ?? {};
const auctions = Array.isArray(data.AuctionSection) ? data.AuctionSection : [];
const menu = Array.isArray(page.webMenu) ? page.webMenu : [];

const activeAuction = (auctionTypeId) => auctions.find((item) => item.AuctionTypeId === auctionTypeId && item.IsActive)
  ?? auctions.find((item) => item.AuctionTypeId === auctionTypeId)
  ?? null;

const snapshot = {
  generatedAt: observedAt,
  source: SITE,
  buildId,
  endingToday: {
    count: Number(data.EndingTodayCount ?? 0),
    minimumEndDate: data.EndingTodayMinEndDate ?? null,
  },
  banners: (Array.isArray(data.AdsBannersSection) ? data.AdsBannersSection : []).map((item) => ({
    type: Number(item.BannerType ?? 0),
    order: Number(item.Order ?? 0),
    url: String(item.Url ?? ''),
    tabletUrl: String(item.TabletSizeUrl ?? ''),
    mobileUrl: String(item.smallSizeUrl ?? ''),
    title: plainText(item.Title),
    subtitle: plainText(item.SubTitle),
  })).filter((item) => item.url),
  categories: menu.map((item, index) => {
    const auction = activeAuction(item.AuctionTypeId);
    const count = Number(auction?.Counts ?? 0);
    return {
      key: `${item.AuctionTypeId}:${item.NavLink ?? index}`,
      auctionTypeId: Number(item.AuctionTypeId ?? 0),
      titleEn: plainText(item.TitleEn),
      titleAr: plainText(item.TitleAr),
      targetCategory: targetCategory(item),
      count,
      active: auction?.IsActive !== false,
      mode: categoryMode(item, count),
      imageEn: String(item.ImageEn ?? ''),
      imageAr: String(item.ImageAr ?? ''),
      backgroundImageEn: String(item.BackGroundImageEn ?? ''),
      backgroundImageAr: String(item.BackgroundImageAr ?? ''),
      mainTextColor: String(item.MainTextColor ?? '#15171A'),
      secondaryTextColor: String(item.SeconderyTextColor ?? '#495361'),
      cardSize: String(item.CardTypeName ?? 'Small'),
      cardCategory: String(item.CardCategoryName ?? 'Plain'),
      navLink: String(item.NavLink ?? ''),
      classificationId: item.ClassificationId ?? null,
    };
  }),
  achievements: (Array.isArray(data.AchievementsSection) ? data.AchievementsSection : []).map((item) => ({
    title: plainText(item.CardTitle),
    price: plainText(item.AuctionPrice),
    date: plainText(item.Date),
    imageUrl: String(item.ImageUrl ?? ''),
  })),
  statistics: [
    { value: '11M+', key: 'activeUsers' },
    { value: '5+', key: 'years' },
    { value: '157+', key: 'auctions' },
    { value: '53+', key: 'employees' },
    { value: '8', key: 'branches' },
  ],
  stories: (Array.isArray(data.SuccessStorySection) ? data.SuccessStorySection : []).map((group) => ({
    year: String(group.Year ?? ''),
    items: (Array.isArray(group.SuccessStoryMedia) ? group.SuccessStoryMedia : []).map((item) => ({
      title: plainText(item.Title),
      subtitle: plainText(item.SubTitle),
      imageUrl: String(item.ImageUrl ?? ''),
    })),
  })).filter((group) => group.year),
  news: (Array.isArray(data.NewsSection?.News) ? data.NewsSection.News : []).map((item) => ({
    id: String(item.Id ?? ''),
    title: plainText(item.Title),
    titleAr: plainText(item.AltTitle),
    description: plainText(item.Description),
    date: String(item.Date ?? ''),
    imageUrl: String(item.ImageUrl ?? ''),
    sourceTitle: plainText(item.SourceTitle),
  })),
  gallery: (Array.isArray(data.GallerySection) ? data.GallerySection : []).map((item, index) => ({
    id: String(item.AlbumId ?? index),
    title: plainText(item.Title),
    subtitle: plainText(item.SubTitle),
    imageUrl: String(item.MainImage ?? ''),
    mediaType: Number(item.MediaType ?? 1),
  })).filter((item) => item.imageUrl),
  faqs: (Array.isArray(data.FaqsSection) ? data.FaqsSection : []).map((item) => ({
    id: String(item.FaqId ?? ''),
    question: plainText(item.Question),
    answer: plainText(item.Answer),
  })).filter((item) => item.question && item.answer),
};

await mkdir(resolve('public/snapshot'), { recursive: true });
await writeFile(resolve('public/snapshot/v1-home.json'), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(JSON.stringify({
  generatedAt: snapshot.generatedAt,
  buildId: snapshot.buildId,
  endingToday: snapshot.endingToday.count,
  categories: snapshot.categories.length,
  achievements: snapshot.achievements.length,
  stories: snapshot.stories.length,
  news: snapshot.news.length,
  gallery: snapshot.gallery.length,
  faqs: snapshot.faqs.length,
}, null, 2));
