"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getEdmontonNeighborhoodBySlug } from '@/lib/data/edmonton-neighborhoods'
import { PageSEO } from '@/components/seo/page-seo'
import { ArticleContent } from '@/components/article-content'
import { Footer } from '@/components/footer'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function EdmontonNeighborhoodPage() {
  const params = useParams()
  const [neighborhood, setNeighborhood] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.slug) {
      const found = getEdmontonNeighborhoodBySlug(params.slug as string)
      setNeighborhood(found)
      setLoading(false)
    }
  }, [params.slug])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    )
  }

  if (!neighborhood) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-red-600">Neighborhood not found</h1>
          <p className="mt-4">The neighborhood you're looking for could not be found.</p>
          <Link href="/edmonton" className="text-blue-600 hover:underline mt-4 inline-block">
            ← Back to Edmonton
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <PageSEO
        title={`${neighborhood.name} - Edmonton Neighborhood Guide`}
        description={neighborhood.description}
        url={`/edmonton/neighborhoods/${neighborhood.slug}`}
        type="article"
        tags={neighborhood.tags}
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center space-x-4">
              <Link href="/edmonton" className="inline-flex items-center text-blue-600 hover:text-blue-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Edmonton
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{neighborhood.name}</h1>
                <p className="text-gray-600 mt-1">{neighborhood.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <ArticleContent content={neighborhood.content} />
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </>
  )
}
