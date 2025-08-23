"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Upload, Eye, EyeOff } from "lucide-react"
import { createArticle } from "@/lib/articles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ImageUploader } from "@/app/admin/components/image-uploader"
import { useToast } from "@/hooks/use-toast"
import { MAIN_CATEGORIES } from "@/lib/data"
import { ArticleContent } from "@/components/article-content"

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
  const [imageUrl, setImageUrl] = useState("")
  const [showImageUploader, setShowImageUploader] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  
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

    setIsSaving(true)

    try {
      // Create the article using the articles API
      const newArticle = await createArticle({
        title,
        category: category || categories[0] || "General",
        categories: categories.length > 0 ? categories : [category || "General"],
        location: location || "Alberta",
        excerpt,
        content,
        imageUrl: imageUrl,
        author: author || "Admin",
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

      toast({
        title: "Article created",
        description: "Your article has been created successfully.",
      })

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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowPreview(!showPreview)}
            size="sm"
          >
            {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showPreview ? "Hide Preview" : "Show Preview"}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Article"}
          </Button>
        </div>
      </div>

      <div className={`grid gap-6 ${showPreview ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
        {/* Form Section */}
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
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief description of the article"
              rows={3}
            />
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

          {/* Trending Selection Section */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-semibold mb-3">Trending Options</h3>
            <div className="space-y-2">
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
          <div className="border rounded-lg p-4 bg-blue-50">
            <h3 className="text-lg font-semibold mb-3">Featured Article Options</h3>
            <div className="space-y-2">
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
              <p className="text-sm text-gray-600 mb-2">
                💡 <strong>Formatting Tips:</strong>
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• <code className="bg-gray-100 px-1 rounded">**bold text**</code> - Makes text bold</p>
                <p>• <code className="bg-gray-100 px-1 rounded">*italic text*</code> - Makes text italic</p>
                <p>• <code className="bg-gray-100 px-1 rounded">`code text`</code> - Highlights code</p>
                <p>• <code className="bg-gray-100 px-1 rounded">"quoted text"</code> - Creates a quote block</p>
                <p>• <code className="bg-gray-100 px-1 rounded">![alt text](image-url)</code> - Adds images</p>
                <p>• <code className="bg-gray-100 px-1 rounded">What it is:</code> - Creates highlight boxes</p>
                <p>• <code className="bg-gray-100 px-1 rounded">Pro tip:</code> - Creates tip boxes</p>
              </div>
            </div>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your article content here...

Use **bold text** for emphasis
Add *italic text* for style
Include quoted text for quotes
Add Pro tip: for helpful tips
Use What it is: for explanations

You can also add images:
![alt text](image-url)"
              rows={12}
              className="mt-2"
            />
          </div>
        </div>

        {/* Preview Section */}
        {showPreview && (
          <div className="space-y-4">
            <div className="sticky top-4">
              <div className="bg-white border rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold mb-2">Live Preview</h3>
                <p className="text-sm text-gray-600 mb-4">See how your article will look with formatting applied</p>
                
                {title && (
                  <div className="mb-4">
                    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                    {author && <p className="text-sm text-gray-600 mt-1">By {author}</p>}
                    {location && <p className="text-sm text-gray-600">{location}</p>}
                  </div>
                )}

                {excerpt && (
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <p className="text-gray-700 italic">{excerpt}</p>
                  </div>
                )}

                {imageUrl && (
                  <div className="mb-4">
                    <img
                      src={imageUrl}
                      alt="Article preview"
                      className="w-full h-48 object-cover rounded"
                    />
                  </div>
                )}

                {content && (
                  <div className="border-t pt-4">
                    <ArticleContent content={content} />
                  </div>
                )}

                {!title && !content && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Start typing to see the preview...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showImageUploader && (
        <ImageUploader 
          onSelect={handleImageSelect} 
          onClose={() => setShowImageUploader(false)} 
        />
      )}
    </div>
  )
}
