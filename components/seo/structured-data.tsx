import { Article } from '@/lib/types'

interface StructuredDataProps {
  article: Article
  baseUrl?: string
}

export function ArticleStructuredData({ article, baseUrl = 'https://www.culturealberta.com' }: StructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.excerpt || article.content?.substring(0, 160) || `Discover ${article.title} in Alberta`,
    "image": article.imageUrl ? `${baseUrl}${article.imageUrl}` : `${baseUrl}/images/culture-alberta-og.jpg`,
    "author": {
      "@type": "Organization",
      "name": "Culture Alberta",
      "url": baseUrl
    },
    "publisher": {
      "@type": "Organization",
      "name": "Culture Alberta",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/images/culture-alberta-logo.svg`,
        "width": 1200,
        "height": 1200
      }
    },
    "datePublished": article.date,
    "dateModified": article.date,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${baseUrl}/articles/${article.slug}`
    },
    "url": `${baseUrl}/articles/${article.slug}`,
    "articleSection": article.category || "Culture",
    "keywords": article.tags?.join(', ') || `${article.category}, Alberta, Culture`,
    "about": {
      "@type": "Place",
      "name": article.location || "Alberta, Canada"
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

export function WebsiteStructuredData({ baseUrl = 'https://www.culturealberta.com' }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Culture Alberta",
    "description": "Discover the best culture, events, food, and experiences in Alberta. Your guide to Calgary and Edmonton's vibrant cultural scene.",
    "url": baseUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${baseUrl}/articles?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Culture Alberta",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/images/culture-alberta-logo.svg`,
        "width": 1200,
        "height": 1200
      }
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

export function OrganizationStructuredData({ baseUrl = 'https://www.culturealberta.com' }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    "name": "Culture Alberta",
    "alternateName": "Culture Alberta TM",
    "legalName": "Culture Alberta",
    "slogan": "Your Guide to Alberta's Culture",
    "description": "Alberta's premier cultural guide featuring the best events, restaurants, arts, and experiences in Calgary and Edmonton.",
    "url": baseUrl,
    "logo": {
      "@type": "ImageObject",
      "url": `${baseUrl}/images/culture-alberta-logo.svg`,
      "width": 1200,
      "height": 1200
    },
    "image": [
      `${baseUrl}/images/culture-alberta-logo.svg`,
      `${baseUrl}/images/culture-alberta-og.jpg`
    ],
    "sameAs": [
      "https://www.instagram.com/culturealberta._"
      // Add more social media URLs when available:
      // "https://www.facebook.com/culturealberta",
      // "https://twitter.com/culturealberta",
      // "https://www.youtube.com/@culturealberta"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "url": `${baseUrl}/contact`,
      "email": "culturemedia101@gmail.com",
      "areaServed": "CA",
      "availableLanguage": "English"
    },
    "areaServed": [
      {
        "@type": "Place",
        "name": "Alberta, Canada",
        "@id": "https://en.wikipedia.org/wiki/Alberta"
      },
      {
        "@type": "City",
        "name": "Calgary",
        "containedInPlace": "Alberta, Canada"
      },
      {
        "@type": "City",
        "name": "Edmonton",
        "containedInPlace": "Alberta, Canada"
      }
    ],
    "knowsAbout": [
      "Alberta Culture",
      "Calgary Events",
      "Edmonton Events",
      "Alberta Restaurants",
      "Alberta Tourism",
      "Local Events",
      "Canadian Culture",
      "Arts and Entertainment"
    ],
    "parentOrganization": {
      "@type": "Organization",
      "name": "Culture Media",
      "email": "culturemedia101@gmail.com"
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

export function LocalBusinessStructuredData({ baseUrl = 'https://www.culturealberta.com' }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MediaOrganization",
    "@id": `${baseUrl}/#localbusiness`,
    "name": "Culture Alberta",
    "description": "Alberta's premier cultural guide and media organization covering events, restaurants, arts, and experiences.",
    "url": baseUrl,
    "logo": {
      "@type": "ImageObject",
      "url": `${baseUrl}/images/culture-alberta-logo.svg`
    },
    "address": {
      "@type": "PostalAddress",
      "addressRegion": "AB",
      "addressCountry": "CA"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "53.5461",
      "longitude": "-113.4938"
    },
    "areaServed": {
      "@type": "State",
      "name": "Alberta",
      "containedInPlace": {
        "@type": "Country",
        "name": "Canada"
      }
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Cultural Content & Guides",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Event Listings",
            "description": "Curated listings of cultural events in Alberta"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Restaurant Reviews",
            "description": "Reviews and guides to Alberta's dining scene"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Cultural Articles",
            "description": "In-depth articles about Alberta's culture and lifestyle"
          }
        }
      ]
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
