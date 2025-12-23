'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Calendar, MapPin, Users, Sparkles, Palette, Music, Theater, Landmark, Heart, Globe, Award } from 'lucide-react'
import { Article } from '@/lib/types/article'
import { getArticleUrl } from '@/lib/utils/article-url'

interface CultureArticlesProps {
    articles: Article[]
}

type FilterType = 'all' | 'calgary' | 'edmonton'

export function CultureArticles({ articles }: CultureArticlesProps) {
    const [filter, setFilter] = useState<FilterType>('all')

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString)
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })
        } catch {
            return 'Recently'
        }
    }

    const getCategoryIcon = (category: string) => {
        const cat = category.toLowerCase()
        if (cat.includes('art') || cat.includes('painting') || cat.includes('sculpture')) return Palette
        if (cat.includes('music') || cat.includes('concert') || cat.includes('festival')) return Music
        if (cat.includes('theater') || cat.includes('drama') || cat.includes('performance')) return Theater
        if (cat.includes('museum') || cat.includes('gallery') || cat.includes('exhibition')) return Landmark
        if (cat.includes('heritage') || cat.includes('indigenous') || cat.includes('tradition')) return Globe
        if (cat.includes('community') || cat.includes('local')) return Heart
        if (cat.includes('award') || cat.includes('recognition')) return Award
        return Sparkles
    }

    // Filter articles based on selected filter
    const filteredArticles = articles.filter((article) => {
        if (filter === 'all') return true

        const location = (article.location || '').toLowerCase()
        const title = (article.title || '').toLowerCase()
        const category = (article.category || '').toLowerCase()
        const categories = (article.categories || []).join(' ').toLowerCase()

        if (filter === 'calgary') {
            return location.includes('calgary') ||
                title.includes('calgary') ||
                category.includes('calgary') ||
                categories.includes('calgary')
        }

        if (filter === 'edmonton') {
            return location.includes('edmonton') ||
                title.includes('edmonton') ||
                category.includes('edmonton') ||
                categories.includes('edmonton')
        }

        return true
    })

    return (
        <>
            {/* Category Filter Buttons */}
            <section className="py-8 bg-gray-50 border-b border-gray-200">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Explore by Category</h2>
                        <p className="text-gray-600 text-sm">Discover stories that resonate with your interests</p>
                    </div>

                    <div className="flex flex-wrap gap-3 justify-center">
                        {/* All Stories */}
                        <button
                            onClick={() => setFilter('all')}
                            className={`group flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${filter === 'all'
                                ? 'bg-gray-900 text-white border border-gray-900'
                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                        >
                            <Sparkles className="w-4 h-4" />
                            All Stories
                        </button>

                        {/* Calgary */}
                        <button
                            onClick={() => setFilter('calgary')}
                            className={`group flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${filter === 'calgary'
                                ? 'bg-gray-900 text-white border border-gray-900'
                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                        >
                            <Sparkles className={`w-4 h-4 ${filter === 'calgary' ? '' : 'text-gray-600'}`} />
                            Calgary
                        </button>

                        {/* Edmonton */}
                        <button
                            onClick={() => setFilter('edmonton')}
                            className={`group flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${filter === 'edmonton'
                                ? 'bg-gray-900 text-white border border-gray-900'
                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                }`}
                        >
                            <Sparkles className={`w-4 h-4 ${filter === 'edmonton' ? '' : 'text-gray-600'}`} />
                            Edmonton
                        </button>
                    </div>
                </div>
            </section>

            {/* Main Content Section - 2/3 Articles, 1/3 Sidebar */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12">
                        {/* Articles Grid */}
                        <div className="space-y-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                                        {filter === 'all' ? 'All Cultural Stories' :
                                            filter === 'calgary' ? 'Calgary Cultural Stories' :
                                                'Edmonton Cultural Stories'}
                                    </h2>
                                    <p className="text-gray-600 text-sm">
                                        {filteredArticles.length} stories to explore
                                    </p>
                                </div>
                                <div className="bg-gray-100 px-3 py-1 rounded-full">
                                    <span className="text-gray-700 font-medium text-sm">
                                        {filteredArticles.length} articles
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {filteredArticles.map((article) => {
                                    const IconComponent = getCategoryIcon(article.category || '')
                                    return (
                                        <Link key={article.id} href={getArticleUrl(article)} className="group block">
                                            <article className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                                                    <div className="md:col-span-1 relative aspect-[4/3] overflow-hidden">
                                                        <Image
                                                            src={article.imageUrl || "/placeholder.svg"}
                                                            alt={article.title}
                                                            fill
                                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    </div>
                                                    <div className="md:col-span-2 p-8 space-y-4">
                                                        <div className="flex items-center gap-4 text-sm">
                                                            <span className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2">
                                                                <IconComponent className="w-3 h-3" />
                                                                {article.category}
                                                            </span>
                                                            <span className="flex items-center gap-2 text-gray-500">
                                                                <Calendar className="w-4 h-4" />
                                                                {formatDate(article.date || '')}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors leading-tight">
                                                            {article.title}
                                                        </h3>
                                                        <p className="text-gray-600 leading-relaxed line-clamp-3">
                                                            {article.excerpt}
                                                        </p>
                                                        <div className="flex items-center gap-6 text-sm text-gray-500">
                                                            {article.author && (
                                                                <span className="flex items-center gap-2">
                                                                    <Users className="w-4 h-4" />
                                                                    {article.author}
                                                                </span>
                                                            )}
                                                            {article.location && (
                                                                <span className="flex items-center gap-2">
                                                                    <MapPin className="w-4 h-4" />
                                                                    {article.location}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="pt-4">
                                                            <span className="inline-flex items-center text-purple-600 font-semibold group-hover:text-purple-700 transition-colors">
                                                                Read Story
                                                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </article>
                                        </Link>
                                    )
                                })}
                            </div>

                            {filteredArticles.length === 0 && (
                                <div className="text-center py-16">
                                    <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Sparkles className="w-12 h-12 text-purple-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                        No {filter === 'all' ? '' : filter.charAt(0).toUpperCase() + filter.slice(1)} stories found
                                    </h3>
                                    <p className="text-gray-600 max-w-md mx-auto">
                                        {filter !== 'all'
                                            ? `We don't have any ${filter.charAt(0).toUpperCase() + filter.slice(1)} stories yet. Check back soon or view all stories!`
                                            : "We're working on bringing you more amazing cultural stories. Check back soon!"}
                                    </p>
                                    {filter !== 'all' && (
                                        <button
                                            onClick={() => setFilter('all')}
                                            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
                                        >
                                            View All Stories
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Sidebar - stays on right side like original */}
                        <div className="space-y-6">
                            {/* Stay Connected Newsletter */}
                            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                <div className="text-center mb-4">
                                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Heart className="w-6 h-6 text-gray-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Stay Connected</h3>
                                    <p className="text-gray-600 text-sm">
                                        Get the latest cultural events and community stories delivered to your inbox.
                                    </p>
                                </div>
                            </div>

                            {/* Recent Stories */}
                            <div className="bg-white rounded-lg p-6 border border-gray-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-gray-600" />
                                    Recent Stories
                                </h3>
                                <div className="space-y-4">
                                    {articles.slice(0, 4).map((article) => {
                                        const IconComponent = getCategoryIcon(article.category || '')
                                        return (
                                            <Link
                                                key={article.id}
                                                href={getArticleUrl(article)}
                                                className="block group"
                                            >
                                                <div className="flex gap-3">
                                                    <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden">
                                                        <Image
                                                            src={article.imageUrl || "/placeholder.svg"}
                                                            alt={article.title}
                                                            fill
                                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <IconComponent className="w-3 h-3 text-gray-500" />
                                                            <span className="text-xs text-gray-600 font-medium">{article.category}</span>
                                                        </div>
                                                        <h4 className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 transition-colors line-clamp-2 leading-tight">
                                                            {article.title}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {formatDate(article.date || '')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Quote */}
                            <div className="bg-gray-900 rounded-lg p-6 text-white text-center">
                                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <blockquote className="text-sm font-medium mb-2">
                                    "Culture is the widening of the mind and of the spirit."
                                </blockquote>
                                <p className="text-gray-300 text-xs">— Jawaharlal Nehru</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}
