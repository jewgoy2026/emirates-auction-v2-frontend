import type { Metadata, Viewport } from 'next';
import './globals.css';
import './policy.css';
import './mobile-inputs.css';
import './payment-selection.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.emiratesauction.com'),
  title: { default: 'Emirates Auction | Online Auctions in the UAE', template: '%s | Emirates Auction' },
  description: 'Bid online on vehicles, distinguished plate numbers, property, jewellery and general items across the UAE.',
  applicationName: 'Emirates Auction',
  alternates: { canonical: '/', languages: { 'en-AE': '/', 'ar-AE': '/ar' } },
  openGraph: { type: 'website', locale: 'en_AE', siteName: 'Emirates Auction', title: 'Emirates Auction | Online Auctions in the UAE', description: 'Discover, bid and win across the UAE.', url: '/' },
  twitter: { card: 'summary_large_image', title: 'Emirates Auction', description: 'Discover, bid and win across the UAE.' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#17181a', colorScheme: 'light' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-AE"><body>{children}</body></html>;
}
