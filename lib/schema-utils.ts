import { Article } from '@/lib/types'
import { FAQItem } from '@/components/seo/faq-schema'

/**
 * SEO Schema Utility Functions
 * Helper functions to generate structured data from article content
 */

/**
 * Generate enhanced Article schema with speakable content
 */
export function generateArticleSchema(
    article: Article,
    baseUrl: string = 'https://www.culturealberta.com'
) {
    const articleSlug = article.slug || createSlug(article.title)

    return {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.title,
        "description": article.excerpt || article.content?.substring(0, 160),
        "image": getArticleImageUrl(article.imageUrl, baseUrl),
        "datePublished": article.date,
        "dateModified": article.updatedAt || article.date,
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
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `${baseUrl}/articles/${articleSlug}`
        },
        "url": `${baseUrl}/articles/${articleSlug}`,
        "articleSection": article.category || "Culture",
        "keywords": article.tags?.join(', ') || `${article.category}, Alberta, Culture`,
        // Speakable content for voice assistants
        "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": [".article-headline", ".article-excerpt", ".article-content p:first-of-type"]
        },
        ...(article.location && {
            "about": {
                "@type": "Place",
                "name": article.location
            }
        })
    }
}

/**
 * Generate Event schema from article data
 */
export function generateEventSchema(
    article: Article,
    eventDate: string,
    location?: { name: string; address?: string; lat?: number; lng?: number },
    baseUrl: string = 'https://www.culturealberta.com'
) {
    const articleSlug = article.slug || createSlug(article.title)

    return {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": article.title,
        "description": article.excerpt || article.content?.substring(0, 160),
        "image": getArticleImageUrl(article.imageUrl, baseUrl),
        "startDate": eventDate,
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": location
            ? "https://schema.org/OfflineEventAttendanceMode"
            : "https://schema.org/OnlineEventAttendanceMode",
        ...(location && {
            "location": {
                "@type": "Place",
                "name": location.name,
                ...(location.address && { "address": location.address }),
                ...(location.lat && location.lng && {
                    "geo": {
                        "@type": "GeoCoordinates",
                        "latitude": location.lat,
                        "longitude": location.lng
                    }
                })
            }
        }),
        "organizer": {
            "@type": "Organization",
            "name": "Culture Alberta",
            "url": baseUrl
        },
        "url": `${baseUrl}/articles/${articleSlug}`
    }
}

/**
 * Auto-extract FAQ items from article content
 */
export function generateFAQSchema(content: string): FAQItem[] {
    const faqs: FAQItem[] = []

    // Match headings that end with "?" followed by content
    const questionPattern = /(?:^|\n)#{2,3}\s+(.+\?)\s*\n+((?:(?!#{1,3}\s).+\n?)+)/g

    let match
    while ((match = questionPattern.exec(content)) !== null) {
        const question = match[1].trim()
        const answer = match[2].trim().replace(/\n+/g, ' ')

        if (question && answer && answer.length > 10) {
            faqs.push({ question, answer })
        }
    }

    return faqs
}

/**
 * Generate breadcrumb schema for any page
 */
export function generateBreadcrumbSchema(
    breadcrumbs: Array<{ name: string; url: string }>,
    baseUrl: string = 'https://www.culturealberta.com'
) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((crumb, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": crumb.name,
            "item": crumb.url.startsWith('http') ? crumb.url : `${baseUrl}${crumb.url}`
        }))
    }
}

/**
 * Generate review schema with rating
 */
export function generateReviewSchema(
    itemName: string,
    rating: number,
    reviewCount: number,
    reviewBody?: string,
    baseUrl: string = 'https://www.culturealberta.com'
) {
    return {
        "@context": "https://schema.org",
        "@type": "Restaurant",
        "name": itemName,
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": rating.toFixed(1),
            "bestRating": "5",
            "worstRating": "1",
            "ratingCount": reviewCount.toString()
        },
        ...(reviewBody && {
            "review": {
                "@type": "Review",
                "author": {
                    "@type": "Organization",
                    "name": "Culture Alberta"
                },
                "datePublished": new Date().toISOString(),
                "reviewBody": reviewBody,
                "reviewRating": {
                    "@type": "Rating",
                    "ratingValue": rating.toFixed(1),
                    "bestRating": "5"
                }
            }
        })
    }
}

/**
 * Validate schema object
 */
export function validateSchema(schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!schema['@context']) {
        errors.push('Missing @context')
    }

    if (!schema['@type']) {
        errors.push('Missing @type')
    }

    // Type-specific validation
    if (schema['@type'] === 'Article') {
        if (!schema.headline) errors.push('Article missing headline')
        if (!schema.author) errors.push('Article missing author')
        if (!schema.datePublished) errors.push('Article missing datePublished')
    }

    if (schema['@type'] === 'Event') {
        if (!schema.name) errors.push('Event missing name')
        if (!schema.startDate) errors.push('Event missing startDate')
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

// Helper functions
function createSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function getArticleImageUrl(imageUrl: string | undefined, baseUrl: string): string {
    const defaultImage = `${baseUrl}/images/culture-alberta-og.jpg`

    if (!imageUrl) return defaultImage
    if (imageUrl.startsWith('data:image')) return defaultImage
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl
    }
    if (imageUrl.startsWith('/')) {
        return `${baseUrl}${imageUrl}`
    }

    return `${baseUrl}/${imageUrl}`
}
