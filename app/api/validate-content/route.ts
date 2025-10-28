import { NextRequest, NextResponse } from 'next/server'
import { validateContentForIndexing, detectDuplicateContent } from '@/lib/seo-cursor-web'
import { createApiResponse } from '@/lib/cursor-web-utils'

export async function POST(request: NextRequest) {
  try {
    const { content, existingContent = [] } = await request.json()
    
    if (!content) {
      return NextResponse.json(
        createApiResponse(false, undefined, 'Content is required', 'Validation failed'),
        { status: 400 }
      )
    }
    
    // Validate content for indexing
    const validation = validateContentForIndexing(content)
    
    // Check for duplicate content
    const duplicateCheck = detectDuplicateContent(
      `${content.title} ${content.description} ${content.body}`,
      existingContent
    )
    
    const result = {
      validation,
      duplicateCheck,
      recommendations: []
    }
    
    // Generate recommendations
    if (!validation.isValid) {
      result.recommendations.push('Fix content validation issues before publishing')
    }
    
    if (duplicateCheck.isDuplicate) {
      result.recommendations.push('Content appears to be duplicate - consider rewriting')
    }
    
    if (content.title && content.title.length < 30) {
      result.recommendations.push('Consider making title longer for better SEO')
    }
    
    if (content.description && content.description.length < 120) {
      result.recommendations.push('Description should be 120-160 characters for optimal SEO')
    }
    
    return NextResponse.json(createApiResponse(
      true,
      result,
      undefined,
      'Content validation completed'
    ))
    
  } catch (error) {
    console.error('Content validation error:', error)
    return NextResponse.json(
      createApiResponse(
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error',
        'Content validation failed'
      ),
      { status: 500 }
    )
  }
}
