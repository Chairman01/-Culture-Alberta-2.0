"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

export default function TestSupabaseConnection() {
  const [connectionStatus, setConnectionStatus] = useState<string>("Testing...")
  const [articles, setArticles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      setConnectionStatus("Testing Supabase connection...")
      
      if (!supabase) {
        setConnectionStatus("❌ Supabase client not initialized")
        return
      }

      // Test basic connection
      const { data, error } = await supabase
        .from('articles')
        .select('id, title')
        .limit(5)

      if (error) {
        setConnectionStatus(`❌ Connection failed: ${error.message}`)
        console.error('Supabase error:', error)
      } else {
        setConnectionStatus(`✅ Connected successfully! Found ${data?.length || 0} articles`)
        setArticles(data || [])
      }
    } catch (error) {
      setConnectionStatus(`❌ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      console.error('Connection error:', error)
    }
  }

  const testCreateArticle = async () => {
    setIsLoading(true)
    try {
      const testArticle = {
        id: `test-${Date.now()}`,
        title: `Test Article ${new Date().toLocaleTimeString()}`,
        content: "This is a test article created to verify Supabase connection.",
        excerpt: "Test article for connection verification",
        category: "Test",
        location: "Test Location",
        author: "Test User",
        type: "article",
        status: "published",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('articles')
        .insert([testArticle])
        .select()
        .single()

      if (error) {
        console.error('Create error:', error)
        alert(`Failed to create test article: ${error.message}`)
      } else {
        console.log('Created test article:', data)
        alert('Test article created successfully!')
        testConnection() // Refresh the list
      }
    } catch (error) {
      console.error('Create error:', error)
      alert(`Failed to create test article: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testDeleteArticle = async (id: string) => {
    if (!confirm('Delete this test article?')) return
    
    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Delete error:', error)
        alert(`Failed to delete article: ${error.message}`)
      } else {
        alert('Test article deleted successfully!')
        testConnection() // Refresh the list
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert(`Failed to delete article: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>
      
      <div className="mb-6">
        <p className="text-lg mb-4">{connectionStatus}</p>
        <Button onClick={testConnection} className="mr-4">
          Test Connection
        </Button>
        <Button onClick={testCreateArticle} disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Test Article"}
        </Button>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Environment Info:</h2>
        <div className="bg-gray-100 p-4 rounded">
          <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV || 'undefined'}</p>
          <p><strong>VERCEL:</strong> {process.env.VERCEL || 'undefined'}</p>
          <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set'}</p>
          <p><strong>Supabase Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}</p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Articles from Supabase:</h2>
        {articles.length > 0 ? (
          <div className="space-y-2">
            {articles.map((article) => (
              <div key={article.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <div>
                  <strong>{article.title}</strong>
                  <span className="text-gray-500 ml-2">(ID: {article.id})</span>
                </div>
                {article.title.includes('Test Article') && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => testDeleteArticle(article.id)}
                  >
                    Delete Test
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No articles found</p>
        )}
      </div>
    </div>
  )
}
