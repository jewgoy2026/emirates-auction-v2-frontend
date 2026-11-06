import type { Metadata } from 'next';
import PublicSite from '../ui/public-site';

export const metadata: Metadata = {
  title: 'مزادات السيارات واللوحات والعقارات في الإمارات',
  description: 'شارك في مزادات المركبات واللوحات المميزة والعقارات والمجوهرات والبضائع المتنوعة في دولة الإمارات.',
  alternates: { canonical: '/ar', languages: { 'en-AE': '/', 'ar-AE': '/ar' } },
  openGraph: { locale: 'ar_AE', title: 'الإمارات للمزادات', description: 'اكتشف، زايد واربح عبر منصة مزادات موثوقة.' },
};

export default function ArabicHome() {
  return <PublicSite initialLanguage="ar"/>;
}
