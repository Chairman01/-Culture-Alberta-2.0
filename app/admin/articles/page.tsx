"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Plus, Edit, Trash2, Search, RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  latestArticles,
  edmontonArticles,
  calgaryArticles,
  foodArticles,
  edmontonSpotlight,
  calgarySpotlight,
  foodAndDrink,
  trendingPosts,
  upcomingEvents,
  Article,
  MAIN_CATEGORIES
} from "@/lib/data"
import { validateArticleContent, getContentQualityScore, getContentQualityLabel } from "@/lib/content-validation"
import { getArticleUrl } from '@/lib/utils/article-url'
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface ExtendedArticle extends Article {
  type?: string;
  content?: string;
  author?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Define a more complete article type
interface AdminArticle extends Article {
  updatedAt?: string
}

// Remove all the sample articles and article arrays
const defaultArticles: AdminArticle[] = []

export default function AdminArticles() {
  const [articles, setArticles] = useState<ExtendedArticle[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [category, setCategory] = useState("all")
  const [location, setLocation] = useState("all")
  const [sortBy, setSortBy] = useState("newest") // newest, oldest, title
  const [isLoading, setIsLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadAllArticles()
  }, [])

  // Refresh when page becomes visible (e.g., after creating a new article)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page became visible, refreshing articles to check for new content...')
        loadAllArticles(true) // Force refresh to get any new articles
      }
    }

    // Only listen to visibility change, not focus (to avoid refresh when using Ctrl+F)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'No date'
    // Handle relative date formats
    if (dateString.includes('ago')) return dateString
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const loadAllArticles = async (forceRefresh: boolean = false) => {
    setIsLoading(true)
    try {
      console.log('Admin: Loading articles...', forceRefresh ? '(force refresh)' : '')

      const url = forceRefresh ? '/api/admin/articles?refresh=true' : '/api/admin/articles'
      const response = await fetch(url)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Admin: API error response:', errorText)
        throw new Error(`API responded with status: ${response.status}`)
      }
      const data = await response.json()
      console.log('Admin: Articles loaded:', data)

      // Ensure all required fields are strings
      const normalized = data.map((a: any) => ({
        ...a,
        category: a.category || '',
        location: a.location || '',
        type: a.type || '',
        status: a.status || '',
      }))
      console.log('Admin: Normalized articles:', normalized)
      setArticles(normalized)

      // Only show success message for force refresh
      if (forceRefresh && normalized.length > 0) {
        toast({
          title: "Articles refreshed",
          description: `Successfully loaded ${normalized.length} articles`,
        })
      }
    } catch (error) {
      console.error('Error loading articles:', error)
      toast({
        title: "Error loading articles",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshCache = async () => {
    try {
      // Reload articles (cache invalidation handled server-side)
      await loadAllArticles()

      // Force revalidation of all major pages
      try {
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paths: ['/', '/edmonton', '/calgary', '/culture', '/food-drink', '/events']
          })
        })
        console.log('All pages revalidation triggered')
      } catch (revalidateError) {
        console.log('Revalidation not available, cache cleared instead')
      }

      // Show success message
      toast({
        title: "Cache cleared",
        description: "All pages refreshed! Changes should appear within 30 seconds.",
      })
    } catch (error) {
      console.error('Error refreshing cache:', error)
      toast({
        title: "Error refreshing cache",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  // Auto-sync function
  const handleAutoSync = async () => {
    try {
      setSyncing(true)
      console.log('🔄 Admin: Starting auto-sync...')

      // Try the optimized sync endpoint first
      const response = await fetch('/api/sync-articles-optimized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (result.success) {
        setLastSync(new Date())
        toast({
          title: "Sync Complete",
          description: `Successfully synced articles`,
        })
        // Reload articles to show updated content
        await loadAllArticles(true)
      } else {
        throw new Error(result.error || 'Sync failed')
      }
    } catch (error) {
      console.error('❌ Auto-sync failed:', error)
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : 'Failed to sync articles',
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleEdit = (article: ExtendedArticle) => {
    try {
      // Instead of storing the entire article, just store the ID and navigate
      // The edit page will fetch the article data fresh
      router.push(`/admin/articles/${article.id}`)
    } catch (error) {
      console.error('Error navigating to edit page:', error)
    }
  }

  const handleDelete = async (article: ExtendedArticle) => {
    if (confirm('Are you sure you want to delete this article?')) {
      try {
        console.log('🗑️ Deleting article:', {
          id: article.id,
          title: article.title,
          type: typeof article.id,
          idLength: article.id?.length,
          fullArticle: article
        })
        console.log('🗑️ Environment during delete:', {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL: process.env.VERCEL,
          window: typeof window !== 'undefined'
        })

        // Call the delete function via API (Supabase + fallback)
        const deleteResponse = await fetch(`/api/admin/articles/${article.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!deleteResponse.ok) {
          throw new Error('Failed to delete article')
        }

        const deleteResult = await deleteResponse.json()
        console.log('✅ Article deleted successfully, result:', deleteResult)

        // Immediately remove from local state for better UX
        setArticles(prevArticles => prevArticles.filter(a => a.id !== article.id))

        // Show success message
        toast({
          title: "Article deleted",
          description: `"${article.title}" has been deleted successfully!`,
        })

        // Trigger page revalidation so lists/homepage update quickly
        try {
          await fetch('/api/revalidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paths: ['/', '/articles', '/edmonton', '/calgary', '/events']
            })
          })
        } catch (e) {
          console.log('Revalidation not available during development')
        }

        // Reload articles to ensure consistency
        console.log('🔄 Reloading articles...')
        await loadAllArticles(true) // Force refresh to get latest data

      } catch (error) {
        console.error('❌ Error deleting article:', error)
        console.error('❌ Full error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack',
          error: error
        })
        toast({
          title: "Error deleting article",
          description: `Failed to delete "${article.title}". ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive",
        })

        // If deletion failed, reload the articles to get the current state
        await loadAllArticles(true) // Force refresh to get latest data
      }
    }
  }

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = category === "all" || article.category === category
    const matchesLocation = location === "all" || article.location === location
    return matchesSearch && matchesCategory && matchesLocation
  }).sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.date || b.createdAt || b.updatedAt || 0).getTime() - new Date(a.date || a.createdAt || a.updatedAt || 0).getTime()
      case "oldest":
        return new Date(a.date || a.createdAt || a.updatedAt || 0).getTime() - new Date(b.date || b.createdAt || b.updatedAt || 0).getTime()
      case "title":
        return a.title.localeCompare(b.title)
      default:
        return 0
    }
  })

  const categories = Array.from(new Set(articles.map(a => a.category).filter(cat => cat && cat.trim() !== '')))
  const locations = Array.from(new Set(articles.map(a => a.location).filter(loc => loc && loc.trim() !== '')))

  const getArticleKey = (article: ExtendedArticle) => {
    // Create a unique key using article id and type
    const prefix = article.type?.toLowerCase() === 'post' ? 'post' : 'article'
    return `${prefix}-${article.id}`
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Articles</h1>
          <p className="text-gray-500 mt-1">Total: {filteredArticles.length} articles</p>
          {lastSync && (
            <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
              <CheckCircle className="w-4 h-4" />
              Last synced: {lastSync.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => loadAllArticles(true)}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              console.log('🔄 Force refreshing from Supabase...')
              loadAllArticles(true)
            }}
            disabled={isLoading}
            className="flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Force Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleAutoSync}
            disabled={syncing}
            className="flex items-center gap-2"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {syncing ? 'Syncing...' : 'Auto Sync'}
          </Button>
          <Button
            variant="outline"
            onClick={handleRefreshCache}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Cache
          </Button>
          <Link href="/admin/articles/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Article
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map(loc => (
              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="title">Title A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4">Title</th>
                <th className="text-left p-4">Category</th>
                <th className="text-left p-4">Location</th>
                <th className="text-left p-4">Content Quality</th>
                <th className="text-left p-4">Date</th>
                <th className="text-left p-4">Type</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.length > 0 ? (
                filteredArticles.map((article, index) => (
                  <tr key={`${getArticleKey(article)}-${index}`} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 relative rounded overflow-hidden">
                          <img
                            src={article.image || "/placeholder.svg"}
                            alt={article.title}
                            className="object-cover w-full h-full"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement
                              img.src = `/placeholder.svg?text=${encodeURIComponent(article.title)}`
                            }}
                          />
                        </div>
                        <div>
                          <div className="font-medium">{article.title}</div>
                          <div className="text-sm text-gray-500 truncate max-w-md">
                            {article.excerpt || article.description || 'No excerpt available'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {article.category}
                      </span>
                    </td>
                    <td className="p-4">{article.location}</td>
                    <td className="p-4">
                      {(() => {
                        // Ensure required fields exist for validation
                        const articleForValidation = {
                          title: article.title || '',
                          content: article.content || '',
                          excerpt: article.excerpt || '',
                          category: article.category || ''
                        }
                        const validation = validateArticleContent(articleForValidation)
                        const score = getContentQualityScore(articleForValidation)
                        const label = getContentQualityLabel(score)
                        const hasIssues = validation.issues.length > 0
                        const hasWarnings = validation.warnings.length > 0

                        let bgColor = 'bg-green-100 text-green-800'
                        if (hasIssues) {
                          bgColor = 'bg-red-100 text-red-800'
                        } else if (hasWarnings) {
                          bgColor = 'bg-yellow-100 text-yellow-800'
                        } else if (score < 60) {
                          bgColor = 'bg-orange-100 text-orange-800'
                        }

                        return (
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}>
                              {label} ({score}%)
                            </span>
                            {hasIssues && (
                              <span className="text-xs text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {validation.issues.length} issue{validation.issues.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {!hasIssues && hasWarnings && (
                              <span className="text-xs text-yellow-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="p-4">{formatDate(article.date)}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {article.type}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/articles/${article.id}`}>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(article)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-foreground">
                    No articles found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 