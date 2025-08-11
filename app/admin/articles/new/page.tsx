"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Upload } from "lucide-react"
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

export default function NewArticlePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [location, setLocation] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [author, setAuthor] = useState("")
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

  const handleSave = async () => {
    if (!title) {
      toast({
        title: "Missing title",
        description: "Please enter a title for your article.",
        variant: "destructive",
      })
      return
    }

    if (!category) {
      toast({
        title: "Missing category",
        description: "Please select a category for your article.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      // Create the article using the articles API
      const newArticle = await createArticle({
        title,
        category,
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
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {MAIN_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </div>

        <div className="space-y-4">
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
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your article content here..."
          rows={10}
          className="mt-2"
        />
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
