"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Upload } from "lucide-react"
import { MAIN_CATEGORIES, MainCategory } from "@/lib/data"

interface FormData {
  title: string
  excerpt: string
  content: string
  category: MainCategory
  author: string
  status: string
  image: string
  date: string
  location: string
  type: string
  readTime: string
  tags: string[]
  rating: number
  featured: boolean
  description: string
  neighborhood?: string
}

interface PageParams {
  id: string;
}

export default function ArticlePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const articleId = params.id
  const [article, setArticle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const isNew = articleId === "new"
  const [isLoading, setIsLoading] = useState(!isNew)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [articleType, setArticleType] = useState<'post' | 'article'>('post')
  
  const [formData, setFormData] = useState<FormData>({
    title: "",
    excerpt: "",
    content: "",
    category: MAIN_CATEGORIES[0],
    author: "",
    status: "draft",
    image: "",
    date: new Date().toISOString(),
    location: "",
    type: "article",
    readTime: "",
    tags: [],
    rating: 0,
    featured: false,
    description: "",
    neighborhood: ""
  })

  useEffect(() => {
    if (!isNew) {
      loadArticle()
    }
  }, [isNew])

  const loadArticle = async () => {
    if (isNew) return

    try {
      const id = articleId
      // Try both post_ and article_ prefixes
      const savedPostJson = localStorage.getItem(`post_${id}`) || 
                          localStorage.getItem(`article_${id}`)
      
      if (savedPostJson) {
        const savedPost = JSON.parse(savedPostJson)
        
        // If the image is a reference, load the actual image
        if (savedPost.image && savedPost.image.startsWith('__BASE64_IMAGE_')) {
          const imageId = savedPost.image.replace('__BASE64_IMAGE_', '').replace('__', '')
          const savedImage = localStorage.getItem(`post_image_${imageId}`) || 
                           localStorage.getItem(`article_image_${imageId}`)
          if (savedImage) {
            savedPost.image = savedImage
          }
        }
        
        setFormData(savedPost)
        setImagePreview(savedPost.image || null)
        // Determine the type based on which key exists
        setArticleType(localStorage.getItem(`post_${id}`) ? 'post' : 'article')
      }
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading article:', error)
      setIsLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setImagePreview(base64String)
        setFormData(prev => ({ ...prev, image: base64String }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    try {
      const id = isNew ? Date.now().toString() : articleId
      const prefix = articleType === 'post' ? 'post_' : 'article_'
      
      // If we have an image, store it separately
      if (formData.image && formData.image.startsWith('data:image')) {
        localStorage.setItem(`${prefix}image_${id}`, formData.image)
        formData.image = `__BASE64_IMAGE_${id}__`
      }

      // Save the article with all fields
      localStorage.setItem(`${prefix}${id}`, JSON.stringify({
        ...formData,
        id,
        updatedAt: new Date().toISOString(),
      }))
      
      router.push("/admin/articles")
    } catch (error) {
      console.error('Error saving article:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/articles")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Articles
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isNew ? "Create New Article" : "Edit Article"}
          </h1>
          <p className="text-gray-500 mt-1">
            {isNew ? "Create a new article" : "Edit existing article"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter article title"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Excerpt</label>
              <Textarea
                required
                value={formData.excerpt}
                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Enter a brief excerpt"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter a detailed description"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <Textarea
                required
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your article content here"
                rows={10}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Featured Image</label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {imagePreview ? (
                  <div className="relative aspect-video">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      fill
                      className="object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="absolute bottom-2 right-2"
                      onClick={() => {
                        setImagePreview(null)
                        setFormData(prev => ({ ...prev, image: "" }))
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="py-8">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <Button type="button" variant="outline" asChild>
                        <label>
                          Choose Image
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageChange}
                          />
                        </label>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={formData.category}
                  onValueChange={(value: MainCategory) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {MAIN_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, type: value }))
                    setArticleType(value as 'post' | 'article')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="post">Post</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="best-of">Best of Alberta</SelectItem>
                    <SelectItem value="guide">General Guide</SelectItem>
                    <SelectItem value="edmonton-guide">Edmonton Guide</SelectItem>
                    <SelectItem value="calgary-guide">Calgary Guide</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter location"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Neighborhood</label>
                <Select
                  value={formData.neighborhood || "none"}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, neighborhood: value === "none" ? "" : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select neighborhood" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Edmonton Neighborhoods">Edmonton Neighborhoods</SelectItem>
                    <SelectItem value="Calgary Neighborhoods">Calgary Neighborhoods</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Read Time</label>
                <Input
                  value={formData.readTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, readTime: e.target.value }))}
                  placeholder="e.g. 5 min read"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Author</label>
                <Input
                  value={formData.author}
                  onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="Enter author name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rating (for Best of Alberta)</label>
              <Input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={formData.rating}
                onChange={(e) => setFormData(prev => ({ ...prev, rating: parseFloat(e.target.value) || 0 }))}
                placeholder="Enter rating (0-5)"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="featured"
                checked={formData.featured}
                onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="featured" className="text-sm font-medium">
                Featured Article
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/articles")}
          >
            Cancel
          </Button>
          <Button type="submit">
            {isNew ? "Create Article" : "Update Article"}
          </Button>
        </div>
      </form>
    </div>
  )
} 