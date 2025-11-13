"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, CheckCircle, XCircle, Clock, Download } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function SyncArticlesPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [syncResult, setSyncResult] = useState<any>(null)

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
        setSyncResult(result)
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

  const handleDownload = async () => {
    setIsDownloading(true)
    
    try {
      const response = await fetch('/api/sync-articles/download')
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        
        // Get filename from response headers or use default
        const contentDisposition = response.headers.get('content-disposition')
        let filename = 'articles.json'
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/)
          if (filenameMatch) {
            filename = filenameMatch[1]
          }
        }
        
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        
        toast({
          title: "Download Successful",
          description: `Downloaded ${filename}`,
        })
      } else {
        throw new Error('Download failed')
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download articles file",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Sync Articles</h3>
                  <p className="text-sm text-gray-600">
                    Sync all articles from Supabase and update your local files
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

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Download Articles</h3>
                  <p className="text-sm text-gray-600">
                    Download articles as a JSON file to save locally
                  </p>
                </div>
                <Button 
                  onClick={handleDownload} 
                  disabled={isDownloading}
                  variant="outline"
                  className="min-w-[140px]"
                >
                  {isDownloading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download JSON
                    </>
                  )}
                </Button>
              </div>
            </div>

            {lastSync && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                {syncStatus === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {syncStatus === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                <div className="flex-1">
                  <p className="font-medium">
                    {syncStatus === 'success' ? 'Last sync successful' : 'Last sync failed'}
                  </p>
                  <p className="text-sm text-gray-600">{lastSync}</p>
                  {syncResult && syncStatus === 'success' && (
                    <div className="mt-2 text-sm">
                      <p className="text-green-700">
                        ✅ Synced {syncResult.articlesCount} articles
                        {syncResult.fileWritten ? ' to local file' : ''}
                      </p>
                      <p className="text-gray-600">
                        Environment: {syncResult.environment}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">How it works:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Sync Articles:</strong> Fetches all articles from Supabase and updates local files</li>
                <li>• <strong>Development:</strong> Updates your local articles.json file automatically</li>
                <li>• <strong>Production:</strong> Attempts to update files and triggers page revalidation</li>
                <li>• <strong>Download JSON:</strong> Downloads articles as a JSON file to save locally</li>
                <li>• Articles load instantly from optimized sources</li>
                <li>• Run this after making changes in Supabase</li>
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Perfect for:</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Creating articles in production and syncing to local files</li>
                <li>• Downloading articles as backup files</li>
                <li>• Keeping local development in sync with production</li>
                <li>• Building static sites with latest article data</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
