/**
 * Which city an article belongs to, for the Calgary/Edmonton pages and the
 * homepage city spotlights.
 *
 * The editor's choice decides it: the article's category and categories. The
 * location field is used only when no city category was picked. Tags and the
 * title are deliberately ignored. They describe what a story mentions, not
 * where it belongs: "Spruce Grove Man Charged After Calgary Undercover
 * Investigation" is an Edmonton story that names Calgary, and it was landing
 * in Calgary Spotlight because "Calgary" was in its title and tags.
 */

export type ArticleCity = 'calgary' | 'edmonton'

interface CityFields {
  category?: string | null
  categories?: string[] | null
  location?: string | null
}

const CITIES: ArticleCity[] = ['calgary', 'edmonton']

function mentions(value: string | null | undefined, city: ArticleCity): boolean {
  return !!value && value.toLowerCase().includes(city)
}

/** The cities the editor assigned this article to (may be both, or neither). */
export function getArticleCities(article: CityFields): ArticleCity[] {
  const chosen = CITIES.filter(
    city => mentions(article.category, city) || (article.categories || []).some(c => mentions(c, city))
  )
  if (chosen.length > 0) return chosen
  return CITIES.filter(city => mentions(article.location, city))
}

export function isArticleInCity(article: CityFields, city: string): boolean {
  const key = city.toLowerCase()
  if (key !== 'calgary' && key !== 'edmonton') return false
  return getArticleCities(article).includes(key)
}
