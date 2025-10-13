"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
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
import { use } from "react"

interface EditPostPageProps {
  params: Promise<{ id: string }>
}

export default function EditPostPage({ params }: EditPostPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [postId, setPostId] = useState<string>("")
  
  // Handle async params
  useEffect(() => {
    params.then(({ id }) => setPostId(id))
  }, [params])
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [readTime, setReadTime] = useState("5")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [showImageUploader, setShowImageUploader] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load the post data when the component mounts
  useEffect(() => {
    async function loadPost() {
      if (!postId) return // Wait for postId to be set
      
      try {
        console.log('Loading post for edit:', postId)
        // Use API route instead of direct function call for client-side compatibility
        // Add timestamp to bypass cache and ensure fresh data
        const response = await fetch(`/api/articles?id=${postId}&t=${Date.now()}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch article: ${response.status}`)
        }
        
        const post = await response.json()
        console.log('Post loaded for edit:', post)
        console.log('Post fields:', {
          title: post.title,
          category: post.category,
          readTime: post.readTime,
          excerpt: post.excerpt,
          content: post.content ? 'Content present' : 'No content',
          tags: post.tags,
          imageUrl: post.imageUrl
        })
        
        if (!post) {
          toast({
            title: "Post not found",
            description: "The post you're trying to edit could not be found.",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }
        
        setTitle(post.title || "")
        setCategory(post.category?.toLowerCase() || "")
        setReadTime(post.readTime || "5")
        setExcerpt(post.excerpt || "")
        setContent(post.content || "")
        setTags(Array.isArray(post.tags) ? post.tags.join(', ') : (post.tags || ""))
        setImageUrl(post.imageUrl || "")
        setIsLoading(false)
      } catch (error) {
        console.error("Error loading post:", error)
        toast({
          title: "Error loading post",
          description: "There was a problem loading the post data.",
          variant: "destructive",
        })
        router.push("/admin")
      }
    }

    loadPost()
  }, [postId, router, toast])

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

    setIsSaving(true)

    try {
      // Update the article using the admin API
      const response = await fetch(`/api/admin/articles/${postId}`, {
        method: 'PUT',
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
          tags: tags.split(',').map(tag => tag.trim()),
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
        throw new Error('Failed to update article')
      }

      const updatedPost = await response.json()

      toast({
        title: "Post updated",
        description: "Your post has been updated successfully.",
      })

      // Redirect to the article page using title-based URL for better SEO
      const urlTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 100)
      
      router.push(`/articles/${urlTitle}`)
    } catch (error) {
      console.error("Error updating post:", error)
      toast({
        title: "Error updating post",
        description: "There was a problem updating your post.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading post...</p>
      </div>
    )
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
                  <Save className="mr-2 h-4 w-4" /> Update
                </>
              )}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-10">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-6">Edit Post</h1>
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
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="Enter tags separated by commas"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
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
