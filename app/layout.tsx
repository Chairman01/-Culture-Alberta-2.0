import './globals.css'
import { MainNavigation } from '@/components/main-navigation'
import { Footer } from '@/components/footer'
import { LoadingProvider } from '@/components/loading-context'
import { PerformanceOptimizer } from '@/components/seo/performance-optimizer'
import { CookieConsent } from '@/components/cookie-consent'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { optimizeSpeedInsights } from '@/lib/vercel-optimizations'
import { Metadata } from 'next'
import { WebsiteStructuredData, OrganizationStructuredData, LocalBusinessStructuredData } from '@/components/seo/structured-data'

export const metadata: Metadata = {
  title: 'Culture Alberta | Best Culture, Events & Food in Calgary & Edmonton',
  description: 'Your guide to Alberta\'s culture: events, restaurants, festivals & local experiences in Calgary, Edmonton & beyond.',
  keywords: 'Alberta culture, Calgary events, Edmonton culture, Alberta tourism, local events, cultural activities, Alberta restaurants, Alberta attractions',
  authors: [{ name: 'Culture Alberta' }],
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    url: 'https://www.culturealberta.com',
    siteName: 'Culture Alberta',
    locale: 'en_CA',
    title: 'Culture Alberta - Discover Alberta\'s Best Culture, Events & Experiences',
    description: 'Discover the best of Alberta\'s culture, events, restaurants, and experiences. Your guide to Calgary, Edmonton, and beyond.',
    images: [
      {
        url: 'https://www.culturealberta.com/images/culture-alberta-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Culture Alberta - Your Guide to Alberta\'s Culture',
      },
      {
        url: 'https://www.culturealberta.com/images/culture-alberta-logo.svg',
        width: 1200,
        height: 1200,
        alt: 'Culture Alberta Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Culture Alberta - Discover Alberta\'s Best Culture, Events & Experiences',
    description: 'Discover the best of Alberta\'s culture, events, restaurants, and experiences. Your guide to Calgary, Edmonton, and beyond.',
    images: [
      {
        url: 'https://www.culturealberta.com/images/culture-alberta-og.jpg',
        alt: 'Culture Alberta - Your Guide to Alberta\'s Culture',
      },
    ],
  },
  alternates: {
    canonical: 'https://www.culturealberta.com',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/images/culture-alberta-logo.svg', sizes: '1200x1200', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
  },
  other: {
    'google-adsense-account': 'ca-pub-6902227267422426',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        {/* Structured Data for Rich Snippets - Required for Google sitelinks like blogTO */}
        <WebsiteStructuredData />
        <OrganizationStructuredData />
        <LocalBusinessStructuredData />
        {/* Google AdSense - Must be in head for verification, using beforeInteractive strategy */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6902227267422426"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-48EV1DX840"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-48EV1DX840');
          `}
        </Script>
        <LoadingProvider>
          <MainNavigation />
          <main>{children}</main>
          <Footer />
        </LoadingProvider>
        <Analytics />
        <SpeedInsights {...optimizeSpeedInsights()} />
        <PerformanceOptimizer />
        <CookieConsent />
      </body>
    </html>
  )
}
