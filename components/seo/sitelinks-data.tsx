import React from 'react'

interface NavigationLink {
    name: string
    url: string
    description?: string
}

interface SitelinksDataProps {
    navigationLinks: NavigationLink[]
    baseUrl?: string
}

/**
 * SiteNavigationElement for Google Sitelinks
 * Displays key site pages as links under the main search result
 */
export function SitelinksData({
    navigationLinks,
    baseUrl = 'https://www.culturealberta.com'
}: SitelinksDataProps) {
    if (!navigationLinks || navigationLinks.length === 0) return null

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        "url": baseUrl,
        "name": "Culture Alberta",
        "hasPart": navigationLinks.map(link => ({
            "@type": "WebPage",
            "@id": link.url,
            "url": link.url,
            "name": link.name,
            ...(link.description && { "description": link.description })
        }))
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
    )
}

/**
 * Default navigation links for Culture Alberta
 */
export const DEFAULT_NAVIGATION_LINKS: NavigationLink[] = [
    {
        name: 'Articles',
        url: 'https://www.culturealberta.com/articles',
        description: 'Latest articles about Alberta culture, events, and lifestyle'
    },
    {
        name: 'Events',
        url: 'https://www.culturealberta.com/events',
        description: 'Upcoming cultural events in Calgary and Edmonton'
    },
    {
        name: 'Best Of',
        url: 'https://www.culturealberta.com/best-of',
        description: 'Best restaurants, venues, and experiences in Alberta'
    },
    {
        name: 'Calgary',
        url: 'https://www.culturealberta.com/calgary',
        description: 'Discover Calgary\'s vibrant cultural scene'
    },
    {
        name: 'Edmonton',
        url: 'https://www.culturealberta.com/edmonton',
        description: 'Explore Edmonton\'s arts and culture'
    },
    {
        name: 'Wiki',
        url: 'https://www.culturealberta.com/wiki',
        description: 'Comprehensive guides to Alberta culture'
    }
]
