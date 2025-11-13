import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { generateEnhancedMetadata } from '@/lib/seo-cursor-web'
import { Metadata } from 'next'

// Enhanced 404 page with proper SEO
export const metadata: Metadata = generateEnhancedMetadata({
  title: 'Page Not Found - 404',
  description: 'The page you are looking for could not be found. Explore our articles, events, and cultural content in Alberta.',
  path: '/404',
  keywords: ['404', 'page not found', 'Alberta culture', 'articles', 'events']
})

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Page not found
        </h1>
        <p className="text-gray-600 mb-6">
          Sorry, we couldn't find the page you're looking for. This might be due to a moved or deleted page.
        </p>
        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/">
              Go to homepage
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/articles">
              Browse articles
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/events">
              View events
            </Link>
          </Button>
        </div>
        
        {/* Helpful suggestions */}
        <div className="mt-6 text-sm text-gray-500">
          <p>Looking for something specific?</p>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            <Link href="/calgary" className="text-blue-600 hover:underline">Calgary</Link>
            <span>•</span>
            <Link href="/edmonton" className="text-blue-600 hover:underline">Edmonton</Link>
            <span>•</span>
            <Link href="/food-drink" className="text-blue-600 hover:underline">Food & Drink</Link>
            <span>•</span>
            <Link href="/culture" className="text-blue-600 hover:underline">Culture</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
