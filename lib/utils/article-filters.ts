import { Article } from '@/lib/types/article'

export function isNeighborhoodArticle(article: Article & { type?: string }): boolean {
  return !!(
    article.category?.toLowerCase().includes('neighborhood') ||
    article.category?.toLowerCase().includes('neighbourhood') ||
    article.categories?.some(cat => cat.toLowerCase().includes('neighborhood')) ||
    article.categories?.some(cat => cat.toLowerCase().includes('neighbourhood')) ||
    article.tags?.some(tag => tag.toLowerCase().includes('neighborhood')) ||
    article.tags?.some(tag => tag.toLowerCase().includes('neighbourhood')) ||
    article.title?.toLowerCase().includes('neighbourhood') ||
    article.title?.toLowerCase().includes('neighborhood')
  )
}

export function isGuideArticle(article: Article & { type?: string }): boolean {
  return !!(
    article.category?.toLowerCase().includes('guide') ||
    article.categories?.some(cat => cat.toLowerCase().includes('guide')) ||
    article.tags?.some(tag => tag.toLowerCase().includes('guide')) ||
    article.type?.toLowerCase().includes('guide')
  )
}

/** Regular articles: news, culture, events - NOT neighborhood or guide */
export function isRegularArticle(article: Article & { type?: string }): boolean {
  return !isNeighborhoodArticle(article) && !isGuideArticle(article)
}

/** City filter options for centralized neighborhoods/guides pages */
export const NEIGHBORHOOD_GUIDE_CITIES = [
  { value: '', label: 'All' },
  { value: 'edmonton', label: 'Edmonton' },
  { value: 'calgary', label: 'Calgary' },
  { value: 'red-deer', label: 'Red Deer' },
  { value: 'lethbridge', label: 'Lethbridge' },
  { value: 'medicine-hat', label: 'Medicine Hat' },
  { value: 'grande-prairie', label: 'Grande Prairie' },
  { value: 'other', label: 'Other Communities' },
] as const

/** Check if article matches city filter (location, category, tags, title) */
export function articleMatchesCity(article: Article & { location?: string }, cityValue: string): boolean {
  if (!cityValue || cityValue === '') return true

  const loc = (article.location || '').toLowerCase()
  const cat = (article.category || '').toLowerCase()
  const cats = (article.categories || []).map(c => c.toLowerCase()).join(' ')
  const tags = (article.tags || []).map(t => t.toLowerCase()).join(' ')
  const title = (article.title || '').toLowerCase()

  const check = (s: string) => loc.includes(s) || cat.includes(s) || cats.includes(s) || tags.includes(s) || title.includes(s)

  if (cityValue === 'other') {
    const majorCities = ['edmonton', 'calgary', 'red deer', 'lethbridge', 'medicine hat', 'grande prairie']
    const matchesMajor = majorCities.some(c => check(c.replace(/-/g, ' ').replace(' ', ' ')))
    return !matchesMajor
  }

  const cityMap: Record<string, string> = {
    'edmonton': 'edmonton',
    'calgary': 'calgary',
    'red-deer': 'red deer',
    'lethbridge': 'lethbridge',
    'medicine-hat': 'medicine hat',
    'grande-prairie': 'grande prairie',
  }
  const search = cityMap[cityValue] || cityValue.replace(/-/g, ' ')
  return check(search)
}

/** Get display location for an article (e.g. "Edmonton, Alberta") */
export function getArticleLocationLabel(article: Article & { location?: string }): string {
  const loc = (article.location || '').trim()
  const lower = loc.toLowerCase()
  if (lower.includes('edmonton')) return 'Edmonton, Alberta'
  if (lower.includes('calgary')) return 'Calgary, Alberta'
  if (lower.includes('red deer')) return 'Red Deer, Alberta'
  if (lower.includes('lethbridge')) return 'Lethbridge, Alberta'
  if (lower.includes('medicine hat')) return 'Medicine Hat, Alberta'
  if (lower.includes('grande prairie')) return 'Grande Prairie, Alberta'
  if (loc) return `${loc}, Alberta`
  return 'Alberta'
}
