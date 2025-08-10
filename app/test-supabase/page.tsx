"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestSupabase() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkSupabase() {
      try {
        console.log('Checking Supabase connection...')
        console.log('Supabase client:', supabase ? 'Connected' : 'Not connected')
        
        if (!supabase) {
          setError('Supabase not connected')
          setLoading(false)
          return
        }

        // Check what tables exist
        console.log('Checking for posts table...')
        const { data: posts, error: postsError } = await supabase
          .from('posts')
          .select('*')
        
        if (postsError) {
          console.log('Posts table error:', postsError)
        } else {
          console.log('Posts found:', posts)
          setPosts(posts || [])
        }

        // Check for articles table
        console.log('Checking for articles table...')
        const { data: articles, error: articlesError } = await supabase
          .from('articles')
          .select('*')
        
        if (articlesError) {
          console.log('Articles table error:', articlesError)
          if (articlesError.message.includes('does not exist')) {
            console.log('Articles table does not exist - you need to create it in Supabase')
          }
        } else {
          console.log('Articles found:', articles)
          if (articles && articles.length > 0) {
            setPosts(prev => [...prev, ...articles])
          }
        }

        // Check for any other content tables
        console.log('Checking for other tables...')
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('*')
        
        if (!eventsError && events) {
          console.log('Events found:', events)
        }

        const { data: bestOf, error: bestOfError } = await supabase
          .from('best_of')
          .select('*')
        
        if (!bestOfError && bestOf) {
          console.log('Best of found:', bestOf)
        }

      } catch (err) {
        console.error('Error checking Supabase:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    checkSupabase()
  }, [])

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Database Check</h1>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Found {posts.length} items:</h2>
        {posts.length === 0 ? (
          <p className="text-gray-500">No content found in Supabase</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post, index) => (
              <div key={index} className="border p-4 rounded">
                <h3 className="font-bold">{post.title || post.name || 'Untitled'}</h3>
                <p className="text-sm text-gray-600">Type: {post.type || 'Unknown'}</p>
                <p className="text-sm text-gray-600">ID: {post.id}</p>
                <pre className="text-xs bg-gray-100 p-2 mt-2 overflow-auto">
                  {JSON.stringify(post, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Next Steps:</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>If you see your articles above, we need to update the homepage to load from Supabase</li>
          <li>If you don't see your articles, they might be stored elsewhere (localStorage, different database, etc.)</li>
          <li>If you see "Articles table does not exist" error, you need to create the articles table in Supabase</li>
          <li>Check the browser console for detailed logs</li>
        </ul>
      </div>
    </div>
  )
}
