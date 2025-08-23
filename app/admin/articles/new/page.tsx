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

// Function to process content for preview (same as in article-content.tsx)
const processContentForPreview = (content: string): string => {
  // Convert YouTube URLs to embedded videos
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/g
  
  let processedContent = content.replace(youtubeRegex, (match, videoId) => {
    return `<div class="video-container">
      <iframe 
        width="100%" 
        height="400" 
        src="https://www.youtube.com/embed/${videoId}" 
        title="YouTube video player" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen
      ></iframe>
    </div>`
  })

  // Convert plain text line breaks to proper HTML paragraphs
  processedContent = processedContent
    .split('\n\n')
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0)
    .map(paragraph => {
      // Handle numbered lists (main headings)
      if (/^\d+\./.test(paragraph)) {
        return `<h2 class="text-2xl font-bold text-gray-900 mb-4">${paragraph}</h2>`
      }
      // Handle "What it is:", "Why locals love it:", etc. (highlight boxes)
      else if (/^(What it is|Why locals love it|Pro tip|Vibe|Try this|Heads-up|Must-try|Key Takeaway|Important|Note):/.test(paragraph)) {
        const [label, ...rest] = paragraph.split(':')
        return `<div class="highlight-box">
          <strong class="text-gray-900 text-lg">${label}:</strong> 
          <span class="text-gray-700">${rest.join(':').trim()}</span>
        </div>`
      }
      // Handle "Honorable Mentions:" and "Bottom line:" (section headers)
      else if (/^(Honorable Mentions|Bottom line|Conclusion|Summary|Final Thoughts):/.test(paragraph)) {
        return `<h3 class="text-xl font-semibold text-gray-900 mt-8 mb-4">${paragraph}</h3>`
      }
      // Handle quotes (text wrapped in quotes)
      else if (/^["'].*["']$/.test(paragraph)) {
        return `<blockquote>${paragraph.replace(/^["']|["']$/g, '')}</blockquote>`
      }
      // Handle subheadings (text ending with :)
      else if (/^[A-Z][^:]*:$/.test(paragraph) && paragraph.length < 100) {
        return `<h4 class="text-lg font-semibold text-gray-800 mt-6 mb-3">${paragraph}</h4>`
      }
      // Handle bold text (**text**)
      else if (paragraph.includes('**')) {
        return `<p>${paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`
      }
      // Handle italic text (*text*)
      else if (paragraph.includes('*') && !paragraph.startsWith('*') && !paragraph.endsWith('*')) {
        return `<p>${paragraph.replace(/\*(.*?)\*/g, '<em>$1</em>')}</p>`
      }
      // Handle code text (`text`)
      else if (paragraph.includes('`')) {
        return `<p>${paragraph.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')}</p>`
      }
      // Regular paragraphs
      else {
        return `<p>${paragraph}</p>`
      }
    })
    .join('')

  return processedContent
}

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
  const [showPreview, setShowPreview] = useState(false)
  
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
            className="flex items-center gap-2"
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
              <ul className="text-sm text-gray-500 space-y-1 mb-2">
                <li>• <code className="bg-gray-100 px-1 rounded">**bold text**</code> for <strong>bold text</strong></li>
                <li>• <code className="bg-gray-100 px-1 rounded">*italic text*</code> for <em>italic text</em></li>
                <li>• <code className="bg-gray-100 px-1 rounded">`code text`</code> for <code className="bg-gray-100 px-1 rounded">code text</code></li>
                <li>• <code className="bg-gray-100 px-1 rounded">"quoted text"</code> for blockquotes</li>
                <li>• <code className="bg-gray-100 px-1 rounded">![alt text](image-url)</code> for images</li>
              </ul>
            </div>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your article content here...

You can use formatting like:
**This will be bold**
*This will be italic*
`This will be code`

Or add images:
![Beautiful Edmonton skyline](https://example.com/edmonton-skyline.jpg)"
              rows={12}
              className="mt-2"
            />
          </div>
        </div>

        {/* Preview Section */}
        {showPreview && (
          <div className="border rounded-lg p-6 bg-white">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Live Preview</h3>
            <div className="prose max-w-none">
              {title && (
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
              )}
              {excerpt && (
                <p className="text-lg text-gray-600 mb-6 italic">"{excerpt}"</p>
              )}
              {content && (
                <div 
                  className="article-content"
                  style={{
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    lineHeight: "1.8",
                    color: "#374151",
                    fontSize: "1.125rem"
                  }}
                  dangerouslySetInnerHTML={{ __html: processContentForPreview(content) }}
                />
              )}
              {!content && (
                <div className="text-gray-400 text-center py-8">
                  <p>Start typing in the content field to see the preview here</p>
                </div>
              )}
            </div>
            <style jsx>{`
              .article-content h1,
              .article-content h2,
              .article-content h3,
              .article-content h4 {
                font-weight: 700;
                color: #111827;
                margin-top: 2.5rem;
                margin-bottom: 1.25rem;
                line-height: 1.3;
              }
              .article-content h1 {
                font-size: 2.5rem;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 0.5rem;
              }
              .article-content h2 {
                font-size: 2rem;
                color: #1f2937;
              }
              .article-content h3 {
                font-size: 1.5rem;
                color: #374151;
              }
              .article-content h4 {
                font-size: 1.25rem;
                color: #4b5563;
              }
              .article-content p {
                margin-bottom: 1.5rem;
              }
              .article-content blockquote {
                border-left: 4px solid #3b82f6;
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                padding: 1.5rem;
                margin: 2rem 0;
                border-radius: 0.5rem;
                font-style: italic;
                color: #1e40af;
                font-size: 1.125rem;
              }
              .article-content .highlight-box {
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border: 1px solid #f59e0b;
                border-radius: 0.5rem;
                padding: 1.5rem;
                margin: 1.5rem 0;
                box-shadow: 0 2px 4px rgba(245, 158, 11, 0.1);
              }
              .article-content code {
                background-color: #f3f4f6;
                padding: 0.25rem 0.5rem;
                border-radius: 0.25rem;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 0.875rem;
              }
              .article-content strong {
                font-weight: 700;
                color: #111827;
              }
              .article-content em {
                font-style: italic;
                color: #4b5563;
              }
            `}</style>
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
