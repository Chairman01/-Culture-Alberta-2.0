/**
 * SEO Optimization with Cursor Web Features
 * 
 * This file addresses Google Search Console indexing issues with intelligent
 * canonical tag management, redirect handling, and content optimization.
 */

import { Metadata } from 'next'

// Types for better SEO management
interface SEOConfig {
  baseUrl: string
  defaultImage: string
  defaultAuthor: string
  defaultLocale: string
}

interface CanonicalConfig {
  url: string
  forceHttps?: boolean
  removeTrailingSlash?: boolean
  removeQueryParams?: boolean
}

// SEO configuration
const SEO_CONFIG: SEOConfig = {
  baseUrl: 'https://www.culturealberta.com',
  defaultImage: 'https://www.culturealberta.com/images/culture-alberta-og.jpg',
  defaultAuthor: 'Culture Alberta',
  defaultLocale: 'en_CA'
}

// Canonical URL generator with Cursor web optimizations
export function generateCanonicalUrl(
  path: string, 
  config: CanonicalConfig = {}
): string {
  const {
    forceHttps = true,
    removeTrailingSlash = true,
    removeQueryParams = true
  } = config

  let canonicalUrl = `${SEO_CONFIG.baseUrl}${path}`
  
  // Force HTTPS
  if (forceHttps && canonicalUrl.startsWith('http://')) {
    canonicalUrl = canonicalUrl.replace('http://', 'https://')
  }
  
  // Remove trailing slash (except for root)
  if (removeTrailingSlash && canonicalUrl.endsWith('/') && canonicalUrl !== SEO_CONFIG.baseUrl + '/') {
    canonicalUrl = canonicalUrl.slice(0, -1)
  }
  
  // Remove query parameters
  if (removeQueryParams) {
    canonicalUrl = canonicalUrl.split('?')[0]
  }
  
  return canonicalUrl
}

// Enhanced metadata generator for better indexing
export function generateEnhancedMetadata({
  title,
  description,
  path,
  image,
  type = 'website',
  publishedTime,
  modifiedTime,
  author = SEO_CONFIG.defaultAuthor,
  keywords = [],
  noindex = false,
  nofollow = false
}: {
  title: string
  description: string
  path: string
  image?: string
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  author?: string
  keywords?: string[]
  noindex?: boolean
  nofollow?: boolean
}): Metadata {
  const fullTitle = title.includes('Culture Alberta') ? title : `${title} | Culture Alberta`
  const canonicalUrl = generateCanonicalUrl(path)
  const fullImage = image || SEO_CONFIG.defaultImage
  
  // Generate robots directive
  const robots = []
  if (!noindex) robots.push('index')
  if (!nofollow) robots.push('follow')
  if (noindex) robots.push('noindex')
  if (nofollow) robots.push('nofollow')
  
  return {
    title: fullTitle,
    description,
    keywords: [...keywords, 'Alberta', 'Culture', 'Calgary', 'Edmonton'].join(', '),
    authors: [{ name: author }],
    robots: robots.join(', '),
    
    // Open Graph
    openGraph: {
      type,
      title: fullTitle,
      description,
      url: canonicalUrl,
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: title,
        }
      ],
      siteName: 'Culture Alberta',
      locale: SEO_CONFIG.defaultLocale,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(author && { authors: [author] }),
    },
    
    // Twitter
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [fullImage],
      site: '@culturealberta',
      creator: '@culturealberta',
    },
    
    // Canonical URL - This is crucial for fixing the canonical tag issues
    alternates: {
      canonical: canonicalUrl,
    },
    
    // Additional meta tags
    other: {
      'article:author': author,
      'article:published_time': publishedTime || '',
      'article:modified_time': modifiedTime || publishedTime || '',
    }
  }
}

// Redirect handler for fixing 404 and redirect issues
export function createRedirectResponse(
  destination: string,
  permanent: boolean = true,
  statusCode: number = permanent ? 301 : 302
) {
  return {
    redirect: {
      destination,
      permanent,
      statusCode
    }
  }
}

// Content validation for preventing soft 404s
export function validateContentForIndexing(content: {
  title?: string
  description?: string
  body?: string
  imageUrl?: string
}): { isValid: boolean; issues: string[] } {
  const issues: string[] = []
  
  // Check for minimum content requirements
  if (!content.title || content.title.trim().length < 10) {
    issues.push('Title too short (minimum 10 characters)')
  }
  
  if (!content.description || content.description.trim().length < 50) {
    issues.push('Description too short (minimum 50 characters)')
  }
  
  if (!content.body || content.body.trim().length < 100) {
    issues.push('Content too short (minimum 100 characters)')
  }
  
  // Check for duplicate content indicators
  if (content.title === content.description) {
    issues.push('Title and description are identical')
  }
  
  // Check for placeholder content
  const placeholderPatterns = [
    /lorem ipsum/i,
    /placeholder/i,
    /coming soon/i,
    /under construction/i,
    /tbd/i,
    /to be determined/i
  ]
  
  const contentText = `${content.title} ${content.description} ${content.body}`.toLowerCase()
  
  for (const pattern of placeholderPatterns) {
    if (pattern.test(contentText)) {
      issues.push('Contains placeholder content')
      break
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

// Duplicate content detection
export function detectDuplicateContent(
  content: string,
  existingContent: string[]
): { isDuplicate: boolean; similarity: number; matches: string[] } {
  const contentWords = content.toLowerCase().split(/\s+/)
  const matches: string[] = []
  let maxSimilarity = 0
  
  for (const existing of existingContent) {
    const existingWords = existing.toLowerCase().split(/\s+/)
    const commonWords = contentWords.filter(word => 
      word.length > 3 && existingWords.includes(word)
    )
    
    const similarity = (commonWords.length / Math.max(contentWords.length, existingWords.length)) * 100
    
    if (similarity > 80) {
      matches.push(existing)
      maxSimilarity = Math.max(maxSimilarity, similarity)
    }
  }
  
  return {
    isDuplicate: maxSimilarity > 80,
    similarity: maxSimilarity,
    matches
  }
}

// Sitemap URL generator
export function generateSitemapUrls(
  baseUrl: string,
  paths: string[],
  priority: number = 0.5,
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' = 'weekly'
) {
  return paths.map(path => ({
    url: `${baseUrl}${path}`,
    lastmod: new Date().toISOString(),
    changefreq,
    priority
  }))
}

// Meta robots generator
export function generateRobotsMeta(
  index: boolean = true,
  follow: boolean = true,
  noarchive: boolean = false,
  nosnippet: boolean = false,
  noimageindex: boolean = false,
  notranslate: boolean = false
): string {
  const directives = []
  
  if (index) directives.push('index')
  else directives.push('noindex')
  
  if (follow) directives.push('follow')
  else directives.push('nofollow')
  
  if (noarchive) directives.push('noarchive')
  if (nosnippet) directives.push('nosnippet')
  if (noimageindex) directives.push('noimageindex')
  if (notranslate) directives.push('notranslate')
  
  return directives.join(', ')
}

// Export configuration for easy access
export { SEO_CONFIG }
export type { SEOConfig, CanonicalConfig }
