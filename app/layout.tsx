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
        <title>Culture Alberta - Discover Alberta's Best Culture, Events & Experiences</title>
        <meta name="description" content="Discover the best of Alberta's culture, events, restaurants, and experiences. Your guide to Calgary, Edmonton, and beyond. Find local events, cultural activities, and hidden gems across Alberta." />
        <meta name="keywords" content="Alberta culture, Calgary events, Edmonton culture, Alberta tourism, local events, cultural activities, Alberta restaurants, Alberta attractions" />
        <meta name="author" content="Culture Alberta" />
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://www.culturealberta.com" />
        
        {/* Favicon and Icons */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.culturealberta.com" />
        <meta property="og:title" content="Culture Alberta - Discover Alberta's Best Culture, Events & Experiences" />
        <meta property="og:description" content="Discover the best of Alberta's culture, events, restaurants, and experiences. Your guide to Calgary, Edmonton, and beyond." />
        <meta property="og:image" content="https://www.culturealberta.com/images/culture-alberta-og.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Culture Alberta - Discover Alberta's Best Culture, Events & Experiences" />
        <meta property="og:site_name" content="Culture Alberta" />
        <meta property="og:locale" content="en_CA" />
        <meta property="og:locale:alternate" content="en_US" />
        <meta property="og:locale:alternate" content="fr_CA" />
        <meta property="article:author" content="Culture Alberta" />
        <meta property="article:publisher" content="https://www.facebook.com/culturealberta" />
        <meta property="article:section" content="Culture" />
        <meta property="article:tag" content="Alberta, Culture, Events, Tourism" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://www.culturealberta.com" />
        <meta property="twitter:title" content="Culture Alberta - Discover Alberta's Best Culture, Events & Experiences" />
        <meta property="twitter:description" content="Discover the best of Alberta's culture, events, restaurants, and experiences. Your guide to Calgary, Edmonton, and beyond." />
        <meta property="twitter:image" content="https://www.culturealberta.com/images/culture-alberta-og.jpg" />
        <meta property="twitter:site" content="@culturealberta" />
        <meta property="twitter:creator" content="@culturealberta" />
        <meta property="twitter:app:country" content="CA" />
        <meta property="twitter:app:name:iphone" content="Culture Alberta" />
        <meta property="twitter:app:name:ipad" content="Culture Alberta" />
        <meta property="twitter:app:name:googleplay" content="Culture Alberta" />
        
        {/* Additional SEO Meta Tags */}
        <meta name="theme-color" content="#ffffff" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="geo.region" content="CA-AB" />
        <meta name="geo.placename" content="Alberta" />
        <meta name="geo.position" content="55.0000;-115.0000" />
        <meta name="ICBM" content="55.0000, -115.0000" />
        <meta name="DC.title" content="Culture Alberta" />
        <meta name="DC.creator" content="Culture Alberta" />
        <meta name="DC.subject" content="Alberta culture, events, tourism" />
        <meta name="DC.description" content="Discover the best of Alberta's culture, events, restaurants, and experiences" />
        <meta name="DC.publisher" content="Culture Alberta" />
        <meta name="DC.contributor" content="Culture Alberta" />
        <meta name="DC.date" content="2024" />
        <meta name="DC.type" content="Text" />
        <meta name="DC.format" content="text/html" />
        <meta name="DC.identifier" content="https://www.culturealberta.com" />
        <meta name="DC.language" content="en-CA" />
        <meta name="DC.coverage" content="Alberta, Canada" />
        <meta name="DC.rights" content="Copyright 2024 Culture Alberta" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Culture Alberta",
              "url": "https://www.culturealberta.com",
              "description": "Discover the best of Alberta's culture, events, restaurants, and experiences",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://www.culturealberta.com/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              },
              "publisher": {
                "@type": "Organization",
                "name": "Culture Alberta",
                "url": "https://www.culturealberta.com",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://www.culturealberta.com/favicon.svg"
                },
                "sameAs": [
                  "https://www.facebook.com/culturealberta",
                  "https://www.instagram.com/culturealberta",
                  "https://twitter.com/culturealberta"
                ]
              }
            })
          }}
        />
        
        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Culture Alberta",
              "url": "https://www.culturealberta.com",
              "logo": "https://www.culturealberta.com/favicon.svg",
              "description": "Your guide to Alberta's best culture, events, and experiences",
              "address": {
                "@type": "PostalAddress",
                "addressRegion": "Alberta",
                "addressCountry": "CA"
              },
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "areaServed": "CA-AB"
              },
              "areaServed": {
                "@type": "Place",
                "name": "Alberta",
                "address": {
                  "@type": "PostalAddress",
                  "addressRegion": "Alberta",
                  "addressCountry": "CA"
                }
              }
            })
          }}
        />
        
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
