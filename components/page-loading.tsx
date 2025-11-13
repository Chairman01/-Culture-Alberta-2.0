"use client"

import { LoadingSpinner, ArticleCardSkeleton, LoadingDots } from './loading-spinner'

// Homepage loading skeleton
export function HomepageLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex items-center space-x-4">
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section Skeleton */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-6">
            <div className="h-12 w-96 bg-gray-200 rounded animate-pulse mx-auto"></div>
            <div className="h-6 w-80 bg-gray-200 rounded animate-pulse mx-auto"></div>
            <div className="flex justify-center">
              <LoadingDots />
            </div>
          </div>
        </div>
      </div>

      {/* Featured Articles Skeleton */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// City page loading skeleton
export function CityPageLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with loading indicator */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
            <LoadingDots />
          </div>
        </div>
      </div>

      {/* City Hero Skeleton */}
      <div className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4">
            <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mx-auto"></div>
            <div className="h-6 w-96 bg-gray-200 rounded animate-pulse mx-auto"></div>
          </div>
        </div>
      </div>

      {/* Articles Grid Skeleton */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Events page loading skeleton
export function EventsPageLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
            <LoadingDots />
          </div>
        </div>
      </div>

      {/* Events Hero */}
      <div className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4">
            <div className="h-10 w-48 bg-gray-200 rounded animate-pulse mx-auto"></div>
            <div className="h-6 w-80 bg-gray-200 rounded animate-pulse mx-auto"></div>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Generic page loading
export function GenericPageLoading({ title = "Loading..." }: { title?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="xl" text={title} />
      </div>
    </div>
  )
}
