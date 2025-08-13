import './globals.css'
import { MainNavigation } from '@/components/main-navigation'
import Script from 'next/script'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>Culture Alberta - Discover Alberta's Culture, Events & Experiences</title>
        <meta name="description" content="Discover the best of Alberta's culture, events, food, and experiences. Your guide to Edmonton, Calgary, and beyond." />
        <meta name="keywords" content="Alberta, culture, events, Edmonton, Calgary, food, arts, festivals, tourism" />
        <meta name="author" content="Culture Alberta" />
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.culturealberta.com/" />
        <meta property="og:title" content="Culture Alberta - Discover Alberta's Culture, Events & Experiences" />
        <meta property="og:description" content="Discover the best of Alberta's culture, events, food, and experiences. Your guide to Edmonton, Calgary, and beyond." />
        <meta property="og:image" content="https://www.culturealberta.com/og-image.jpg" />
        <meta property="og:site_name" content="Culture Alberta" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://www.culturealberta.com/" />
        <meta property="twitter:title" content="Culture Alberta - Discover Alberta's Culture, Events & Experiences" />
        <meta property="twitter:description" content="Discover the best of Alberta's culture, events, food, and experiences. Your guide to Edmonton, Calgary, and beyond." />
        <meta property="twitter:image" content="https://www.culturealberta.com/og-image.jpg" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://www.culturealberta.com/" />
        
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-V7DK0G3JFV"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-V7DK0G3JFV');
          `}
        </Script>
      </head>
      <body suppressHydrationWarning={true}>
        <MainNavigation />
        <main>{children}</main>
      </body>
    </html>
  )
}
