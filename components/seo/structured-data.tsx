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

// Categories that qualify as news journalism
const NEWS_CATEGORIES = ['news', 'breaking', 'local news', 'city news', 'current events', 'politics', 'business news', 'crime', 'weather', 'sports']

function getArticleSchemaType(category?: string, tags?: string[]): 'NewsArticle' | 'Article' {
  const cat = (category || '').toLowerCase()
  if (NEWS_CATEGORIES.some(n => cat.includes(n))) return 'NewsArticle'
  const tagStr = (tags || []).join(' ').toLowerCase()
  if (NEWS_CATEGORIES.some(n => tagStr.includes(n))) return 'NewsArticle'
  return 'Article'
}

// Known author profiles — maps display name → about URL for Bing E-A-T
const AUTHOR_URLS: Record<string, string> = {
  'Adam Harrison': 'https://www.culturealberta.com/about#adam-harrison',
}

function estimateWordCount(content?: string | null): number {
  if (!content) return 0
  // Strip HTML tags, then count whitespace-separated tokens
  const text = content.replace(/<[^>]+>/g, ' ').trim()
  return text ? text.split(/\s+/).length : 0
}

export function ArticleStructuredData({ article, baseUrl = 'https://www.culturealberta.com' }: StructuredDataProps) {
  // Generate slug from title for consistent URLs
  const articleSlug = article.slug || createSlug(article.title)
  const schemaType = getArticleSchemaType(article.category, article.tags)
  const wordCount = estimateWordCount(article.content)

  const authorName = article.author && article.author !== 'Culture Alberta'
    ? article.author
    : null

  const authorEntity = authorName
    ? {
        "@type": "Person",
        "name": authorName,
        ...(AUTHOR_URLS[authorName] ? { "url": AUTHOR_URLS[authorName] } : {}),
      }
    : {
        "@type": "Organization",
        "name": "Culture Alberta",
        "url": baseUrl,
        "logo": {
          "@type": "ImageObject",
          "url": `${baseUrl}/images/ca-logo.png`,
        },
      }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": schemaType,
    "headline": article.title,
    "description": article.excerpt || article.content?.substring(0, 160) || `Discover ${article.title} in Alberta`,
    "image": getArticleImageUrl(article.imageUrl, baseUrl),
    "author": authorEntity,
    "publisher": {
      "@type": "Organization",
      "name": "Culture Alberta",
      "url": baseUrl,
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/images/ca-logo.png`,
        "width": 192,
        "height": 192
      }
    },
    "datePublished": article.date,
    "dateModified": article.updatedAt || article.date,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${baseUrl}/articles/${articleSlug}`
    },
    "url": `${baseUrl}/articles/${articleSlug}`,
    "inLanguage": "en-CA",
    "articleSection": article.category || "Culture",
    "keywords": article.tags?.join(', ') || `${article.category}, Alberta, Culture`,
    ...(wordCount > 0 ? { "wordCount": wordCount } : {}),
    "about": {
      "@type": "Place",
      "name": article.location || "Alberta, Canada"
    },
    "copyrightYear": new Date(article.date || Date.now()).getFullYear(),
    "copyrightHolder": {
      "@type": "Organization",
      "name": "Culture Alberta",
      "url": baseUrl,
    },
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
    "@id": `${baseUrl}/#website`,
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
        "url": `${baseUrl}/images/ca-logo.png`,
        "width": 192,
        "height": 192
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

export function HomepageStructuredData({ baseUrl = 'https://www.culturealberta.com' }) {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${baseUrl}/#webpage`,
      "url": baseUrl,
      "name": "Culture Alberta",
      "description": "Culture Alberta is a local guide to Alberta events, food, culture, neighbourhood stories, practical tools, and local news across Edmonton, Calgary, and communities throughout Alberta.",
      "inLanguage": "en-CA",
      "isPartOf": {
        "@id": `${baseUrl}/#website`
      },
      "publisher": {
        "@id": `${baseUrl}/#organization`
      },
      "about": [
        { "@type": "Thing", "name": "Alberta culture" },
        { "@type": "Thing", "name": "Alberta events" },
        { "@type": "Thing", "name": "Calgary restaurants" },
        { "@type": "Thing", "name": "Edmonton local news" },
        { "@type": "Thing", "name": "Things to do in Alberta" }
      ],
      "spatialCoverage": {
        "@type": "State",
        "name": "Alberta",
        "containedInPlace": {
          "@type": "Country",
          "name": "Canada"
        }
      },
      "mainEntity": {
        "@type": "ItemList",
        "name": "Culture Alberta main sections",
        "itemListElement": [
          { "@type": "SiteNavigationElement", "position": 1, "name": "Edmonton", "url": `${baseUrl}/edmonton` },
          { "@type": "SiteNavigationElement", "position": 2, "name": "Calgary", "url": `${baseUrl}/calgary` },
          { "@type": "SiteNavigationElement", "position": 3, "name": "Around Alberta", "url": `${baseUrl}/alberta` },
          { "@type": "SiteNavigationElement", "position": 4, "name": "Events", "url": `${baseUrl}/events` },
          { "@type": "SiteNavigationElement", "position": 5, "name": "Food & Drink", "url": `${baseUrl}/food-drink` },
          { "@type": "SiteNavigationElement", "position": 6, "name": "Tools", "url": `${baseUrl}/tools` }
        ]
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${baseUrl}/#faq`,
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is Culture Alberta?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Culture Alberta is an Alberta-focused media and guide site covering local stories, events, restaurants, arts, culture, neighbourhoods, and practical tools for people in Edmonton, Calgary, and communities across Alberta."
          }
        },
        {
          "@type": "Question",
          "name": "What cities does Culture Alberta cover?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Culture Alberta covers communities across Alberta including Edmonton, Calgary, Red Deer, Lethbridge, Medicine Hat, Grande Prairie, Fort McMurray, Lloydminster, Airdrie, St. Albert, Spruce Grove, Leduc, Camrose, Wetaskiwin, Drumheller, Banff, Jasper, Canmore, Lac La Biche, Fort Saskatchewan, Sherwood Park, Cold Lake, and Brooks."
          }
        },
        {
          "@type": "Question",
          "name": "What can readers find on Culture Alberta?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Readers can find local news, city spotlights, event listings, restaurant and food coverage, arts and culture stories, guides, and Alberta-focused tools."
          }
        }
      ]
    }
  ]

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
      "url": `${baseUrl}/images/ca-logo.png`,
      "width": 192,
      "height": 192
    },
    "image": [
      `${baseUrl}/images/ca-logo.png`,
      `${baseUrl}/images/culture-alberta-og.jpg`
    ],
    "sameAs": [
      "https://www.instagram.com/culturealberta._",
      "https://www.youtube.com/@CultureAlberta_",
      "https://www.facebook.com/profile.php?id=100064044099295",
      "https://www.tiktok.com/@culturealberta",
      "https://twitter.com/culturealberta"
    ],
    "foundingDate": "2024",
    "foundingLocation": {
      "@type": "Place",
      "name": "Alberta, Canada"
    },
    "knowsLanguage": "en-CA",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "url": `${baseUrl}/contact`,
      "email": "hello@culturemedia.ca",
      "areaServed": "CA",
      "availableLanguage": "English"
    },
    "areaServed": [
      {
        "@type": "Place",
        "name": "Alberta, Canada",
        "@id": "https://en.wikipedia.org/wiki/Alberta"
      },
      { "@type": "City", "name": "Calgary", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Edmonton", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Red Deer", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Lethbridge", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Medicine Hat", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Grande Prairie", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Fort McMurray", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Lloydminster", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Airdrie", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "St. Albert", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Spruce Grove", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Leduc", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Camrose", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Wetaskiwin", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Drumheller", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Banff", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Jasper", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Lac La Biche", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Fort Saskatchewan", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Sherwood Park", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Cold Lake", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Brooks", "containedInPlace": "Alberta, Canada" },
      { "@type": "City", "name": "Canmore", "containedInPlace": "Alberta, Canada" }
    ],
    "knowsAbout": [
      "Alberta Culture",
      "Calgary Events",
      "Edmonton Events",
      "Alberta Restaurants",
      "Alberta Tourism",
      "Local Events",
      "Canadian Culture",
      "Arts and Entertainment",
      "Food and Dining",
      "Cultural Events",
      "Arts and Music",
      "Travel and Tourism",
      "Red Deer Events",
      "Lethbridge Culture",
      "Medicine Hat News",
      "Grande Prairie Events",
      "Fort McMurray News",
      "Lloydminster Culture",
      "Airdrie Events",
      "Spruce Grove Community",
      "Canmore Tourism",
      "Banff Events",
      "Drumheller Tourism",
      "Alberta Major Projects",
      "Alberta Construction",
      "Alberta Recreation"
    ],
    "actionableFeedbackPolicy": `${baseUrl}/about#feedback`,
    "correctionsPolicy": `${baseUrl}/about#corrections`,
    "diversityPolicy": `${baseUrl}/about#diversity`,
    "parentOrganization": {
      "@type": "Organization",
      "name": "Culture Media",
      "email": "hello@culturemedia.ca"
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
      "url": `${baseUrl}/images/ca-logo.png`
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
