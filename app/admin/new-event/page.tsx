"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ImageUploader } from "@/app/admin/components/image-uploader"
import { useToast } from "@/hooks/use-toast"
import { createArticle } from "@/lib/articles"

export default function NewEventPage() {
  const { toast } = useToast()
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [type, setType] = useState("event") // Default to event type
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [showImageUploader, setShowImageUploader] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [ticketUrl, setTicketUrl] = useState("")
  const [organizer, setOrganizer] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")

  const handleImageSelect = (url: string) => {
    setImageUrl(url)
    setShowImageUploader(false)

    toast({
      title: "Image selected",
      description: "The image has been selected and will be saved with your event.",
    })
  }

  const handleSave = async () => {
    if (!title) {
      toast({
        title: "Missing title",
        description: "Please enter a title for your event.",
        variant: "destructive",
      })
      return
    }

    if (!category) {
      toast({
        title: "Missing category",
        description: "Please select a category for your event.",
        variant: "destructive",
      })
      return
    }

    if (!startDate) {
      toast({
        title: "Missing date",
        description: "Please enter a start date for your event.",
        variant: "destructive",
      })
      return
    }

    if (!location) {
      toast({
        title: "Missing location",
        description: "Please enter a location for your event.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      // Format the date range
      const formattedDate = endDate ? `${startDate} - ${endDate}` : startDate

      // Create a new event object using the articles system
      const newEvent = {
        title,
        content: description,
        excerpt: description.substring(0, 150) + (description.length > 150 ? '...' : ''),
        category: category.charAt(0).toUpperCase() + category.slice(1),
        type: type, // Use the selected type
        location,
        author: organizer || 'Event Organizer',
        imageUrl: imageUrl || '/placeholder.svg',
        status: 'published'
      }

      // Save to the articles system
      const savedEvent = await createArticle(newEvent)
      console.log("New event saved:", savedEvent)

      toast({
        title: "Event created",
        description: "Your event has been created successfully.",
      })

      // Redirect back to admin articles list to see the new event
      router.push('/admin/articles')
    } catch (error) {
      console.error("Error creating event:", error)
      toast({
        title: "Error creating event",
        description: "There was a problem creating your event.",
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
            <Button variant="outline">Save as Draft</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Publish Event
                </>
              )}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-10">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-6">Create New Event</h1>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  placeholder="Enter event title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Content Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="article">Article</SelectItem>
                      <SelectItem value="news">News</SelectItem>
                      <SelectItem value="guide">Guide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="festival">Festival</SelectItem>
                      <SelectItem value="art">Art</SelectItem>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="dance">Dance</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="film">Film</SelectItem>
                      <SelectItem value="theater">Theater</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    placeholder="May 15, 2025"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date (Optional)</Label>
                  <Input
                    id="end-date"
                    placeholder="May 17, 2025"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your event"
                  className="resize-none h-32"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-image">Event Image</Label>
                <div className="border rounded-lg overflow-hidden">
                  <div className="h-60 bg-muted">
                    {imageUrl ? (
                      <div className="w-full h-full relative">
                        <img
                          src={imageUrl || "/placeholder.svg"}
                          alt="Event image preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            console.error("Image failed to load:", imageUrl)
                            e.currentTarget.src = `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(title || "New Event")}`
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
                <Label htmlFor="ticket-url">Ticket URL (Optional)</Label>
                <Input
                  id="ticket-url"
                  placeholder="https://example.com/tickets"
                  value={ticketUrl}
                  onChange={(e) => setTicketUrl(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organizer">Organizer</Label>
                  <Input
                    id="organizer"
                    placeholder="Event organizer"
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-email">Contact Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="contact@example.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Contact Phone</Label>
                  <Input
                    id="contact-phone"
                    placeholder="(123) 456-7890"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button variant="outline" asChild>
                  <Link href="/admin">Cancel</Link>
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Creating..." : "Create Event"}
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
          onSelect={handleImageSelect}
          onClose={() => setShowImageUploader(false)}
        />
      )}
    </div>
  )
}
