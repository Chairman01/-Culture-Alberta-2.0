"use client"

import { useState, useEffect } from 'react'
import { getEdmontonNeighborhoods, EdmontonNeighborhood } from '@/lib/data/edmonton-neighborhoods'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Eye, MapPin, Tag } from 'lucide-react'
import Link from 'next/link'

export default function NeighborhoodsPage() {
  const [neighborhoods, setNeighborhoods] = useState<EdmontonNeighborhood[]>([])

  useEffect(() => {
    setNeighborhoods(getEdmontonNeighborhoods())
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edmonton Neighborhoods</h1>
          <p className="text-gray-600 mt-2">Manage neighborhood articles and content</p>
        </div>
        <Link href="/admin/dashboard">
          <Button variant="outline">← Back to Dashboard</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {neighborhoods.map((neighborhood) => (
          <Card key={neighborhood.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{neighborhood.name}</CardTitle>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    {neighborhood.location}
                  </div>
                </div>
                <div className="flex gap-1">
                  {neighborhood.featuredEdmonton && (
                    <Badge variant="default" className="text-xs">Featured</Badge>
                  )}
                  {neighborhood.trendingEdmonton && (
                    <Badge variant="secondary" className="text-xs">Trending</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {neighborhood.description}
              </p>
              
              <div className="flex flex-wrap gap-1 mb-4">
                {neighborhood.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {neighborhood.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{neighborhood.tags.length - 3} more
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                <Link href={`/edmonton/neighborhoods/${neighborhood.slug}`} target="_blank">
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </Link>
                <Link href={`/admin/neighborhoods/${neighborhood.slug}/edit`}>
                  <Button size="sm" className="w-full">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">How to Edit Neighborhood Articles</h3>
        <p className="text-blue-800 text-sm">
          Currently, neighborhood articles are stored in the data file. To edit them:
        </p>
        <ol className="text-blue-800 text-sm mt-2 list-decimal list-inside space-y-1">
          <li>Click "Edit" on any neighborhood card above</li>
          <li>This will show you the current content and allow you to modify it</li>
          <li>Changes are saved directly to the data file</li>
          <li>You can also edit the file directly at: <code className="bg-blue-100 px-1 rounded">lib/data/edmonton-neighborhoods.ts</code></li>
        </ol>
      </div>
    </div>
  )
}
