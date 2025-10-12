import { NextRequest, NextResponse } from 'next/server'
import { getAllArticles } from '@/lib/supabase-articles'
import fs from 'fs'
import path from 'path'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST /api/sync-fallback - Sync latest articles from Supabase to articles.json fallback file
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Syncing latest articles from Supabase to articles.json...')
    
    // Get fresh articles from Supabase
    const articles = await getAllArticles()
    console.log(`📊 Retrieved ${articles.length} articles from Supabase`)
    
    // Create the articles.json path
    const articlesJsonPath = path.join(process.cwd(), 'articles.json')
    
    // Write articles to file
    fs.writeFileSync(articlesJsonPath, JSON.stringify(articles, null, 2))
    
    console.log(`✅ Successfully synced ${articles.length} articles to articles.json`)
    
    // Get file stats
    const stats = fs.statSync(articlesJsonPath)
    const fileSizeKB = Math.round(stats.size / 1024)
    
    return NextResponse.json({
      success: true,
      message: `Successfully synced ${articles.length} articles to articles.json`,
      stats: {
        articleCount: articles.length,
        fileSizeKB: fileSizeKB,
        lastUpdated: new Date().toISOString(),
        sampleArticles: articles.slice(0, 3).map(a => ({
          title: a.title,
          date: a.createdAt || a.date
        }))
      }
    })
  } catch (error) {
    console.error('❌ Error syncing articles to fallback file:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET /api/sync-fallback - Check current status of articles.json file
export async function GET(request: NextRequest) {
  try {
    const articlesJsonPath = path.join(process.cwd(), 'articles.json')
    
    if (!fs.existsSync(articlesJsonPath)) {
      return NextResponse.json({
        success: false,
        message: 'articles.json file does not exist',
        needsSync: true
      })
    }
    
    // Read and parse the file
    const fileContent = fs.readFileSync(articlesJsonPath, 'utf-8')
    const articles = JSON.parse(fileContent)
    
    // Get file stats
    const stats = fs.statSync(articlesJsonPath)
    const lastModified = stats.mtime
    
    // Calculate age of the file
    const ageHours = Math.round((Date.now() - lastModified.getTime()) / (1000 * 60 * 60))
    
    return NextResponse.json({
      success: true,
      message: `articles.json exists with ${articles.length} articles`,
      stats: {
        articleCount: articles.length,
        lastModified: lastModified.toISOString(),
        ageHours: ageHours,
        needsSync: ageHours > 24, // Consider syncing if older than 24 hours
        sampleArticles: articles.slice(0, 3).map((a: any) => ({
          title: a.title,
          date: a.createdAt || a.date
        }))
      }
    })
  } catch (error) {
    console.error('❌ Error checking articles.json status:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
