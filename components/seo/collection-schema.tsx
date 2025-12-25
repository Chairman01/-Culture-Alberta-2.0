import React from 'react'
import { Article } from '@/lib/types'

interface CollectionItem {
    url: string
    name: string
    description?: string
    image?: string
    position: number
}

interface CollectionSchemaProps {
    items: CollectionItem[]
    collectionName: string
    collectionUrl: string
    baseUrl?: string
}

/**
 * ItemList/CollectionPage Schema for category pages
 * Displays rich carousel in Google search results
 */
export function CollectionSchema({
    items,
    collectionName,
    collectionUrl,
    baseUrl = 'https://www.culturealberta.com'
}: CollectionSchemaProps) {
    if (!items || items.length === 0) return null

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": collectionName,
        "url": collectionUrl,
        "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": items.length,
            "itemListElement": items.map(item => ({
                "@type": "ListItem",
                "position": item.position,
                "url": item.url,
                "name": item.name,
                ...(item.description && { "description": item.description }),
                ...(item.image && {
                    "image": {
                        "@type": "ImageObject",
                        "url": item.image
                    }
                })
            }))
        }
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
    )
}

/**
 * Convert articles array to collection items
 */
export function articlesToCollectionItems(
    articles: Article[],
    baseUrl: string = 'https://www.culturealberta.com'
): CollectionItem[] {
    return articles.map((article, index) => ({
        position: index + 1,
        url: `${baseUrl}/articles/${article.slug}`,
        name: article.title,
        description: article.excerpt || article.content?.substring(0, 160),
        image: article.imageUrl?.startsWith('http')
            ? article.imageUrl
            : article.imageUrl
                ? `${baseUrl}${article.imageUrl}`
                : undefined
    }))
}
