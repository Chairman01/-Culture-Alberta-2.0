"use client"

import { useState } from "react"
import { createArticle } from "@/lib/articles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

export default function TestSupabaseConnection() {
  const { toast } = useToast()
  const [title, setTitle] = useState("Test Article")
  const [content, setContent] = useState("This is a test article content")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string>("")

  const testConnection = async () => {
    setIsLoading(true)
    setResult("Testing connection...")
    
    try {
      const testArticle = await createArticle({
        title,
        content,
        category: "Test",
        location: "Test Location",
        author: "Test Author",
        type: "article",
        status: "published"
      })
      
      setResult(`Success! Article created with ID: ${testArticle.id}`)
      toast({
        title: "Success",
        description: "Article created successfully!",
      })
    } catch (error) {
      console.error("Error creating article:", error)
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      toast({
        title: "Error",
        description: "Failed to create article",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold">Test Supabase Connection</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Content</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Article content"
            rows={4}
          />
        </div>
        
        <Button onClick={testConnection} disabled={isLoading}>
          {isLoading ? "Testing..." : "Test Create Article"}
        </Button>
        
        {result && (
          <div className="p-4 bg-gray-100 rounded">
            <pre className="whitespace-pre-wrap">{result}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
