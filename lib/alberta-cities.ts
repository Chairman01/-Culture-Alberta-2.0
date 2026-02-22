import { Article } from './types/article'
import { getAllArticles } from './supabase-articles'
import { loadOptimizedFallback } from './optimized-fallback'

/**
 * Helper function to filter articles by location
 * Checks location, title, content, and tags for city mentions
 */
function filterByLocation(articles: Article[], cityName: string): Article[] {
    const cityLower = cityName.toLowerCase()

    return articles.filter(article => {
        const location = article.location?.toLowerCase() || ''
        const title = article.title?.toLowerCase() || ''
        const content = article.content?.toLowerCase() || ''
        const tags = article.tags?.map(t => t.toLowerCase()).join(' ') || ''

        return location.includes(cityLower) ||
            title.includes(cityLower) ||
            content.includes(cityLower) ||
            tags.includes(cityLower)
    })
}

/**
 * Helper function to exclude Calgary and Edmonton articles
 * Uses location as primary filter - if location is an Alberta community (Red Deer, Lethbridge, etc), include it.
 * Only exclude when location is explicitly Calgary/Edmonton, or when no Alberta location but content is Calgary/Edmonton-focused.
 */
function excludeCalgaryEdmonton(articles: Article[]): Article[] {
    const ALBERTA_LOCATIONS = [
        'red deer', 'lethbridge', 'medicine hat', 'grande prairie',
        'fort mcmurray', 'airdrie', 'st. albert', 'spruce grove', 'stony plain', 'leduc',
        'cochrane', 'okotoks', 'canmore', 'banff', 'brooks', 'edson', 'camrose',
        'lloydminster', 'drumheller', 'jasper', 'sylvan lake', 'alberta'
    ]

    return articles.filter(article => {
        const location = (article.location || '').toLowerCase().trim()
        const title = article.title?.toLowerCase() || ''
        const content = article.content?.toLowerCase() || ''
        const tags = article.tags?.map(t => t.toLowerCase()).join(' ') || ''

        // Include if location is an Alberta community (outside Calgary/Edmonton)
        const hasAlbertaLocation = ALBERTA_LOCATIONS.some(loc => location.includes(loc))
        if (hasAlbertaLocation) return true

        // Exclude if location is explicitly Calgary or Edmonton
        if (location.includes('calgary') || location.includes('edmonton')) return false

        // Exclude if title/content/tags are Calgary or Edmonton focused (and no Alberta location)
        const isCalgary = title.includes('calgary') || content.includes('calgary') || tags.includes('calgary')
        const isEdmonton = title.includes('edmonton') || content.includes('edmonton') || tags.includes('edmonton')
        if (isCalgary || isEdmonton) return false

        return true
    })
}

/**
 * Get all articles from Alberta cities (excluding Calgary and Edmonton)
 */
export async function getAllAlbertaArticles(): Promise<Article[]> {
    try {
        console.log('🔄 Loading all Alberta articles (excluding Calgary/Edmonton)...')

        // Try Supabase first
        const allArticles = await getAllArticles()
        const albertaArticles = excludeCalgaryEdmonton(allArticles)

        console.log(`✅ Loaded ${albertaArticles.length} Alberta articles from Supabase`)
        return albertaArticles
    } catch (error) {
        console.warn('⚠️ Supabase failed, using fallback:', error)

        // Fallback to optimized JSON
        const fallbackArticles = await loadOptimizedFallback()
        const albertaArticles = excludeCalgaryEdmonton(fallbackArticles)

        console.log(`⚡ FALLBACK: Loaded ${albertaArticles.length} Alberta articles`)
        return albertaArticles
    }
}

/**
 * Get Red Deer articles
 */
export async function getRedDeerArticles(): Promise<Article[]> {
    try {
        console.log('🔄 Loading Red Deer articles...')
        const albertaArticles = await getAllAlbertaArticles()
        const redDeerArticles = filterByLocation(albertaArticles, 'red deer')

        console.log(`✅ Found ${redDeerArticles.length} Red Deer articles`)
        return redDeerArticles
    } catch (error) {
        console.error('❌ Failed to load Red Deer articles:', error)
        return []
    }
}

/**
 * Get Lethbridge articles
 */
export async function getLethbridgeArticles(): Promise<Article[]> {
    try {
        console.log('🔄 Loading Lethbridge articles...')
        const albertaArticles = await getAllAlbertaArticles()
        const lethbridgeArticles = filterByLocation(albertaArticles, 'lethbridge')

        console.log(`✅ Found ${lethbridgeArticles.length} Lethbridge articles`)
        return lethbridgeArticles
    } catch (error) {
        console.error('❌ Failed to load Lethbridge articles:', error)
        return []
    }
}

/**
 * Get Medicine Hat articles
 */
export async function getMedicineHatArticles(): Promise<Article[]> {
    try {
        console.log('🔄 Loading Medicine Hat articles...')
        const albertaArticles = await getAllAlbertaArticles()
        const medicineHatArticles = filterByLocation(albertaArticles, 'medicine hat')

        console.log(`✅ Found ${medicineHatArticles.length} Medicine Hat articles`)
        return medicineHatArticles
    } catch (error) {
        console.error('❌ Failed to load Medicine Hat articles:', error)
        return []
    }
}

/**
 * Get Grande Prairie articles
 */
export async function getGrandePrairieArticles(): Promise<Article[]> {
    try {
        console.log('🔄 Loading Grande Prairie articles...')
        const albertaArticles = await getAllAlbertaArticles()
        const grandePrairieArticles = filterByLocation(albertaArticles, 'grande prairie')

        console.log(`✅ Found ${grandePrairieArticles.length} Grande Prairie articles`)
        return grandePrairieArticles
    } catch (error) {
        console.error('❌ Failed to load Grande Prairie articles:', error)
        return []
    }
}

/**
 * Get articles from other Alberta communities
 * (excluding the 4 major cities: Red Deer, Lethbridge, Medicine Hat, Grande Prairie)
 */
export async function getOtherCommunitiesArticles(): Promise<Article[]> {
    try {
        console.log('🔄 Loading Other Communities articles...')
        const albertaArticles = await getAllAlbertaArticles()

        // Exclude the 4 major cities
        const majorCities = ['red deer', 'lethbridge', 'medicine hat', 'grande prairie']
        const otherArticles = albertaArticles.filter(article => {
            const location = article.location?.toLowerCase() || ''
            const title = article.title?.toLowerCase() || ''
            const content = article.content?.toLowerCase() || ''

            // Check if article mentions any major city
            const mentionsMajorCity = majorCities.some(city =>
                location.includes(city) || title.includes(city) || content.includes(city)
            )

            return !mentionsMajorCity
        })

        console.log(`✅ Found ${otherArticles.length} Other Communities articles`)
        return otherArticles
    } catch (error) {
        console.error('❌ Failed to load Other Communities articles:', error)
        return []
    }
}

/**
 * List of smaller Alberta communities for filtering
 */
export const SMALL_COMMUNITIES = [
    'Fort McMurray',
    'Airdrie',
    'St. Albert',
    'Spruce Grove',
    'Leduc',
    'Cochrane',
    'Okotoks',
    'Canmore',
    'Brooks',
    'Edson',
    'Camrose',
    'Lloydminster',
    'Drumheller',
    'Jasper',
    'Banff',
    'Stony Plain',
    'Fort Saskatchewan',
    'Wetaskiwin',
    'High River',
    'Strathmore',
    'Sylvan Lake',
    'Beaumont',
    'Hinton',
    'Cold Lake',
    'Lacombe',
]
