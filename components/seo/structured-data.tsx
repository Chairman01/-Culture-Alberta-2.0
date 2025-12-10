import { Article } from '@/lib/types'
import { createSlug } from '@/lib/utils/slug'

interface StructuredDataProps {
  article: Article
  baseUrl?: string
}

// Helper to get proper image URL
function getArticleImageUrl(imageUrl: string | undefined, baseUrl: string): string {
  const defaultImage = `${baseUrl}/images/culture-alberta-og.jpg`

  if (!imageUrl) return defaultImage

  // Skip base64 images
  if (imageUrl.startsWith('data:image')) return defaultImage

  // Already absolute URL (Supabase, etc.)
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  // Relative URL
  if (imageUrl.startsWith('/')) {
    return `${baseUrl}${imageUrl}`
  }

  return `${baseUrl}/${imageUrl}`
}

export function ArticleStructuredData({ article, baseUrl = 'https://www.culturealberta.com' }: StructuredDataProps) {
  // Generate slug from title for consistent URLs
  const articleSlug = article.slug || createSlug(article.title)

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.excerpt || article.content?.substring(0, 160) || `Discover ${article.title} in Alberta`,
    "image": getArticleImageUrl(article.imageUrl, baseUrl),
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
    "dateModified": article.updatedAt || article.date,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${baseUrl}/articles/${articleSlug}`
    },
    "url": `${baseUrl}/articles/${articleSlug}`,
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
      "https://www.instagram.com/culturealberta._",
      "https://www.youtube.com/@CultureAlberta_",
      "https://www.facebook.com/profile.php?id=100064044099295"
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

// Breadcrumb structured data for article pages
interface BreadcrumbProps {
  articleTitle: string
  articleCategory?: string
  articleSlug: string
  baseUrl?: string
}

export function BreadcrumbStructuredData({
  articleTitle,
  articleCategory,
  articleSlug,
  baseUrl = 'https://www.culturealberta.com'
}: BreadcrumbProps) {
  const breadcrumbItems = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": baseUrl
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Articles",
      "item": `${baseUrl}/articles`
    }
  ]

  // Add category if available
  if (articleCategory) {
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 3,
      "name": articleCategory,
      "item": `${baseUrl}/${articleCategory.toLowerCase().replace(/\s+/g, '-')}`
    })
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 4,
      "name": articleTitle,
      "item": `${baseUrl}/articles/${articleSlug}`
    })
  } else {
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 3,
      "name": articleTitle,
      "item": `${baseUrl}/articles/${articleSlug}`
    })
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems
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
