import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import { ThemeProvider } from '@/components/ThemeProvider';

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 min-h-screen`}>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme');
                  const theme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add(theme);
                } catch (e) {}
              })();
            `,
          }}
        />
        <ThemeProvider>
          <div className="flex flex-col min-h-screen">
            <AppHeader />
            <main className="flex-1">
              {children}
            </main>
            <AppFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
