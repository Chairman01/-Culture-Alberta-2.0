"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  CheckCircle2,
  Trash2,
  Edit,
  Loader2,
  Inbox,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  MapPin,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { sanitizeAdminHtml } from "@/lib/sanitize-html"

interface PendingArticle {
  id: string
  title: string
  excerpt: string
  author: string
  category: string
  categories: string[]
  location: string
  imageUrl: string
  slug: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export default function ReviewQueue() {
  const [articles, setArticles] = useState<PendingArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PendingArticle | null>(null)
  const { toast } = useToast()

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true)
    try {
      const res = await fetch("/api/admin/review")
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const data = await res.json()
      setArticles(data.articles || [])
    } catch (error) {
      console.error("Failed to load review queue:", error)
      toast({
        title: "Could not load the queue",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const formatDate = (value: string) => {
    if (!value) return "Unknown date"
    const date = new Date(value)
    if (isNaN(date.getTime())) return value
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  // The queue list omits `content` to stay fast, so the body is fetched only
  // when an editor actually opens a draft to read it.
  const toggleExpand = async (article: PendingArticle) => {
    if (expandedId === article.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(article.id)
    if (previews[article.id] !== undefined) return

    setLoadingPreview(article.id)
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`)
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const data = await res.json()
      // Contributor HTML is already scrubbed on write, but drafts created
      // before that landed are not — never render an unreviewed body raw into
      // the admin's own session.
      setPreviews((prev) => ({
        ...prev,
        [article.id]: sanitizeAdminHtml(data.content || ""),
      }))
    } catch (error) {
      console.error("Failed to load article body:", error)
      setPreviews((prev) => ({ ...prev, [article.id]: "" }))
      toast({
        title: "Could not load the article body",
        description: "Open it in the editor instead.",
        variant: "destructive",
      })
    } finally {
      setLoadingPreview(null)
    }
  }

  const approve = async (article: PendingArticle) => {
    setBusyId(article.id)
    try {
      const res = await fetch(`/api/admin/articles/${article.id}/publish`, {
        method: "PATCH",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      setArticles((prev) => prev.filter((a) => a.id !== article.id))
      toast({
        title: "Approved and published",
        description: `“${article.title}” is now live and listed under Articles.`,
      })
    } catch (error) {
      toast({
        title: "Approval failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
    }
  }

  const reject = async (article: PendingArticle) => {
    setBusyId(article.id)
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      setArticles((prev) => prev.filter((a) => a.id !== article.id))
      toast({
        title: "Draft rejected",
        description: `“${article.title}” has been deleted.`,
      })
    } catch (error) {
      toast({
        title: "Could not reject the draft",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setBusyId(null)
      setRejectTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Review Queue</h1>
          <p className="text-gray-500 mt-1">
            Drafts waiting for your approval. Approving one publishes it and moves
            it into Articles.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && articles.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {articles.length} pending
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => load()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-3" />
          Loading the queue...
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-20 text-center">
          <Inbox className="h-10 w-10 mx-auto text-gray-400 mb-3" />
          <h2 className="text-lg font-semibold">Nothing waiting for review</h2>
          <p className="text-gray-500 mt-1">
            New drafts submitted by contributors will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => {
            const isBusy = busyId === article.id
            const isExpanded = expandedId === article.id

            return (
              <div
                key={article.id}
                className="rounded-lg border border-gray-200 bg-white overflow-hidden"
              >
                <div className="p-4 flex gap-4">
                  {article.imageUrl ? (
                    <div className="relative h-24 w-32 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                      <Image
                        src={article.imageUrl}
                        alt=""
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-24 w-32 flex-shrink-0 rounded-md bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                      No image
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-semibold text-lg leading-snug">
                        {article.title}
                      </h2>
                      <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 flex-shrink-0">
                        Draft
                      </Badge>
                    </div>

                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {article.author}
                      </span>
                      {article.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {article.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(article.createdAt)}
                      </span>
                      {article.category && (
                        <Badge variant="outline" className="font-normal">
                          {article.category}
                        </Badge>
                      )}
                    </div>

                    {article.excerpt && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}

                    <div className="flex items-center flex-wrap gap-2 mt-4">
                      <Button
                        size="sm"
                        onClick={() => approve(article)}
                        disabled={isBusy}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isBusy ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Approve &amp; Publish
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleExpand(article)}
                        disabled={isBusy}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 mr-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 mr-2" />
                        )}
                        {isExpanded ? "Hide" : "Read"}
                      </Button>

                      <Link href={`/admin/articles/${article.id}`}>
                        <Button size="sm" variant="outline" disabled={isBusy}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </Link>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectTarget(article)}
                        disabled={isBusy}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 px-4 py-4">
                    {loadingPreview === article.id ? (
                      <div className="flex items-center text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading article...
                      </div>
                    ) : previews[article.id] ? (
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: previews[article.id] }}
                      />
                    ) : (
                      <p className="text-sm text-gray-500">
                        No content to show. Open it in the editor.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <AlertDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              “{rejectTarget?.title}” will be permanently deleted. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => rejectTarget && reject(rejectTarget)}
            >
              Delete draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
