import React from 'react'

interface ReviewData {
    itemName: string
    itemType?: 'Restaurant' | 'LocalBusiness' | 'FoodEstablishment' | 'Place'
    rating: number
    reviewCount: number
    bestRating?: number
    worstRating?: number
    author?: string
    reviewBody?: string
    datePublished?: string
    baseUrl?: string
}

/**
 * Review Schema Component with Aggregate Rating
 * Displays star ratings in Google search results
 */
export function ReviewSchema({
    itemName,
    itemType = 'Restaurant',
    rating,
    reviewCount,
    bestRating = 5,
    worstRating = 1,
    author = 'Culture Alberta',
    reviewBody,
    datePublished,
    baseUrl = 'https://www.culturealberta.com'
}: ReviewData) {
    if (!rating || rating < 0 || rating > bestRating) return null

    const structuredData = {
        "@context": "https://schema.org",
        "@type": itemType,
        "name": itemName,
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": rating.toString(),
            "bestRating": bestRating.toString(),
            "worstRating": worstRating.toString(),
            "ratingCount": reviewCount.toString()
        },
        ...(reviewBody && {
            "review": {
                "@type": "Review",
                "author": {
                    "@type": "Organization",
                    "name": author
                },
                "datePublished": datePublished || new Date().toISOString(),
                "reviewBody": reviewBody,
                "reviewRating": {
                    "@type": "Rating",
                    "ratingValue": rating.toString(),
                    "bestRating": bestRating.toString(),
                    "worstRating": worstRating.toString()
                }
            }
        })
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
    )
}

/**
 * Simple star rating display component (optional visual element)
 */
export function StarRating({ rating, maxRating = 5 }: { rating: number; maxRating?: number }) {
    const percentage = (rating / maxRating) * 100

    return (
        <div className="flex items-center gap-1" aria-label={`${rating} out of ${maxRating} stars`}>
            <div className="relative inline-flex">
                <div className="text-gray-300">
                    {'★'.repeat(maxRating)}
                </div>
                <div
                    className="absolute top-0 left-0 overflow-hidden text-yellow-400"
                    style={{ width: `${percentage}%` }}
                >
                    {'★'.repeat(maxRating)}
                </div>
            </div>
            <span className="text-sm text-gray-600 ml-1">
                {rating.toFixed(1)}
            </span>
        </div>
    )
}
