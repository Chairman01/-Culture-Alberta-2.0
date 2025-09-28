export interface Article {
  id: string
  title: string
  excerpt?: string
  description?: string
  image?: string
  category: string
  location: string
  date?: string
  readTime?: string
  type?: string
  content?: string
  author?: string
  status?: string
  tags?: string[]
  rating?: number
  featured?: boolean
}

// Main categories for the website
export const MAIN_CATEGORIES = [
  "Edmonton",
  "Calgary",
  "Food & Drink",
  "Events",
  "Culture",
  "Best of Alberta",
  "Partner with us"
] as const

export type MainCategory = typeof MAIN_CATEGORIES[number]

interface SpotlightArticle {
  id: string
  title: string
  image: string
  date: string
}

interface Event {
  id: string
  title: string
  location: string
  date: string
  description: string
}

interface FoodDrinkArticle {
  id: string
  title: string
  image: string
  category: string
  date: string
}

export const latestArticles: Article[] = []

export const edmontonArticles: Article[] = []

export const calgaryArticles: Article[] = []

export const foodArticles: Article[] = []

interface TrendingPost {
  id: string
  title: string
  date: string
}

export const trendingPosts: Article[] = []

export const edmontonSpotlight: Article[] = []

export const calgarySpotlight: Article[] = []

export const upcomingEvents: Article[] = []

export const foodAndDrink: Article[] = [] 