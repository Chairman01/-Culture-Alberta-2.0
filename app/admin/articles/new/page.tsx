"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Upload, Newspaper, BookOpen } from "lucide-react"
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
import { MAIN_CATEGORIES, TIER1_LOCATIONS, OTHER_COMMUNITY_LOCATIONS } from "@/lib/data"

export default function NewArticlePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [articleType, setArticleType] = useState<'story' | 'news'>('story')
  const [category, setCategory] = useState("")
  const [categories, setCategories] = useState<string[]>([])

  const handleArticleTypeChange = (type: 'story' | 'news') => {
    setArticleType(type)
    if (type === 'news') {
      setCategories(prev => prev.includes('News') ? prev : [...prev, 'News'])
    } else {
      setCategories(prev => prev.filter(c => c !== 'News'))
    }
  }
  const [location, setLocation] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [author, setAuthor] = useState("")
  const [tags, setTags] = useState("")
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [imageSource, setImageSource] = useState("")
  const [showImageUploader, setShowImageUploader] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""])

  const setPollOption = (index: number, value: string) =>
    setPollOptions(prev => prev.map((option, i) => (i === index ? value : option)))
  const addPollOption = () => setPollOptions(prev => (prev.length < 4 ? [...prev, ""] : prev))
  const removePollOption = (index: number) =>
    setPollOptions(prev => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev))

  // Trending selection options
  const [trendingHome, setTrendingHome] = useState(false)
  const [trendingEdmonton, setTrendingEdmonton] = useState(false)
  const [trendingCalgary, setTrendingCalgary] = useState(false)
  const [trendingAlberta, setTrendingAlberta] = useState(false)

  // Featured article options
  const [featuredHome, setFeaturedHome] = useState(false)
  const [featuredEdmonton, setFeaturedEdmonton] = useState(false)
  const [featuredCalgary, setFeaturedCalgary] = useState(false)
  const [featuredAlberta, setFeaturedAlberta] = useState(false)

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
        body: JSON.stringify({ title, content, category: category || categories[0] || '' }),
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
          category: category || categories[0] || "General",
          categories: categories.length > 0 ? categories : [category || "General"],
          location: location || "Alberta",
          excerpt,
          content,
          imageUrl: imageUrl,
          imageSource: imageSource,
          author: author || "Admin",
          tags: tagList,
          type: "article",
          status: "published",
          // Add trending flags
          trendingHome,
          trendingEdmonton,
          trendingCalgary,
          trendingAlberta,
          featuredHome,
          featuredEdmonton,
          featuredCalgary,
          featuredAlberta,
          poll: pollQuestion.trim()
            ? { question: pollQuestion.trim(), options: pollOptions.map(o => o.trim()).filter(Boolean) }
            : undefined
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
            paths: ['/', `/articles/${articleSlug}`, '/edmonton', '/calgary', '/alberta', '/culture', '/food-drink', '/events']
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

          {/* Article Type Selector */}
          <div>
            <Label>Article Type *</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                type="button"
                onClick={() => handleArticleTypeChange('story')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                  articleType === 'story'
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <BookOpen className="w-5 h-5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Story / Feature</div>
                  <div className={`text-xs mt-0.5 ${articleType === 'story' ? 'text-gray-300' : 'text-gray-500'}`}>
                    Culture, food, history, guides
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleArticleTypeChange('news')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                  articleType === 'news'
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                }`}
              >
                <Newspaper className="w-5 h-5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-sm">News Story</div>
                  <div className={`text-xs mt-0.5 ${articleType === 'news' ? 'text-blue-200' : 'text-gray-500'}`}>
                    Timely — goes to Google News
                  </div>
                </div>
              </button>
            </div>
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
            <Select value={location || undefined} onValueChange={setLocation}>
              <SelectTrigger id="location">
                <SelectValue placeholder="Select location (e.g., Edmonton, Calgary, Red Deer)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Edmonton">Edmonton</SelectItem>
                <SelectItem value="Calgary">Calgary</SelectItem>
                <SelectItem value="Alberta">Alberta</SelectItem>
                {TIER1_LOCATIONS.map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
                {OTHER_COMMUNITY_LOCATIONS.map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-1">For Alberta communities outside Edmonton/Calgary</p>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="tags">
                Tags{" "}
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
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="neighborhood, edmonton, arts, shopping (comma separated)"
            />
            {suggestedTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">Suggestions (click to add):</span>
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
            <p className="text-sm text-gray-500 mt-1">
              Separate tags with commas. For neighbourhood articles, include “neighborhood” as a category or tag.
            </p>
          </div>

          <div className="rounded-lg border border-orange-200 bg-orange-50/40 p-4">
            <Label htmlFor="pollQuestion">Reader poll (optional)</Label>
            <p className="text-xs text-gray-500 mb-2">
              Leave blank and AI writes one from the article when you publish. Fill it in to use your own —
              keep the options short and punchy.
            </p>
            <Input
              id="pollQuestion"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="Poll question"
              maxLength={200}
            />
            <div className="mt-2 space-y-2">
              {pollOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => setPollOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    maxLength={60}
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removePollOption(index)}
                      aria-label={`Remove option ${index + 1}`}
                      className="shrink-0 w-8 h-8 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 4 && (
                <Button type="button" variant="outline" size="sm" onClick={addPollOption}>
                  + Add option
                </Button>
              )}
            </div>
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

          <div>
            <Label htmlFor="imageSource">Image Credit / Source</Label>
            <Input
              id="imageSource"
              value={imageSource}
              onChange={(e) => setImageSource(e.target.value)}
              placeholder="e.g. CBC, City of Edmonton, Photo: Jane Smith"
            />
            <p className="text-sm text-gray-500 mt-1">
              Optional. Shown as a small 📷 credit beneath the image in the newsletter.
            </p>
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="trending-alberta"
              checked={trendingAlberta}
              onCheckedChange={(checked) => setTrendingAlberta(checked as boolean)}
            />
            <Label htmlFor="trending-alberta" className="text-sm font-medium">
              Show in Alberta Trending
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="featured-alberta"
              checked={featuredAlberta}
              onCheckedChange={(checked) => setFeaturedAlberta(checked as boolean)}
            />
            <Label htmlFor="featured-alberta" className="text-sm font-medium">
              Show as Alberta Page Featured Article
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
