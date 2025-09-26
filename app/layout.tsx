import './globals.css'
import { MainNavigation } from '@/components/main-navigation'
import { Footer } from '@/components/footer'
import { LoadingProvider } from '@/components/loading-context'
import { PerformanceOptimizer } from '@/components/seo/performance-optimizer'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en'>
      <head>
        <title>Culture Alberta | Best Culture, Events & Food in Calgary & Edmonton</title>
        <meta name='description' content='Your guide to Alberta culture: events, restaurants, festivals & local experiences in Calgary, Edmonton & beyond.' />
        <meta name='keywords' content='Alberta culture, Calgary events, Edmonton culture, Alberta tourism, local events, cultural activities, Alberta restaurants, Alberta attractions' />
        <meta name='author' content='Culture Alberta' />
        <meta name='robots' content='index, follow' />
        <meta name='google-adsense-account' content='ca-pub-6902227267422426' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='canonical' href='https://www.culturealberta.com' />
        <link rel='icon' href='/favicon.ico' type='image/x-icon' />
        <link rel='icon' href='/favicon.svg' type='image/svg+xml' />
        <link rel='apple-touch-icon' href='/favicon.svg' />
        <meta property='og:type' content='website' />
        <meta property='og:url' content='https://www.culturealberta.com' />
        <meta property='og:title' content='Culture Alberta - Discover Alberta Best Culture, Events & Experiences' />
        <meta property='og:description' content='Discover the best of Alberta culture, events, restaurants, and experiences. Your guide to Calgary, Edmonton, and beyond.' />
        <meta property='og:image' content='https://www.culturealberta.com/images/culture-alberta-og.jpg' />
        <meta property='twitter:card' content='summary_large_image' />
        <meta property='twitter:title' content='Culture Alberta - Discover Alberta Best Culture, Events & Experiences' />
        <meta property='twitter:description' content='Discover the best of Alberta culture, events, restaurants, and experiences. Your guide to Calgary, Edmonton, and beyond.' />
        <meta property='twitter:image' content='https://www.culturealberta.com/images/culture-alberta-og.jpg' />
      </head>
      <body suppressHydrationWarning={true}>
        <LoadingProvider>
          <MainNavigation />
          <main>{children}</main>
          <Footer />
        </LoadingProvider>
        <Analytics />
        <SpeedInsights />
        <PerformanceOptimizer />
      </body>
    </html>
  )
}
