"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function SyncArticlesPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncStatus('idle')
    
    try {
      const response = await fetch('/api/sync-articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setSyncStatus('success')
        setLastSync(new Date().toLocaleString())
        toast({
          title: "Sync Successful",
          description: result.message,
        })
      } else {
        setSyncStatus('error')
        toast({
          title: "Sync Failed",
          description: result.error || 'Unknown error occurred',
          variant: "destructive",
        })
      }
    } catch (error) {
      setSyncStatus('error')
      toast({
        title: "Sync Failed",
        description: "Network error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Sync Articles
            </CardTitle>
            <CardDescription>
              Sync articles from Supabase to your local articles.json file for faster loading
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Manual Sync</h3>
                <p className="text-sm text-gray-600">
                  Click the button below to sync all articles from Supabase to your local file
                </p>
              </div>
              <Button 
                onClick={handleSync} 
                disabled={isSyncing}
                className="min-w-[120px]"
              >
                {isSyncing ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>

            {lastSync && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                {syncStatus === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {syncStatus === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                <div>
                  <p className="font-medium">
                    {syncStatus === 'success' ? 'Last sync successful' : 'Last sync failed'}
                  </p>
                  <p className="text-sm text-gray-600">{lastSync}</p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">How it works:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Fetches all articles from Supabase</li>
                <li>• <strong>Development:</strong> Updates your local articles.json file</li>
                <li>• <strong>Production:</strong> Triggers page revalidation to refresh content</li>
                <li>• Articles load instantly from optimized sources</li>
                <li>• Run this after making changes in Supabase</li>
              </ul>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">Pro Tip:</h4>
              <p className="text-sm text-yellow-800">
                <strong>Development:</strong> Run <code className="bg-yellow-100 px-1 rounded">npm run sync-articles</code> from your terminal for local file updates.<br/>
                <strong>Production:</strong> The sync automatically triggers page revalidation to refresh your live site content.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
