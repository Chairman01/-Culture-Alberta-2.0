"use client"

import { useState } from "react"
import { FormEvent } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ArticlesPage() {
  const [title, setTitle] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("")
  const [location, setLocation] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [category, setCategory] = useState("")
  const [type, setType] = useState("Article")
  const [author, setAuthor] = useState("")
  const [status, setStatus] = useState("Draft")
  const [rating, setRating] = useState(0)
  const [readTime, setReadTime] = useState("")
  const [featuredImage, setFeaturedImage] = useState(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Add neighborhood to the article data
    const articleData = {
      title,
      excerpt,
      description,
      content,
      location,
      neighborhood,
      category,
      type,
      author,
      status,
      rating,
      readTime,
      // ... other fields
    }
    // ... rest of submit logic ...
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="text-sm font-medium">Location</label>
        <input
          type="text"
          placeholder="Enter location"
          className="w-full px-3 py-2 border rounded-md"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Neighborhood</label>
        <select
          className="w-full px-3 py-2 border rounded-md"
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
        >
          <option value="">Select Neighborhood</option>
          <option value="Whyte Ave">Whyte Ave</option>
          <option value="Downtown">Downtown</option>
          <option value="Old Strathcona">Old Strathcona</option>
          <option value="124 Street">124 Street</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Type</label>
        <Select value={type} onValueChange={setType}>
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
  )
} 