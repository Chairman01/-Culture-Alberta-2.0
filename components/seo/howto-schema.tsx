import React from 'react'

interface HowToStep {
    name: string
    text: string
    image?: string
    url?: string
}

interface HowToSchemaProps {
    name: string
    description: string
    steps: HowToStep[]
    totalTime?: string // ISO 8601 duration (e.g., "PT30M" for 30 minutes)
    image?: string
    supplies?: string[]
    tools?: string[]
    baseUrl?: string
}

/**
 * HowTo Schema Component for Google Rich Results
 * Displays step-by-step instructions in search results
 */
export function HowToSchema({
    name,
    description,
    steps,
    totalTime,
    image,
    supplies,
    tools,
    baseUrl = 'https://www.culturealberta.com'
}: HowToSchemaProps) {
    if (!steps || steps.length === 0) return null

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": name,
        "description": description,
        ...(image && { "image": image }),
        ...(totalTime && { "totalTime": totalTime }),
        ...(supplies && supplies.length > 0 && {
            "supply": supplies.map(supply => ({
                "@type": "HowToSupply",
                "name": supply
            }))
        }),
        ...(tools && tools.length > 0 && {
            "tool": tools.map(tool => ({
                "@type": "HowToTool",
                "name": tool
            }))
        }),
        "step": steps.map((step, index) => ({
            "@type": "HowToStep",
            "position": index + 1,
            "name": step.name,
            "text": step.text,
            ...(step.image && { "image": step.image }),
            ...(step.url && { "url": step.url })
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
 * Extract HowTo steps from markdown content
 * Looks for numbered lists or step patterns
 */
export function extractHowToSteps(content: string): HowToStep[] {
    const steps: HowToStep[] = []

    // Match numbered lists like "1. Step name" followed by description
    const stepPattern = /\d+\.\s+\*\*(.+?)\*\*\s*\n+(.+?)(?=\n\d+\.|\n#|$)/g

    let match
    while ((match = stepPattern.exec(content)) !== null) {
        const name = match[1].trim()
        const text = match[2].trim()

        if (name && text) {
            steps.push({ name, text })
        }
    }

    return steps
}
