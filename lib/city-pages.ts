import type { Metadata } from 'next'

/**
 * Config for the secondary Alberta city hub pages (Red Deer, Lethbridge,
 * Medicine Hat, Grande Prairie, Fort McMurray). Edmonton and Calgary keep their
 * own bespoke pages; these five share the reusable <CityHub /> component so they
 * match the Edmonton layout while staying DRY.
 */
export interface CityPageConfig {
    slug: string // URL + newsletter + ?city= value, e.g. 'red-deer'
    name: string // Display name, e.g. 'Red Deer'
    eventLocation: string // getEventsByLocation() arg, e.g. 'Red Deer'
    region: string // e.g. 'Central Alberta'
    blurb: string // hero subtitle
    metaTitle: string
    metaDescription: string
    keywords: string
}

export const CITY_PAGES: Record<string, CityPageConfig> = {
    'red-deer': {
        slug: 'red-deer',
        name: 'Red Deer',
        eventLocation: 'Red Deer',
        region: 'Central Alberta',
        blurb: 'Discover the latest news, events, and stories from Central Alberta.',
        metaTitle: 'Red Deer News, Events & Culture | Culture Alberta',
        metaDescription:
            'Your local guide to Red Deer, Alberta. The latest news, events, restaurants, neighbourhoods, and culture from the heart of Central Alberta.',
        keywords:
            'Red Deer events, Red Deer news, Red Deer culture, things to do in Red Deer, Red Deer restaurants, Red Deer neighbourhoods, Red Deer Alberta, Central Alberta news',
    },
    lethbridge: {
        slug: 'lethbridge',
        name: 'Lethbridge',
        eventLocation: 'Lethbridge',
        region: 'Southern Alberta',
        blurb: 'Discover the latest news, events, and stories from Southern Alberta.',
        metaTitle: 'Lethbridge News, Events & Culture | Culture Alberta',
        metaDescription:
            'Your local guide to Lethbridge, Alberta. The latest news, events, restaurants, neighbourhoods, and culture from Southern Alberta.',
        keywords:
            'Lethbridge events, Lethbridge news, Lethbridge culture, things to do in Lethbridge, Lethbridge restaurants, Lethbridge neighbourhoods, Lethbridge Alberta, Southern Alberta news',
    },
    'medicine-hat': {
        slug: 'medicine-hat',
        name: 'Medicine Hat',
        eventLocation: 'Medicine Hat',
        region: 'Southeast Alberta',
        blurb: 'Discover the latest news, events, and stories from Southeast Alberta.',
        metaTitle: 'Medicine Hat News, Events & Culture | Culture Alberta',
        metaDescription:
            'Your local guide to Medicine Hat, Alberta. The latest news, events, restaurants, neighbourhoods, and culture from Southeast Alberta.',
        keywords:
            'Medicine Hat events, Medicine Hat news, Medicine Hat culture, things to do in Medicine Hat, Medicine Hat restaurants, Medicine Hat Alberta, Southeast Alberta news',
    },
    'grande-prairie': {
        slug: 'grande-prairie',
        name: 'Grande Prairie',
        eventLocation: 'Grande Prairie',
        region: 'the Peace Country',
        blurb: 'Discover the latest news, events, and stories from the Peace Country.',
        metaTitle: 'Grande Prairie News, Events & Culture | Culture Alberta',
        metaDescription:
            'Your local guide to Grande Prairie, Alberta. The latest news, events, restaurants, neighbourhoods, and culture from the Peace Country in Northwest Alberta.',
        keywords:
            'Grande Prairie events, Grande Prairie news, Grande Prairie culture, things to do in Grande Prairie, Grande Prairie restaurants, Grande Prairie Alberta, Peace Country news',
    },
    'fort-mcmurray': {
        slug: 'fort-mcmurray',
        name: 'Fort McMurray',
        eventLocation: 'Fort McMurray',
        region: 'the Wood Buffalo region',
        blurb: 'Discover the latest news, events, and stories from the Wood Buffalo region.',
        metaTitle: 'Fort McMurray News, Events & Culture | Culture Alberta',
        metaDescription:
            'Your local guide to Fort McMurray, Alberta. The latest news, events, restaurants, neighbourhoods, and culture from the Wood Buffalo region in Northern Alberta.',
        keywords:
            'Fort McMurray events, Fort McMurray news, Fort McMurray culture, things to do in Fort McMurray, Fort McMurray restaurants, Fort McMurray Alberta, Wood Buffalo news',
    },
}

export function getCityPage(slug: string): CityPageConfig | null {
    return CITY_PAGES[slug] ?? null
}

/** Build the Next.js metadata export for a city hub page. */
export function buildCityMetadata(slug: string): Metadata {
    const c = CITY_PAGES[slug]
    if (!c) return {}
    const url = `https://www.culturealberta.com/${c.slug}`
    const og = 'https://www.culturealberta.com/images/culture-alberta-og.jpg'
    return {
        title: c.metaTitle,
        description: c.metaDescription,
        keywords: c.keywords,
        alternates: { canonical: url },
        openGraph: {
            title: c.metaTitle,
            description: c.metaDescription,
            url,
            siteName: 'Culture Alberta',
            locale: 'en_CA',
            type: 'website',
            images: [{ url: og, width: 1200, height: 630, alt: `${c.name} - Culture Alberta` }],
        },
        twitter: {
            card: 'summary_large_image',
            title: c.metaTitle,
            description: c.metaDescription,
            site: '@culturealberta',
            images: [og],
        },
    }
}

/** Build metadata for the "all articles" sub-page. */
export function buildCityAllArticlesMetadata(slug: string): Metadata {
    const c = CITY_PAGES[slug]
    if (!c) return {}
    return {
        title: `All ${c.name} Articles | Culture Alberta`,
        description: `Browse every article about ${c.name}, Alberta — news, events, food, and culture from ${c.region}.`,
        alternates: { canonical: `https://www.culturealberta.com/${c.slug}/all-articles` },
    }
}
