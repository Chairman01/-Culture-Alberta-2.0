"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Upload } from "lucide-react"
// Removed direct import - using API instead
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ImageUploader } from "@/app/admin/components/image-uploader"
import { RichTextEditor } from "@/app/admin/components/rich-text-editor"
import { useToast } from "@/hooks/use-toast"

export default function NewPostPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [readTime, setReadTime] = useState("5")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState("")
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [showImageUploader, setShowImageUploader] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase()
    if (!t || tagList.map(x => x.toLowerCase()).includes(t)) return
    setTags(tagList.length ? `${tags.replace(/,\s*$/, '')}, ${t}` : t)
  }

  const suggestTags = async () => {
    if (!title && !content) {
      toast({ title: "Add a title first", description: "Enter a title or some content so AI can suggest tags.", variant: "destructive" })
      return
    }
    setSuggesting(true)
    try {
      const res = await fetch('/api/admin/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to suggest tags')
      setSuggestedTags(data.tags || [])
      if (!data.tags?.length) toast({ title: "No suggestions", description: "AI couldn't suggest tags — add your own." })
    } catch (err) {
      toast({ title: "Suggestion failed", description: err instanceof Error ? err.message : 'Try again.', variant: "destructive" })
    } finally {
      setSuggesting(false)
    }
  }

  const handleImageSelect = (url: string) => {
    setImageUrl(url)
    setShowImageUploader(false)
    toast({
      title: "Image selected",
      description: "The image has been selected and will be saved with your post.",
    })
  }

  const handleSave = async () => {
    if (!title) {
      toast({
        title: "Missing title",
        description: "Please enter a title for your post.",
        variant: "destructive",
      })
      return
    }

    if (!category) {
      toast({
        title: "Missing category",
        description: "Please select a category for your post.",
        variant: "destructive",
      })
      return
    }

    if (tagList.length < 3) {
      toast({
        title: "Add at least 3 tags",
        description: "Tags improve SEO and recommendations. Use “Suggest tags” for ideas.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      // Create the article using the admin API
      const response = await fetch('/api/admin/articles/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          category: category.charAt(0).toUpperCase() + category.slice(1),
          categories: [category.charAt(0).toUpperCase() + category.slice(1)],
          location: "Alberta",
          excerpt,
          content,
          imageUrl,
          author: "Admin",
          tags: tagList,
          type: "article",
          status: "published",
          // Add trending flags (default to false)
          trendingHome: false,
          trendingEdmonton: false,
          trendingCalgary: false,
          // Add featured article flags (default to false)
          featuredHome: false,
          featuredEdmonton: false,
          featuredCalgary: false
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create article')
      }

      const newPost = await response.json()

      toast({
        title: "Post created",
        description: "Your post has been created successfully.",
      })

      // Redirect back to admin articles list to see the new article
      router.push('/admin/articles')
    } catch (error) {
      console.error("Error creating post:", error)
      toast({
        title: "Error creating post",
        description: "There was a problem creating your post.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6 md:gap-10">
            <Link href="/admin" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Dashboard</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">Save as Draft</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Publish
                </>
              )}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-10">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-6">Create New Post</h1>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter post title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arts">Arts</SelectItem>
                      <SelectItem value="heritage">Heritage</SelectItem>
                      <SelectItem value="food">Food & Cuisine</SelectItem>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="festivals">Festivals</SelectItem>
                      <SelectItem value="history">History</SelectItem>
                      <SelectItem value="edmonton">Edmonton</SelectItem>
                      <SelectItem value="calgary">Calgary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="read-time">Read Time (minutes)</Label>
                  <Input
                    id="read-time"
                    type="number"
                    value={readTime}
                    onChange={(e) => setReadTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  placeholder="Enter a brief excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Write your post content here..."
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tags">
                    Tags (comma-separated){" "}
                    <span className={tagList.length >= 3 ? "text-green-600" : "text-red-600"}>
                      — at least 3 required ({tagList.length})
                    </span>
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={suggestTags} disabled={suggesting}>
                    {suggesting ? "Suggesting…" : "✨ Suggest tags"}
                  </Button>
                </div>
                <Input
                  id="tags"
                  placeholder="Enter tags separated by commas"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
                {suggestedTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs text-muted-foreground">Suggestions (click to add):</span>
                    {suggestedTags.map((t) => {
                      const added = tagList.map(x => x.toLowerCase()).includes(t.toLowerCase())
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => addTag(t)}
                          disabled={added}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            added
                              ? "bg-green-50 border-green-200 text-green-700 cursor-default"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300"
                          }`}
                        >
                          {added ? `✓ ${t}` : `+ ${t}`}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Featured Image</Label>
                <div className="flex items-center gap-4">
                  {imageUrl ? (
                    <div className="relative w-32 h-32">
                      <img
                        src={imageUrl}
                        alt="Featured"
                        className="object-cover w-full h-full rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2"
                        onClick={() => setImageUrl("")}
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setShowImageUploader(true)}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Image
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showImageUploader && (
        <ImageUploader
          onSelect={handleImageSelect}
          onClose={() => setShowImageUploader(false)}
        />
      )}
    </div>
  )
}
