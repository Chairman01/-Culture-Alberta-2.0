import React from 'react'

export interface FAQItem {
    question: string
    answer: string
}

interface FAQSchemaProps {
    faqs: FAQItem[]
    baseUrl?: string
}

/**
 * FAQ Schema Component for Google Rich Results
 * Displays FAQ expandable sections in search results
 */
export function FAQSchema({ faqs, baseUrl = 'https://www.culturealberta.com' }: FAQSchemaProps) {
    if (!faqs || faqs.length === 0) return null

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
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
 * Auto-extract FAQ items from article content
 * Looks for H2/H3 headings with question patterns followed by paragraphs
 */
export function extractFAQsFromContent(content: string): FAQItem[] {
    const faqs: FAQItem[] = []

    // Match headings that look like questions followed by content
    const questionPattern = /##\s+(.+\?)\s*\n+(.+?)(?=\n##|\n#|$)/g

    let match
    while ((match = questionPattern.exec(content)) !== null) {
        const question = match[1].trim()
        const answer = match[2].trim()

        if (question && answer) {
            faqs.push({ question, answer })
        }
    }

    return faqs
}
