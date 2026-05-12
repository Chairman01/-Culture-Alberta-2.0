import { Article } from '@/lib/types'

/**
 * Metadata Generation Utilities
 * Helper functions for optimizing SEO metadata
 */

/**
 * Generate optimized meta description
 * Extracts key information from content and limits to 155-160 characters
 */
export function generateMetaDescription(
    article: Article,
    maxLength: number = 160
): string {
    // Use explicit excerpt if available
    if (article.excerpt) {
        return truncateToLength(article.excerpt, maxLength)
    }

    // Extract first meaningful paragraph from content
    if (article.content) {
        const cleanContent = article.content
            .replace(/#{1,6}\s/g, '') // Remove markdown headers
            .replace(/\*\*/g, '') // Remove bold
            .replace(/\*/g, '') // Remove italic
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links
            .trim()

        return truncateToLength(cleanContent, maxLength)
    }

    // Fallback
    return truncateToLength(
        `Discover ${article.title} in Alberta. Your guide to culture, events, and experiences in Calgary and Edmonton.`,
        maxLength
    )
}

/**
 * Extract keywords from article content
 */
export function extractKeywords(article: Article, maxKeywords: number = 10): string[] {
    const keywords: Set<string> = new Set()

    // Add tags
    if (article.tags) {
        article.tags.forEach(tag => keywords.add(tag.toLowerCase()))
    }

    // Add category
    if (article.category) {
        keywords.add(article.category.toLowerCase())
    }

    // Add location
    if (article.location) {
        keywords.add(article.location.toLowerCase())
    }

    // Extract from title
    const titleWords = article.title
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3 && !STOP_WORDS.has(word))

    titleWords.forEach(word => {
        if (keywords.size < maxKeywords) {
            keywords.add(word)
        }
    })

    // Always include Alberta
    keywords.add('alberta')

    return Array.from(keywords).slice(0, maxKeywords)
}

/**
 * Generate OpenGraph metadata object
 */
export function generateOpenGraphMetadata(
    article: Article,
    baseUrl: string = 'https://www.culturealberta.com'
) {
    const articleSlug = article.slug || createSlug(article.title)
    const imageUrl = getArticleImageUrl(article.imageUrl, baseUrl)

    return {
        title: article.title,
        description: generateMetaDescription(article),
        url: `${baseUrl}/articles/${articleSlug}`,
        siteName: 'Culture Alberta',
        images: [
            {
                url: imageUrl,
                width: 1200,
                height: 630,
                alt: article.title
            }
        ],
        locale: 'en_CA',
        type: 'article',
        publishedTime: article.date,
        modifiedTime: article.updatedAt || article.date,
        authors: ['Culture Alberta'],
        ...(article.tags && { tags: article.tags })
    }
}

/**
 * Generate Twitter Card metadata
 */
export function generateTwitterMetadata(
    article: Article,
    baseUrl: string = 'https://www.culturealberta.com'
) {
    const imageUrl = getArticleImageUrl(article.imageUrl, baseUrl)

    return {
        card: 'summary_large_image',
        title: truncateToLength(article.title, 70),
        description: generateMetaDescription(article, 200),
        images: [imageUrl],
        creator: '@culturealberta',
        site: '@culturealberta'
    }
}

/**
 * Generate complete page metadata for Next.js
 */
export function generatePageMetadata(
    article: Article,
    baseUrl: string = 'https://www.culturealberta.com'
) {
    const articleSlug = article.slug || createSlug(article.title)
    const keywords = extractKeywords(article)

    return {
        title: `${article.title} | Culture Alberta`,
        description: generateMetaDescription(article),
        keywords: keywords.join(', '),
        authors: [{ name: 'Culture Alberta', url: baseUrl }],
        creator: 'Culture Alberta',
        publisher: 'Culture Alberta',
        applicationName: 'Culture Alberta',
        referrer: 'origin-when-cross-origin',
        category: article.category || 'Culture',
        alternates: {
            canonical: `${baseUrl}/articles/${articleSlug}`
        },
        openGraph: generateOpenGraphMetadata(article, baseUrl),
        twitter: generateTwitterMetadata(article, baseUrl),
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-video-preview': -1,
                'max-image-preview': 'large',
                'max-snippet': -1
            }
        }
    }
}

/**
 * Generate dynamic OpenGraph image URL
 * Can be used with Next.js OG Image generation
 */
export function generateOGImageUrl(
    title: string,
    category: string,
    baseUrl: string = 'https://www.culturealberta.com'
): string {
    const params = new URLSearchParams({
        title: title,
        category: category
    })

    return `${baseUrl}/api/og?${params.toString()}`
}

// Helper functions
function truncateToLength(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text

    // Find the last space before maxLength
    const truncated = text.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')

    if (lastSpace > maxLength * 0.8) {
        return truncated.substring(0, lastSpace) + '...'
    }

    return truncated.substring(0, maxLength - 3) + '...'
}

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

// Common English stop words to exclude from keywords
const STOP_WORDS = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
    'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me'
])
