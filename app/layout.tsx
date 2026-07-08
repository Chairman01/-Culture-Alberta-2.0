import './globals.css'
import { ConditionalSiteLayout } from '@/components/conditional-site-layout'
import { LoadingProvider } from '@/components/loading-context'
import { AuthProvider } from '@/components/auth-provider'
import { PerformanceOptimizer } from '@/components/seo/performance-optimizer'
import { CookieConsent } from '@/components/cookie-consent'
import { CityPrompt } from '@/components/city-prompt'
import { WelcomeMailer } from '@/components/welcome-mailer'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import { Metadata } from 'next'
import { WebsiteStructuredData, OrganizationStructuredData, LocalBusinessStructuredData } from '@/components/seo/structured-data'
import { SitelinksData, DEFAULT_NAVIGATION_LINKS } from '@/components/seo/sitelinks-data'
import { PageTracker } from '@/components/analytics/page-tracker'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://www.culturealberta.com'),
  title: 'Culture Alberta | Alberta Events, Food & Local News',
  description: 'Your guide to Alberta\'s culture: events, restaurants, festivals & local experiences in Calgary, Edmonton & beyond.',
  keywords: 'Alberta culture, Calgary events, Edmonton culture, Alberta tourism, local events, cultural activities, Alberta restaurants, Alberta attractions',
  authors: [{ name: 'Culture Alberta' }],
  applicationName: 'Culture Alberta',
  referrer: 'origin-when-cross-origin',
  category: 'Arts & Culture',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    url: 'https://www.culturealberta.com',
    siteName: 'Culture Alberta',
    locale: 'en_CA',
    title: 'Culture Alberta | Alberta Events, Food & Local News',
    description: 'Your guide to Alberta\'s culture: events, restaurants, festivals & local experiences in Calgary, Edmonton & beyond.',
    images: [
      {
        url: 'https://www.culturealberta.com/images/culture-alberta-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Culture Alberta - Your Guide to Alberta\'s Culture',
      },
      {
        url: 'https://www.culturealberta.com/images/ca-logo.png',
        width: 192,
        height: 192,
        alt: 'Culture Alberta Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Culture Alberta | Alberta Events, Food & Local News',
    description: 'Your guide to Alberta\'s culture: events, restaurants, festivals & local experiences in Calgary, Edmonton & beyond.',
    images: [
      {
        url: 'https://www.culturealberta.com/images/culture-alberta-og.jpg',
        alt: 'Culture Alberta - Your Guide to Alberta\'s Culture',
      },
    ],
  },
  alternates: {
    canonical: 'https://www.culturealberta.com',
    types: {
      'application/rss+xml': 'https://www.culturealberta.com/feed.xml',
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
  other: {
    'google-adsense-account': 'ca-pub-6902227267422426',
    // Geographic meta tags — tell search engines and AI this site is about Alberta, Canada
    'geo.region': 'CA-AB',
    'geo.placename': 'Alberta, Canada',
    'geo.position': '53.9333;-116.5765',
    'ICBM': '53.9333, -116.5765',
    // Content language declaration
    'content-language': 'en-CA',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://scripts.mediavine.com" />
        <link rel="preconnect" href="https://www.clarity.ms" />
        {/* Mediavine Ads */}
        <script
          type="text/javascript"
          async
          data-noptimize="1"
          data-cfasync="false"
          src="//scripts.mediavine.com/tags/culturealberta.js"
        />
      </head>
      <body suppressHydrationWarning={true}>
        {/* Structured Data for Rich Snippets - Required for Google sitelinks like blogTO */}
        {/* WebsiteStructuredData covers WebSite schema — SitelinksData removed (was duplicate WebSite schema) */}
        <WebsiteStructuredData />
        <OrganizationStructuredData />
        <LocalBusinessStructuredData />
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
        {/* Microsoft Clarity */}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","vwuiasrfc7");`}
        </Script>
        <AuthProvider>
          <PageTracker />
          <LoadingProvider>
            <ConditionalSiteLayout>
              {children}
            </ConditionalSiteLayout>
          </LoadingProvider>
          <PerformanceOptimizer />
          <CookieConsent />
          <CityPrompt />
          <WelcomeMailer />
        </AuthProvider>
        {/* Vercel Web Analytics only — Speed Insights intentionally left off to control cost */}
        <Analytics />
      </body>
    </html>
  )
}
