"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Upload } from "lucide-react"
import { createSlug } from "@/lib/utils/slug"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ImageUploader } from "@/app/admin/components/image-uploader"
import { RichTextEditor } from "@/app/admin/components/rich-text-editor"
import { useToast } from "@/hooks/use-toast"
import { MAIN_CATEGORIES } from "@/lib/data"

export default function NewArticlePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [categories, setCategories] = useState<string[]>([])
  const [location, setLocation] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [author, setAuthor] = useState("")
  const [tags, setTags] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [showImageUploader, setShowImageUploader] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Trending selection options
  const [trendingHome, setTrendingHome] = useState(false)
  const [trendingEdmonton, setTrendingEdmonton] = useState(false)
  const [trendingCalgary, setTrendingCalgary] = useState(false)

  // Featured article options
  const [featuredHome, setFeaturedHome] = useState(false)
  const [featuredEdmonton, setFeaturedEdmonton] = useState(false)
  const [featuredCalgary, setFeaturedCalgary] = useState(false)

  const handleImageSelect = (url: string) => {
    setImageUrl(url)
    setShowImageUploader(false)
    toast({
      title: "Image selected",
      description: "The image has been selected and will be saved with your article.",
    })
  }

  const handleCategoryToggle = (selectedCategory: string) => {
    setCategories(prev => {
      if (prev.includes(selectedCategory)) {
        return prev.filter(cat => cat !== selectedCategory)
      } else {
        return [...prev, selectedCategory]
      }
    })
  }

  const handleSave = async () => {
    if (!title) {
      toast({
        title: "Missing title",
        description: "Please enter a title for your article.",
        variant: "destructive",
      })
      return
    }

    if (!category && categories.length === 0) {
      toast({
        title: "Missing category",
        description: "Please select at least one category for your article.",
        variant: "destructive",
      })
      return
    }

    if (!content || content.trim() === '') {
      toast({
        title: "Missing content",
        description: "Please add content to your article. Articles without content will show 'Content coming soon...' to visitors.",
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
          category: category || categories[0] || "General",
          categories: categories.length > 0 ? categories : [category || "General"],
          location: location || "Alberta",
          excerpt,
          content,
          imageUrl: imageUrl,
          author: author || "Admin",
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
          type: "article",
          status: "published",
          // Add trending flags
          trendingHome,
          trendingEdmonton,
          trendingCalgary,
          // Add featured article flags
          featuredHome,
          featuredEdmonton,
          featuredCalgary
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create article')
      }

      const newArticle = await response.json()

      toast({
        title: "Article created",
        description: "Your article has been created successfully.",
      })

      // Trigger revalidation for article pages
      try {
        const articleSlug = createSlug(title)

        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paths: ['/', `/articles/${articleSlug}`, '/edmonton', '/calgary', '/culture', '/food-drink', '/events']
          })
        })
        console.log('✅ Triggered revalidation for new article')
      } catch (revalidateError) {
        console.log('⚠️ Revalidation failed, but article was created:', revalidateError)
      }

      // Redirect to the articles list
      router.push("/admin/articles")
    } catch (error) {
      console.error("Error creating article:", error)
      toast({
        title: "Error creating article",
        description: "There was a problem creating your article.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/articles">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Articles
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Create New Article</h1>
            <p className="text-gray-500 mt-1">Add a new article to your website</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Article"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter article title"
            />
          </div>

          <div>
            <Label>Categories *</Label>
            <div className="mt-2 space-y-2">
              {MAIN_CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center space-x-2">
                  <Checkbox
                    id={cat}
                    checked={categories.includes(cat)}
                    onCheckedChange={() => handleCategoryToggle(cat)}
                  />
                  <Label htmlFor={cat} className="text-sm font-normal cursor-pointer">
                    {cat}
                  </Label>
                </div>
              ))}
            </div>
            {categories.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Selected: {categories.join(", ")}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Edmonton, Calgary, Alberta"
            />
          </div>

          <div>
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Enter author name"
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="neighborhood, edmonton, arts, shopping (comma separated)"
            />
            <p className="text-sm text-gray-500 mt-1">
              Separate tags with commas. For neighborhood articles, include "neighborhood" as a tag.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief description of the article (recommended: 150-300 characters for optimal social media previews)"
              rows={5}
            />
            <p className="text-sm text-gray-500 mt-1">
              {excerpt.length} characters {excerpt.length < 150 ? '(add more for better previews)' : excerpt.length > 300 ? '(consider shortening)' : '(good length)'}
            </p>
          </div>

          <div>
            <Label>Featured Image</Label>
            <div className="mt-2">
              {imageUrl ? (
                <div className="relative">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded border"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImageUrl("")}
                    className="absolute top-2 right-2"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowImageUploader(true)}
                  className="w-full h-32 border-dashed"
                >
                  <Upload className="h-8 w-8 mr-2" />
                  Upload Image
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trending Selection Section */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">Trending Options</h3>
        <p className="text-sm text-gray-600 mb-4">Select where this article should appear in trending sections:</p>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="trending-home"
              checked={trendingHome}
              onCheckedChange={(checked) => setTrendingHome(checked as boolean)}
            />
            <Label htmlFor="trending-home" className="text-sm font-medium">
              Show in Home Page Trending
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="trending-edmonton"
              checked={trendingEdmonton}
              onCheckedChange={(checked) => setTrendingEdmonton(checked as boolean)}
            />
            <Label htmlFor="trending-edmonton" className="text-sm font-medium">
              Show in Edmonton Trending
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="trending-calgary"
              checked={trendingCalgary}
              onCheckedChange={(checked) => setTrendingCalgary(checked as boolean)}
            />
            <Label htmlFor="trending-calgary" className="text-sm font-medium">
              Show in Calgary Trending
            </Label>
          </div>
        </div>
      </div>

      {/* Featured Article Options Section */}
      <div className="border rounded-lg p-6 bg-blue-50">
        <h3 className="text-lg font-semibold mb-4">Featured Article Options</h3>
        <p className="text-sm text-gray-600 mb-4">Select where this article should appear as the featured article:</p>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="featured-home"
              checked={featuredHome}
              onCheckedChange={(checked) => setFeaturedHome(checked as boolean)}
            />
            <Label htmlFor="featured-home" className="text-sm font-medium">
              Show as Home Page Featured Article
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="featured-edmonton"
              checked={featuredEdmonton}
              onCheckedChange={(checked) => setFeaturedEdmonton(checked as boolean)}
            />
            <Label htmlFor="featured-edmonton" className="text-sm font-medium">
              Show as Edmonton Page Featured Article
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="featured-calgary"
              checked={featuredCalgary}
              onCheckedChange={(checked) => setFeaturedCalgary(checked as boolean)}
            />
            <Label htmlFor="featured-calgary" className="text-sm font-medium">
              Show as Calgary Page Featured Article
            </Label>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="content">Content</Label>
        <div className="mb-2">
          <p className="text-sm text-gray-600">
            💡 <strong>Tip:</strong> You can add images anywhere in your content using the image button in the toolbar or markdown syntax: <code className="bg-gray-100 px-1 rounded">![alt text](image-url)</code>
          </p>
          <p className="text-sm text-gray-500">
            Example: <code className="bg-gray-100 px-1 rounded">![Beautiful Edmonton skyline](https://example.com/edmonton-skyline.jpg)</code>
          </p>
        </div>
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="Write your article content here... You can add images using the image button in the toolbar or markdown syntax."
        />
      </div>

      {
        showImageUploader && (
          <ImageUploader
            onSelect={handleImageSelect}
            onClose={() => setShowImageUploader(false)}
          />
        )
      }
    </div >
  )
}
