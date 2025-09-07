import './globals.css'
import { MainNavigation } from '@/components/main-navigation'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>Culture Alberta | Best Culture, Events & Food in Calgary & Edmonton</title>
        <meta name="description" content="Your guide to Alberta's culture: events, restaurants, festivals & local experiences in Calgary, Edmonton & beyond." />
        <meta name="keywords" content="Alberta culture, Calgary events, Edmonton culture, Alberta tourism, local events, cultural activities, Alberta restaurants, Alberta attractions" />
        <meta name="author" content="Culture Alberta" />
        <meta name="robots" content="index, follow" />
        <meta name="google-adsense-account" content="ca-pub-6902227267422426" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://www.culturealberta.com" />
        
        {/* Favicon and Icons - Fixed for better Google visibility */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon-32x32.svg" sizes="32x32" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Additional favicon formats for better compatibility */}
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        
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
                  "https://www.youtube.com/@CultureAlberta_",
                  "https://www.facebook.com/profile.php?id=100064044099295",
                  "https://www.facebook.com/profile.php?id=100072301249690",
                  "https://www.instagram.com/culturealberta._/",
                  "https://www.instagram.com/cultureyyc._/"
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
        
        {/* Breadcrumb Schema for better navigation in search results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": "https://www.culturealberta.com"
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Culture",
                  "item": "https://www.culturealberta.com/culture"
                },
                {
                  "@type": "ListItem",
                  "position": 3,
                  "name": "Events",
                  "item": "https://www.culturealberta.com/events"
                },
                {
                  "@type": "ListItem",
                  "position": 4,
                  "name": "Food & Drink",
                  "item": "https://www.culturealberta.com/food-drink"
                },
                {
                  "@type": "ListItem",
                  "position": 5,
                  "name": "Best of Alberta",
                  "item": "https://www.culturealberta.com/best-of"
                }
              ]
            })
          }}
        />

        {/* Local Business Schema for better local search results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "name": "Culture Alberta",
              "description": "Your guide to Alberta's culture: events, restaurants, festivals & local experiences",
              "url": "https://www.culturealberta.com",
              "logo": "https://www.culturealberta.com/favicon.svg",
              "image": "https://www.culturealberta.com/images/culture-alberta-og.jpg",
              "address": {
                "@type": "PostalAddress",
                "addressRegion": "Alberta",
                "addressCountry": "CA"
              },
              "areaServed": [
                {
                  "@type": "City",
                  "name": "Calgary"
                },
                {
                  "@type": "City", 
                  "name": "Edmonton"
                }
              ],
              "serviceType": "Cultural Guide & Local Events",
              "priceRange": "Free",
              "openingHours": "Mo-Su 00:00-23:59",
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "areaServed": "CA-AB"
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
        
        {/* Initialize Analytics */}
        <Script id="analytics-init" strategy="afterInteractive">
          {`
            // Initialize analytics tracking
            if (typeof window !== 'undefined') {
              // Track initial page view
              const trackPageView = (path, title) => {
                const pageViews = JSON.parse(localStorage.getItem('pageViews') || '[]');
                const sessionId = localStorage.getItem('analytics_session_id') || 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('analytics_session_id', sessionId);
                
                pageViews.push({
                  path,
                  title,
                  timestamp: new Date().toISOString(),
                  sessionId,
                });
                
                localStorage.setItem('pageViews', JSON.stringify(pageViews.slice(-1000)));
              };
              
              trackPageView(window.location.pathname, document.title);
              
              // Track navigation changes
              const originalPushState = history.pushState;
              history.pushState = function(...args) {
                originalPushState.apply(history, args);
                setTimeout(() => {
                  trackPageView(window.location.pathname, document.title);
                }, 100);
              };
            }
          `}
        </Script>
        
        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6902227267422426"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        <Script
          id="adsense-init"
          strategy="afterInteractive"
        >
          {`
            (adsbygoogle = window.adsbygoogle || []).push({
              google_ad_client: "ca-pub-6902227267422426",
              enable_page_level_ads: true
            });
          `}
        </Script>
      </head>
      <body suppressHydrationWarning={true}>
        <MainNavigation />
        <main>{children}</main>
        <Analytics />
      </body>
    </html>
  )
}
