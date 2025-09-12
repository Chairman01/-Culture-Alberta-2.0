"use client"

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

  const loadArticles = async () => {
    try {
      // Use the existing articles from the file system
      const { getAllArticles } = await import('@/lib/articles')
      const allArticles = await getAllArticles()
      
      // Filter for best-of articles or create sample data
      const bestOfArticles = allArticles.filter(article => 
        article.category?.toLowerCase().includes('best') || 
        article.type?.toLowerCase().includes('best')
      )

      // If no best-of articles exist, create sample data for demonstration
      if (bestOfArticles.length === 0) {
        const sampleArticles: ExtendedArticle[] = [
          // Dentists
          { id: 'dentist-1', title: 'Smile Dental Care', category: 'Dentists', location: 'Edmonton, AB', rating: 4.8, description: 'Award-winning dental practice offering comprehensive care with the latest technology.', image: '/placeholder.svg', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'dentist-2', title: 'Calgary Family Dentistry', category: 'Dentists', location: 'Calgary, AB', rating: 4.8, description: 'Friendly family dental clinic specializing in preventative care and cosmetic dentistry.', image: '/placeholder.svg', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'dentist-3', title: 'Downtown Dental Associates', category: 'Dentists', location: 'Edmonton, AB', rating: 4.8, description: 'Modern dental practice offering extended hours and emergency dental services.', image: '/placeholder.svg', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          
          // Lawyers
          { id: 'lawyer-1', title: 'Alberta Legal Partners', category: 'Lawyers', location: 'Calgary, AB', rating: 4.8, description: 'Full service law firm with expertise in corporate, family, and real estate law.', image: '/placeholder.svg', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'lawyer-2', title: 'Edmonton Law Group', category: 'Lawyers', location: 'Edmonton, AB', rating: 4.8, description: 'Experienced legal team specializing in personal injury and insurance claims.', image: '/placeholder.svg', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'lawyer-3', title: 'Heritage Legal Services', category: 'Lawyers', location: 'Calgary, AB', rating: 4.8, description: 'Boutique law firm focusing on estate planning, wills, and business law.', image: '/placeholder.svg', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          
          // Accountants
          { id: 'accountant-1', title: 'Precision Accounting', category: 'Accountants', location: 'Edmonton, AB', rating: 4.8, description: 'Trusted accounting firm offering tax planning, bookkeeping, and business advisory services.', image: '/placeholder.svg', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'accountant-2', title: 'Calgary Tax Professionals', category: 'Accountants', location: 'Calgary, AB', rating: 4.8, description: 'Specialized tax services for individuals and small businesses with personalized solutions.', image: '/placeholder.svg', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'accountant-3', title: 'Alberta Financial Advisors', category: 'Accountants', location: 'Edmonton, AB', rating: 4.8, description: 'Comprehensive financial planning and accounting services for businesses and individuals.', image: '/placeholder.svg', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          
          // Restaurants
          { id: 'restaurant-1', title: 'The Prairie Table', category: 'Restaurants', location: 'Edmonton, AB', rating: 4.8, description: 'Farm-to-table restaurant showcasing the best of Alberta\'s local ingredients and cuisine.', image: '/placeholder.svg', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'restaurant-2', title: 'Calgary Steakhouse', category: 'Restaurants', location: 'Calgary, AB', rating: 4.8, description: 'Premium steakhouse featuring Alberta\'s world-famous beef and extensive wine selections.', image: '/placeholder.svg', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'restaurant-3', title: 'Fusion Kitchen', category: 'Restaurants', location: 'Edmonton, AB', rating: 4.8, description: 'Innovative restaurant blending global flavors with local Alberta ingredients.', image: '/placeholder.svg', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          
          // Doctors
          { id: 'doctor-1', title: 'Alberta Family Medicine', category: 'Doctors', location: 'Calgary, AB', rating: 4.8, description: 'Comprehensive family medical care with experienced physicians and modern facilities.', image: '/placeholder.svg', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: 'doctor-2', title: 'Edmonton Medical Clinic', category: 'Doctors', location: 'Edmonton, AB', rating: 4.8, description: 'Full-service medical clinic providing primary care and specialized treatments.', image: '/placeholder.svg', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ]
        
        setArticles(sampleArticles)
      } else {
        setArticles(bestOfArticles)
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading articles:', error)
      setIsLoading(false)
    }
  }

  const categories = Array.from(new Set(articles.map(a => a.category).filter(cat => cat && cat.trim() !== ''))) as string[]
  
  // Filter articles based on selected category
  const getFilteredArticles = () => {
    if (selectedCategory === "all") {
      return articles
    }
    return articles.filter(article => article.category === selectedCategory)
  }
  
  const filteredArticles = getFilteredArticles()

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
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">Best of Alberta</h1>
          <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
            Discover the top-rated professionals and businesses across Alberta, from healthcare providers to legal services.
          </p>
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
            <Button variant="outline" className="mb-2">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Industry Sections */}
      <section className="py-16 bg-white">
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
            <div className="space-y-16">
              {selectedCategory === "all" ? (
                // Show all categories when "All Categories" is selected
                categories.map(category => {
                  const categoryArticles = articles.filter(article => article.category === category)
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">{category}</h2>
                        <Link href={`/best-of/${category.toLowerCase()}`}>
                          <Button variant="outline" size="sm">
                            View All
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categoryArticles.slice(0, 3).map((article) => (
                          <Card key={article.id} className="group hover:shadow-lg transition-all duration-300">
                            <div className="aspect-[16/10] w-full bg-gray-200 relative overflow-hidden rounded-t-lg">
                              {article.image ? (
                                <Image
                                  src={article.image}
                                  alt={article.title}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-400 text-4xl">📷</span>
                                </div>
                              )}
                              {article.rating && (
                                <div className="absolute top-4 right-4 bg-white text-black px-2 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-md">
                                  <Star className="w-4 h-4 fill-current text-yellow-400" />
                                  {article.rating}
                                </div>
                              )}
                            </div>
                            <CardContent className="p-6">
                              <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-600 transition-colors">
                                {article.title}
                              </h3>
                              <div className="flex items-center text-sm text-gray-600 mb-2">
                                <MapPin className="w-4 h-4 mr-1" />
                                {article.location}
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-3">
                                {article.description}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )
                })
              ) : (
                // Show only selected category
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedCategory}</h2>
                    <Link href={`/best-of/${selectedCategory.toLowerCase()}`}>
                      <Button variant="outline" size="sm">
                        View All
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredArticles.map((article) => (
                      <Card key={article.id} className="group hover:shadow-lg transition-all duration-300">
                        <div className="aspect-[16/10] w-full bg-gray-200 relative overflow-hidden rounded-t-lg">
                          {article.image ? (
                            <Image
                              src={article.image}
                              alt={article.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-400 text-4xl">📷</span>
                            </div>
                          )}
                          {article.rating && (
                            <div className="absolute top-4 right-4 bg-white text-black px-2 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-md">
                              <Star className="w-4 h-4 fill-current text-yellow-400" />
                              {article.rating}
                            </div>
                          )}
                        </div>
                        <CardContent className="p-6">
                          <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-600 transition-colors">
                            {article.title}
                          </h3>
                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <MapPin className="w-4 h-4 mr-1" />
                            {article.location}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-3">
                            {article.description}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
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
