import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Star, MapPin, Clock, Users, Award, Heart, Sparkles } from "lucide-react"
import { getAllArticles } from "@/lib/articles"
import { Article } from "@/lib/types/article"
import { getArticleUrl } from '@/lib/utils/article-url'

interface ExtendedArticle extends Omit<Article, 'content'> {
  name?: string;
  description?: string;
  rating?: number;
  content?: string;
  contact?: string;
  location?: string;
  image?: string;
}

export default function BestOfPage() {
  const [articles, setArticles] = useState<ExtendedArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [nominationForm, setNominationForm] = useState({
    name: "",
    category: "",
    location: "",
    description: "",
    contact: ""
  })

  useEffect(() => {
    loadArticles()
  }, [])

  const loadArticles = () => {
    try {
      const keys = Object.keys(localStorage)
      const postKeys = keys.filter(key => key.startsWith('post_') && !key.includes('image_'))
      const articleKeys = keys.filter(key => key.startsWith('article_') && !key.includes('image_'))

      const allArticles: ExtendedArticle[] = []
      
      for (const key of [...postKeys, ...articleKeys]) {
        const savedJson = localStorage.getItem(key)
        if (savedJson) {
          const article = JSON.parse(savedJson)
          
          // Handle image loading
          if (article.image && article.image.startsWith('__BASE64_IMAGE_')) {
            const imageId = article.image.replace('__BASE64_IMAGE_', '').replace('__', '')
            const savedImage = localStorage.getItem(`post_image_${imageId}`) || 
                             localStorage.getItem(`article_image_${imageId}`)
            if (savedImage) {
              article.image = savedImage
            }
          }
          
          // Only include best-of articles
          if (article.type?.toLowerCase().includes('best') || article.category?.toLowerCase().includes('best')) {
            allArticles.push({
              ...article,
              id: article.id || key.replace('post_', '').replace('article_', ''),
              category: article.category || 'General',
              date: article.date || new Date().toISOString(),
              image: article.image || `/placeholder.svg`
            })
          }
        }
      }

      // Sort by rating or date
      allArticles.sort((a, b) => {
        if (a.rating && b.rating) {
          return b.rating - a.rating
        }
        const dateA = new Date(a.date || 0).getTime()
        const dateB = new Date(b.date || 0).getTime()
        return dateB - dateA
      })

      setArticles(allArticles)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading articles:', error)
      setIsLoading(false)
    }
  }

  const categories = Array.from(new Set(articles.map(a => a.category).filter(cat => cat && cat.trim() !== ''))) as string[]
  const filteredArticles = selectedCategory === "all" 
    ? articles 
    : articles.filter(article => article.category === selectedCategory)

  const handleNominationSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle nomination submission
    console.log('Nomination submitted:', nominationForm)
    setNominationForm({ name: "", category: "", location: "", description: "", contact: "" })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">Best of Alberta</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Discover the finest restaurants, attractions, and experiences that make Alberta truly special. 
            From hidden gems to iconic landmarks, find your next favorite spot.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="secondary" className="text-lg px-4 py-2">🏆 Curated by Locals</Badge>
            <Badge variant="secondary" className="text-lg px-4 py-2">⭐ Verified Reviews</Badge>
            <Badge variant="secondary" className="text-lg px-4 py-2">📍 Alberta-Wide</Badge>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
              className="mb-2"
            >
              All Categories
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className="mb-2"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {filteredArticles.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-2xl font-bold mb-4">No Best-of Articles Yet</h3>
              <p className="text-gray-600 mb-8">Be the first to nominate your favorite Alberta spots!</p>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Submit a Nomination
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredArticles.map((article) => (
                <Card key={article.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="aspect-[16/10] w-full bg-gray-200 relative overflow-hidden rounded-t-lg">
                    {article.image ? (
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-lg">No Image</span>
                      </div>
                    )}
                    {article.rating && (
                      <div className="absolute top-4 right-4 bg-yellow-400 text-black px-2 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                        <Star className="w-4 h-4 fill-current" />
                        {article.rating}
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{article.category}</Badge>
                      {article.location && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          {article.location}
                        </div>
                      )}
                    </div>
                    <CardTitle className="group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-3">
                      {article.excerpt || article.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {article.date && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(article.date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <Link href={getArticleUrl(article)}>
                        <Button variant="outline" size="sm" className="group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600">
                          Read More
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Nomination Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-6xl mb-6">💡</div>
            <h2 className="text-3xl font-bold mb-4">Know a Hidden Gem?</h2>
            <p className="text-gray-600 mb-8">
              Help us discover the best of Alberta! Nominate your favorite restaurants, attractions, or experiences.
            </p>
            
            <Card className="text-left">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  Submit a Nomination
                </CardTitle>
                <CardDescription>
                  Share your favorite Alberta spots with the community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNominationSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Name/Title *</label>
                      <Input
                        value={nominationForm.name}
                        onChange={(e) => setNominationForm({...nominationForm, name: e.target.value})}
                        placeholder="e.g., The Best Pizza in Calgary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Category *</label>
                      <Select value={nominationForm.category} onValueChange={(value) => setNominationForm({...nominationForm, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="attraction">Attraction</SelectItem>
                          <SelectItem value="experience">Experience</SelectItem>
                          <SelectItem value="shop">Shop</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Location *</label>
                    <Input
                      value={nominationForm.location}
                      onChange={(e) => setNominationForm({...nominationForm, location: e.target.value})}
                      placeholder="e.g., Calgary, AB"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Description *</label>
                    <Textarea
                      value={nominationForm.description}
                      onChange={(e) => setNominationForm({...nominationForm, description: e.target.value})}
                      placeholder="Tell us why this place is special..."
                      rows={4}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Contact (Optional)</label>
                    <Input
                      value={nominationForm.contact}
                      onChange={(e) => setNominationForm({...nominationForm, contact: e.target.value})}
                      placeholder="Website, phone, or social media"
                    />
                  </div>
                  <Button type="submit" className="w-full">Submit Nomination</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
