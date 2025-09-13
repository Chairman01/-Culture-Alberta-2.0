"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Plus, Edit, Trash2, Search, RefreshCw } from "lucide-react"
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
import { getAdminArticles, deleteArticle } from "@/lib/articles"
import { getArticleUrl } from '@/lib/utils/article-url'
import { useRouter } from "next/navigation"
import { invalidateAllCaches } from "@/lib/cache-invalidation"
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
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadAllArticles()
  }, [])

  // Refresh articles when the page becomes visible (e.g., returning from creation)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page became visible, refreshing articles...')
        loadAllArticles(true) // Force refresh
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Also refresh on focus (when user returns to tab)
    const handleFocus = () => {
      console.log('🔄 Page focused, refreshing articles...')
      loadAllArticles(true) // Force refresh
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
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
      console.log('Admin: Environment check:', {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        window: typeof window !== 'undefined'
      })
      const data = await getAdminArticles(forceRefresh)
      console.log('Admin: Articles loaded:', data)
      
      // Ensure all required fields are strings
      const normalized = data.map((a) => ({
        ...a,
        category: a.category || '',
        location: a.location || '',
        type: a.type || '',
        status: a.status || '',
      }))
      console.log('Admin: Normalized articles:', normalized)
      setArticles(normalized)
    } catch (error) {
      console.error('Error loading articles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshCache = async () => {
    try {
      // Clear all caches
      invalidateAllCaches()
      
      // Reload articles
      await loadAllArticles()
      
      // Force homepage revalidation (for static generation)
      try {
        await fetch('/api/revalidate?path=/', { method: 'POST' })
        console.log('Homepage revalidation triggered')
      } catch (revalidateError) {
        console.log('Revalidation not available, cache cleared instead')
      }
      
      // Show success message
      toast({
        title: "Cache cleared",
        description: "Homepage refreshed! Changes should appear within 30 seconds.",
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
        
        // Call the delete function
        const deleteResult = await deleteArticle(article.id)
        console.log('✅ Article deleted successfully, result:', deleteResult)
        
        // Immediately remove from local state for better UX
        setArticles(prevArticles => prevArticles.filter(a => a.id !== article.id))
        
        // Show success message
        toast({
          title: "Article deleted",
          description: `"${article.title}" has been deleted successfully!`,
        })
        
        // Clear cache and reload articles to ensure consistency
        console.log('🔄 Clearing cache and reloading articles...')
        await invalidateAllCaches()
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
            onClick={handleRefreshCache}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Cache
          </Button>
          <Button 
            variant="outline" 
            onClick={async () => {
              try {
                console.log('🔄 Manual sync of articles.json...')
                await fetch('/api/sync-articles', { method: 'POST' })
                toast({
                  title: "Sync completed",
                  description: "articles.json has been synced with Supabase",
                })
              } catch (error) {
                console.error('Sync failed:', error)
                toast({
                  title: "Sync failed",
                  description: "Failed to sync articles.json with Supabase",
                  variant: "destructive",
                })
              }
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Sync Files
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
                    <td className="p-4">{formatDate(article.date)}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {article.type}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/articles/${article.id}`}>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(article)}>
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