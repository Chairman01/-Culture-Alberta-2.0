'use client'

import { useState, useEffect } from 'react'
import { testSupabaseConnection, checkArticlesTable, getArticleById } from '@/lib/supabase-articles'

export default function TestPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function runTests() {
      const newLogs: string[] = []
      
      const addLog = (message: string) => {
        console.log(message)
        newLogs.push(`${new Date().toLocaleTimeString()}: ${message}`)
        setLogs([...newLogs])
      }

      addLog('=== Starting Supabase Tests ===')
      
      try {
        // Test 1: Check if Supabase client is initialized
        addLog('Test 1: Checking Supabase client initialization...')
        const { supabase } = await import('@/lib/supabase')
        addLog(`Supabase client exists: ${!!supabase}`)
        
        // Test 2: Test connection
        addLog('Test 2: Testing Supabase connection...')
        const isConnected = await testSupabaseConnection()
        addLog(`Connection test result: ${isConnected ? 'SUCCESS' : 'FAILED'}`)
        
        // Test 3: Check if articles table exists
        if (isConnected) {
          addLog('Test 3: Checking if articles table exists...')
          const tableExists = await checkArticlesTable()
          addLog(`Articles table exists: ${tableExists ? 'YES' : 'NO'}`)
          
          // Test 4: Try to get a specific article
          if (tableExists) {
            addLog('Test 4: Trying to get article with ID "article-1"...')
            try {
              const article = await getArticleById('article-1')
              addLog(`Article found: ${!!article}`)
              if (article) {
                addLog(`Article title: ${article.title}`)
              }
            } catch (error) {
              addLog(`Error getting article: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
          }
        }
        
      } catch (error) {
        addLog(`Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      addLog('=== Tests completed ===')
      setLoading(false)
    }

    runTests()
  }, [])

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Supabase Test Page</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Test Logs:</h2>
        <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="text-sm font-mono mb-1">
              {log}
            </div>
          ))}
          {loading && (
            <div className="text-sm font-mono text-gray-600">
              Running tests...
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Check the browser console for additional detailed logs</li>
          <li>Look for any error messages in the logs above</li>
          <li>If Supabase fails, the system should fall back to file storage</li>
          <li>Articles should still be accessible even if Supabase is down</li>
        </ul>
      </div>
    </div>
  )
} 