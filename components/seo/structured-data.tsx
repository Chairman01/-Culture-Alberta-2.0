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
        "url": `${baseUrl}/images/culture-alberta-logo.png`
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
        "url": `${baseUrl}/images/culture-alberta-logo.png`
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
    "name": "Culture Alberta",
    "alternateName": "Culture Alberta TM",
    "description": "Alberta's premier cultural guide featuring the best events, restaurants, arts, and experiences in Calgary and Edmonton.",
    "url": baseUrl,
    "logo": {
      "@type": "ImageObject",
      "url": `${baseUrl}/favicon.svg`,
      "width": 32,
      "height": 32
    },
    "image": `${baseUrl}/images/culture-alberta-og.jpg`,
    "sameAs": [
      // Add your social media URLs here when available
      // "https://www.facebook.com/culturealberta",
      // "https://www.instagram.com/culturealberta._",
      // "https://www.twitter.com/culturealberta",
      // "https://www.youtube.com/@culturealberta"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "url": `${baseUrl}/contact`,
      "email": "culturemedia101@gmail.com"
    },
    "areaServed": [
      {
        "@type": "Place",
        "name": "Alberta, Canada"
      },
      {
        "@type": "Place", 
        "name": "Calgary, Alberta"
      },
      {
        "@type": "Place",
        "name": "Edmonton, Alberta"
      }
    ],
    "knowsAbout": [
      "Alberta Culture",
      "Calgary Events",
      "Edmonton Events",
      "Alberta Restaurants",
      "Alberta Tourism",
      "Local Events"
    ]
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
