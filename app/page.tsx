import { Metadata } from 'next'
import { getAllArticles } from '@/lib/articles'
import { Article } from '@/lib/types/article'
import HomePageClient from './page-client'

export const metadata: Metadata = {
  title: 'Culture Alberta - Discover Alberta\'s Culture, Events & Experiences',
  description: 'Discover the best of Alberta\'s culture, events, food, and experiences. Your guide to Edmonton, Calgary, and beyond.',
  keywords: 'Alberta, culture, events, Edmonton, Calgary, food, arts, festivals, tourism',
  authors: [{ name: 'Culture Alberta' }],
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    url: 'https://www.culturealberta.com/',
    title: 'Culture Alberta - Discover Alberta\'s Culture, Events & Experiences',
    description: 'Discover the best of Alberta\'s culture, events, food, and experiences. Your guide to Edmonton, Calgary, and beyond.',
    siteName: 'Culture Alberta',
    images: [
      {
        url: 'https://www.culturealberta.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Culture Alberta',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Culture Alberta - Discover Alberta\'s Culture, Events & Experiences',
    description: 'Discover the best of Alberta\'s culture, events, food, and experiences. Your guide to Edmonton, Calgary, and beyond.',
    images: ['https://www.culturealberta.com/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://www.culturealberta.com/',
  },
}

export default async function Home() {
  // Fetch data server-side for better SEO
  let posts: Article[] = []
  let events: Article[] = []
  
  try {
    const allArticles = await getAllArticles()
    
    // Separate events from regular articles
    posts = allArticles.filter(post => post.type !== 'event')
    events = allArticles.filter(post => post.type === 'event')
  } catch (error) {
    console.error("Error loading posts:", error)
    // Fallback to empty arrays if data loading fails
    posts = []
    events = []
  }

  return <HomePageClient initialPosts={posts} initialEvents={events} />
}
