"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export default function TestSupabasePage() {
  const [status, setStatus] = useState<string>("Testing...")
  const [envVars, setEnvVars] = useState<any>({})

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      // Check environment variables
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      setEnvVars({
        url: url,
        keyLength: key ? key.length : 0,
        hasUrl: !!url,
        hasKey: !!key
      })

      if (!url || !key) {
        setStatus("❌ Environment variables not found")
        return
      }

      setStatus("🔍 Testing connection...")

      // Test basic connection
      const { data, error } = await supabase
        .from('articles')
        .select('id')
        .limit(1)

      if (error) {
        setStatus(`❌ Connection failed: ${error.message}`)
      } else {
        setStatus(`✅ Connection successful! Found ${data?.length || 0} articles`)
      }

    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Supabase Connection Test</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <pre className="bg-white p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(envVars, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <p className="text-lg">{status}</p>
        </div>

        <button 
          onClick={testConnection}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Test Again
        </button>
      </div>
    </div>
  )
}
