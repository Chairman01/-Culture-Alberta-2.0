import { Article } from './types/article'
import { getAllArticles } from './supabase-articles'
import { loadOptimizedFallback } from './optimized-fallback'

/**
 * Helper function to filter articles by location/category
 * Checks location, category, categories, title, content, and tags - admin can set any of these
 */
/** Normalize categories to array (handles string/JSON from DB or fallback) */
function toCategoriesArray(val: unknown): string[] {
    if (Array.isArray(val)) return val.map((c) => String(c || '').trim()).filter(Boolean)
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val)
            return Array.isArray(parsed) ? parsed.map((c: unknown) => String(c || '').trim()).filter(Boolean) : [val.trim()].filter(Boolean)
        } catch {
            return val.trim() ? [val.trim()] : []
        }
    }
    return []
}

function filterByLocation(articles: Article[], cityName: string): Article[] {
    const cityLower = cityName.toLowerCase().replace(/-/g, ' ') // "red-deer" -> "red deer"

    return articles.filter(article => {
        const location = (article.location || '').toLowerCase().trim()
        const category = (article.category || '').toLowerCase().trim()
        const categories = toCategoriesArray(article.categories).map((c) => c.toLowerCase().trim())
        const title = (article.title || '').toLowerCase()
        const content = (article.content || '').toLowerCase()
        const tags = (article.tags || []).map((t: string) => (t || '').toLowerCase()).join(' ')

        return location.includes(cityLower) ||
            category.includes(cityLower) ||
            categories.some(c => c.includes(cityLower)) ||
            title.includes(cityLower) ||
            content.includes(cityLower) ||
            tags.includes(cityLower)
    })
}

/**
 * Helper function to exclude Calgary and Edmonton articles from Alberta page.
 * Alberta page shows: Red Deer, Lethbridge, Medicine Hat, Grande Prairie, Alberta-wide, and other communities.
 * LOCATION is primary - if location is Red Deer/Lethbridge/etc, include regardless of category (handles mis-tagged).
 */
function excludeCalgaryEdmonton(articles: Article[]): Article[] {
    const ALBERTA_COMMUNITIES = [
        'red deer', 'lethbridge', 'medicine hat', 'grande prairie',
        'fort mcmurray', 'airdrie', 'st. albert', 'spruce grove', 'stony plain', 'leduc',
        'cochrane', 'okotoks', 'canmore', 'banff', 'brooks', 'edson', 'camrose',
        'lloydminster', 'drumheller', 'jasper', 'sylvan lake'
    ]

    return articles.filter(article => {
        const location = (article.location || '').toLowerCase().trim()
        const category = (article.category || '').toLowerCase().trim()
        const categories = toCategoriesArray(article.categories).map((c) => c.toLowerCase())

        // HIGHEST PRIORITY: If article is explicitly tagged as Alberta location or category, always include it.
        // This ensures category updates in the admin (e.g. changing to Alberta) are always respected.
        if (location === 'alberta' || location.includes('alberta') ||
            category === 'alberta' || category.includes('alberta') ||
            categories.some((c: string) => c === 'alberta' || c.includes('alberta'))) {
            return true
        }

        // SECOND: Location wins for city-level. If location is an Alberta community, INCLUDE
        const hasAlbertaCommunityLocation = ALBERTA_COMMUNITIES.some(loc => location.includes(loc))
        if (hasAlbertaCommunityLocation) return true

        // Exclude if location is Edmonton or Calgary - belong on city pages only
        if (location.includes('edmonton') || location.includes('calgary')) return false

        // Exclude if category is Edmonton or Calgary
        if (category.includes('edmonton') || category.includes('calgary')) return false
        if (categories.some((c: string) => c.includes('edmonton') || c.includes('calgary'))) return false

        // Exclude if title/content/tags are primarily Edmonton or Calgary focused
        const title = article.title?.toLowerCase() || ''
        const content = article.content?.toLowerCase() || ''
        const tags = (article.tags || []).map((t: string) => t.toLowerCase())
        const tagsStr = tags.join(' ')
        const isCalgaryFocused = title.includes('calgary') || content.includes('calgary') || tagsStr.includes('calgary')
        const isEdmontonFocused = title.includes('edmonton') || content.includes('edmonton') || tagsStr.includes('edmonton')
        if (isCalgaryFocused || isEdmontonFocused) return false

        return true
    })
}

/**
 * PERFORMANCE: Fetch Alberta page data with a SINGLE Supabase request.
 * Use this for the Alberta page instead of 7 separate fetches.
 */
