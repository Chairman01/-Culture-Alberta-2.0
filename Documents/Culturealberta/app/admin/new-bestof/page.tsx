"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Save, Upload, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ImageUploader } from "@/app/admin/components/image-uploader"
import { useToast } from "@/hooks/use-toast"

export default function NewBestOfPage() {
  const { toast } = useToast()

  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [rating, setRating] = useState("4.8")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [website, setWebsite] = useState("")
  const [hours, setHours] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [showImageUploader, setShowImageUploader] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleImageSelect = (url: string) => {
    setImageUrl(url)
    setShowImageUploader(false)

    toast({
      title: "Image selected",
      description: "The image has been selected and will be saved with your listing.",
    })
  }

  const handleSave = async () => {
    if (!name) {
      toast({
        title: "Missing name",
        description: "Please enter a name for the business.",
        variant: "destructive",
      })
      return
    }

    if (!category) {
      toast({
        title: "Missing category",
        description: "Please select a category for the business.",
        variant: "destructive",
      })
      return
    }

    if (!location) {
      toast({
        title: "Missing location",
        description: "Please enter a location for the business.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      // Simulate saving the listing
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Create a new listing object
      const newListing = {
        id: `listing-${Date.now()}`,
        name,
        category: category.charAt(0).toUpperCase() + category.slice(1),
        description,
        location,
        rating: Number.parseFloat(rating),
        address,
        phone,
        website,
        hours,
        image: imageUrl,
      }

      // In a real app, you would save this to your database
      console.log("New listing:", newListing)

      toast({
        title: "Listing created",
        description: "Your Best of Alberta listing has been created successfully.",
      })

      // Reset the form
      setName("")
      setCategory("")
      setDescription("")
      setLocation("")
      setRating("4.8")
      setAddress("")
      setPhone("")
      setWebsite("")
      setHours("")
      setImageUrl("")
    } catch (error) {
      console.error("Error creating listing:", error)
      toast({
        title: "Error creating listing",
        description: "There was a problem creating your listing.",
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
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Create Listing
                </>
              )}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-10">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-6">Create New Best of Alberta Listing</h1>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Business Name</Label>
                <Input
                  id="name"
                  placeholder="Enter business name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                      <SelectItem value="restaurants">Restaurants</SelectItem>
                      <SelectItem value="dentists">Dentists</SelectItem>
                      <SelectItem value="lawyers">Lawyers</SelectItem>
                      <SelectItem value="accountants">Accountants</SelectItem>
                      <SelectItem value="doctors">Doctors</SelectItem>
                      <SelectItem value="real estate agents">Real Estate Agents</SelectItem>
                      <SelectItem value="home services">Home Services</SelectItem>
                      <SelectItem value="auto services">Auto Services</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="City, AB"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the business"
                  className="resize-none h-32"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rating" className="flex items-center gap-2">
                  Rating <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                </Label>
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger id="rating">
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5.0">5.0</SelectItem>
                    <SelectItem value="4.9">4.9</SelectItem>
                    <SelectItem value="4.8">4.8</SelectItem>
                    <SelectItem value="4.7">4.7</SelectItem>
                    <SelectItem value="4.6">4.6</SelectItem>
                    <SelectItem value="4.5">4.5</SelectItem>
                    <SelectItem value="4.4">4.4</SelectItem>
                    <SelectItem value="4.3">4.3</SelectItem>
                    <SelectItem value="4.2">4.2</SelectItem>
                    <SelectItem value="4.1">4.1</SelectItem>
                    <SelectItem value="4.0">4.0</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business-image">Business Image</Label>
                <div className="border rounded-lg overflow-hidden">
                  <div className="h-60 bg-muted">
                    {imageUrl ? (
                      <div className="w-full h-full relative">
                        <img
                          src={imageUrl || "/placeholder.svg"}
                          alt="Business image preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            console.error("Image failed to load:", imageUrl)
                            e.currentTarget.src = `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(name || "New Business")}`
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Upload className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate max-w-[70%]">
                      {imageUrl || "No image selected"}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setShowImageUploader(true)}>
                      {imageUrl ? "Replace Image" : "Add Image"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="123 Main Street, City, AB"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="(123) 456-7890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://www.example.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hours">Business Hours</Label>
                <Textarea
                  id="hours"
                  placeholder="Monday-Friday: 9am-5pm, Saturday: 10am-2pm, Sunday: Closed"
                  className="resize-none h-20"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button variant="outline" asChild>
                  <Link href="/admin">Cancel</Link>
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Creating..." : "Create Listing"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="w-full border-t bg-background py-4">
        <div className="container">
          <p className="text-center text-sm text-muted-foreground">
            © 2025 Culture Alberta Admin. All rights reserved.
          </p>
        </div>
      </footer>

      {showImageUploader && (
        <ImageUploader
          onImageSelect={handleImageSelect}
          onCancel={() => setShowImageUploader(false)}
          initialUrl={imageUrl}
        />
      )}
    </div>
  )
}
