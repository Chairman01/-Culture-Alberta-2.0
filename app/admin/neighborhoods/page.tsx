"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, MapPin, Tag, FileText } from 'lucide-react'
import Link from 'next/link'

export default function NeighborhoodsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edmonton Neighborhoods</h1>
          <p className="text-gray-600 mt-2">Create and manage neighborhood articles</p>
        </div>
        <Link href="/admin/dashboard">
          <Button variant="outline">← Back to Dashboard</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
          <CardHeader>
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-center">Create New Neighborhood Article</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 text-sm mb-4">
              Add a new neighborhood guide or article
            </p>
            <Button asChild className="w-full">
              <Link href="/admin/articles/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Article
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-4 text-lg">How to Create Neighborhood Articles</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Step 1: Create a New Article</h4>
            <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
              <li>Click "Create Article" above</li>
              <li>Fill in the article details</li>
              <li>Add your neighborhood content</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Step 2: Add Neighborhood Category</h4>
            <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
              <li>Set <strong>Category</strong> to "Neighborhood" or "Edmonton Neighborhoods"</li>
              <li>Add <strong>Location</strong> as "Edmonton"</li>
              <li>Include <strong>Tags</strong> like "neighborhood", "edmonton", etc.</li>
            </ol>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-blue-100 rounded">
          <h4 className="font-medium text-blue-900 mb-2">Example Article Setup:</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Title:</strong> "Whyte Avenue: Edmonton's Cultural Heart"</p>
            <p><strong>Category:</strong> "Neighborhood"</p>
            <p><strong>Location:</strong> "Edmonton"</p>
            <p><strong>Tags:</strong> "neighborhood", "whyte avenue", "edmonton", "arts", "shopping"</p>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-green-50 rounded-lg">
        <h4 className="font-semibold text-green-900 mb-2">Benefits of This System:</h4>
        <ul className="text-green-800 text-sm space-y-1 list-disc list-inside">
          <li>All articles use the same management system</li>
          <li>Easy to edit through the admin interface</li>
          <li>Articles can appear in multiple sections</li>
          <li>Better SEO and organization</li>
        </ul>
      </div>
    </div>
  )
}
