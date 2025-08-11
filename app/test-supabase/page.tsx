'use client'

import { useState, useEffect } from 'react'
import { testSupabaseConnection, getAllArticles, getArticleById } from '@/lib/supabase-articles'

export default function TestSupabasePage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...')
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function testConnection() {
      try {
        const isConnected = await testSupabaseConnection()
        setConnectionStatus(isConnected ? 'Connected' : 'Failed')
        
        if (isConnected) {
          const allArticles = await getAllArticles()
          setArticles(allArticles)
        }
      } catch (error) {
        setConnectionStatus('Error: ' + (error instanceof Error ? error.message : 'Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Connection Status:</h2>
        <div className={`p-4 rounded-lg ${
          connectionStatus === 'Connected' ? 'bg-green-100 text-green-800' :
          connectionStatus === 'Testing...' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {connectionStatus}
        </div>
      </div>

      {!loading && connectionStatus === 'Connected' && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Articles from Supabase:</h2>
          {articles.length > 0 ? (
            <div className="space-y-4">
              {articles.map((article) => (
                <div key={article.id} className="p-4 border rounded-lg">
                  <h3 className="font-semibold">{article.title}</h3>
                  <p className="text-gray-600">{article.excerpt}</p>
                  <p className="text-sm text-gray-500">ID: {article.id}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No articles found in Supabase</p>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center">
          <p>Testing connection...</p>
        </div>
      )}
    </div>
  )
}