export async function getAlbertaPageData(): Promise<{
    allArticles: Article[]
    albertaProvinceWideArticles: Article[]
    redDeerArticles: Article[]
    lethbridgeArticles: Article[]
    medicineHatArticles: Article[]
    grandePrairieArticles: Article[]
    otherArticles: Article[]
}> {
    try {
        console.log('🔄 [FAST] Loading Alberta page data (single fetch)...')
        const albertaArticles = await getAllAlbertaArticles()

        const majorCities = ['red deer', 'lethbridge', 'medicine hat', 'grande prairie']

        // Alberta section: articles with Alberta in location, category, or categories
        // Include any article tagged Alberta (even if also tagged for a city)
        const albertaProvinceWideArticles = albertaArticles.filter(article => {
            const location = (article.location || '').toLowerCase().trim()
            const category = (article.category || '').toLowerCase().trim()
            const categories = toCategoriesArray(article.categories).map((c) => c.toLowerCase())
            return location === 'alberta' || location.includes('alberta') ||
                category === 'alberta' || category.includes('alberta') ||
                categories.some((c) => c === 'alberta' || c.includes('alberta'))
        })

        // "Other Communities" = articles that explicitly mention a smaller Alberta community.
        // Must actively reference one of the small towns — NOT just "any article that isn't a major city".
        const SMALL_ALBERTA_COMMUNITIES = [
            'fort mcmurray', 'airdrie', 'st. albert', 'spruce grove', 'stony plain', 'leduc',
            'cochrane', 'okotoks', 'canmore', 'banff', 'brooks', 'edson', 'camrose',
            'lloydminster', 'drumheller', 'jasper', 'sylvan lake', 'fort saskatchewan',
            'wetaskiwin', 'high river', 'strathmore', 'beaumont', 'hinton', 'cold lake',
            'lacombe', 'bonnyville', 'taber', 'olds', 'innisfail', 'rocky mountain house',
            'slave lake', 'peace river', 'athabasca', 'vegreville', 'ponoka',
        ]
        const otherArticles = albertaArticles.filter(article => {
            const location = article.location?.toLowerCase() || ''
            const title = article.title?.toLowerCase() || ''
            const tags = (article.tags || []).map((t: string) => t.toLowerCase()).join(' ')
            const categories = toCategoriesArray(article.categories).map((c) => c.toLowerCase()).join(' ')
            const combined = `${location} ${title} ${tags} ${categories}`
            // Must mention a small community AND must not be primarily a major-city article
            const mentionsMajorCity = majorCities.some(city => location.includes(city) || title.includes(city))
            const mentionsSmallCommunity = SMALL_ALBERTA_COMMUNITIES.some(c => combined.includes(c))
            return mentionsSmallCommunity && !mentionsMajorCity
        })

        return {
            allArticles: albertaArticles,
            albertaProvinceWideArticles,
            redDeerArticles: filterByLocation(albertaArticles, 'red deer'),
            lethbridgeArticles: filterByLocation(albertaArticles, 'lethbridge'),
            medicineHatArticles: filterByLocation(albertaArticles, 'medicine hat'),
            grandePrairieArticles: filterByLocation(albertaArticles, 'grande prairie'),
            otherArticles,
        }
    } catch (error) {
        console.error('❌ Failed to load Alberta page data:', error)
        return {
            allArticles: [],
            albertaProvinceWideArticles: [],
            redDeerArticles: [],
            lethbridgeArticles: [],
            medicineHatArticles: [],
            grandePrairieArticles: [],
            otherArticles: [],
        }
    }
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
 * Get Alberta category articles - any article with Alberta in location, category, or categories
 */
export async function getAlbertaProvinceWideArticles(): Promise<Article[]> {
    try {
        console.log('🔄 Loading Alberta category articles...')
        const albertaArticles = await getAllAlbertaArticles()

        const provinceWide = albertaArticles.filter(article => {
            const location = (article.location || '').toLowerCase().trim()
            const category = (article.category || '').toLowerCase().trim()
            const categories = toCategoriesArray(article.categories).map((c) => c.toLowerCase())
            return location === 'alberta' || location.includes('alberta') ||
                category === 'alberta' || category.includes('alberta') ||
                categories.some((c) => c === 'alberta' || c.includes('alberta'))
        })

        console.log(`✅ Found ${provinceWide.length} Alberta category articles`)
        return provinceWide
    } catch (error) {
        console.error('❌ Failed to load province-wide Alberta articles:', error)
        return []
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

        const majorCities = ['red deer', 'lethbridge', 'medicine hat', 'grande prairie']
        const SMALL_ALBERTA_COMMUNITIES = [
            'fort mcmurray', 'airdrie', 'st. albert', 'spruce grove', 'stony plain', 'leduc',
            'cochrane', 'okotoks', 'canmore', 'banff', 'brooks', 'edson', 'camrose',
            'lloydminster', 'drumheller', 'jasper', 'sylvan lake', 'fort saskatchewan',
            'wetaskiwin', 'high river', 'strathmore', 'beaumont', 'hinton', 'cold lake',
            'lacombe', 'bonnyville', 'taber', 'olds', 'innisfail', 'rocky mountain house',
            'slave lake', 'peace river', 'athabasca', 'vegreville', 'ponoka',
        ]
        const otherArticles = albertaArticles.filter(article => {
            const location = article.location?.toLowerCase() || ''
            const title = article.title?.toLowerCase() || ''
            const tags = (article.tags || []).map((t: string) => t.toLowerCase()).join(' ')
            const categories = toCategoriesArray(article.categories).map((c) => c.toLowerCase()).join(' ')
            const combined = `${location} ${title} ${tags} ${categories}`
            const mentionsMajorCity = majorCities.some(city => location.includes(city) || title.includes(city))
            const mentionsSmallCommunity = SMALL_ALBERTA_COMMUNITIES.some(c => combined.includes(c))
            return mentionsSmallCommunity && !mentionsMajorCity
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
