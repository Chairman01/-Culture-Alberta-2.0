import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'All Articles | Culture Alberta',
  description: 'Browse all articles about Alberta culture, events, food, and experiences in Calgary, Edmonton, and beyond.',
  robots: 'index, follow',
  openGraph: {
    title: 'All Articles | Culture Alberta',
    description: 'Browse all articles about Alberta culture, events, food, and experiences.',
    type: 'website',
  },
}

export default function ArticlesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
