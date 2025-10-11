import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });
const siteName = 'WatchLock';
const siteDescription =
  'Spoiler-safe messaging for every watch party. Share reactions that unlock only when your crew catches up.';

export const metadata: Metadata = {
  metadataBase: new URL('https://watchlock.app'),
  title: {
    default: `${siteName} – Share the highs without the spoilers`,
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  keywords: [
    'watch parties',
    'sports messaging',
    'spoiler free chat',
    'family watch party',
    'fan engagement'
  ],
  authors: [{ name: 'WatchLock Team' }],
  creator: siteName,
  publisher: siteName,
  applicationName: siteName,
  category: 'Sports',
  openGraph: {
    title: `${siteName} – Share the highs without the spoilers`,
    description: siteDescription,
    url: '/',
    siteName,
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'WatchLock hero preview'
      }
    ],
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} – Share the highs without the spoilers`,
    description: siteDescription,
    creator: '@watchlock',
    images: ['/twitter-image.png']
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: ['/favicon.svg'],
    apple: [{ url: '/favicon.svg', type: 'image/svg+xml' }]
  },
  manifest: '/manifest.webmanifest'
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eff6ff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ]
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
