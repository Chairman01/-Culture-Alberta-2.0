/**
 * Content Validation
 * 
 * Validates article content to prevent truncated articles
 * and ensure content quality
 */

export interface ContentValidationResult {
  isValid: boolean
  issues: string[]
  warnings: string[]
  suggestions: string[]
}

export function validateArticleContent(article: {
  title: string
  content: string
  excerpt: string
  category: string
}): ContentValidationResult {
  const issues: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  // Title validation
  if (!article.title || article.title.trim().length === 0) {
    issues.push('Title is required')
  } else if (article.title.length < 10) {
    warnings.push('Title is very short (less than 10 characters)')
  } else if (article.title.length > 100) {
    warnings.push('Title is very long (over 100 characters)')
  }

  // Content validation
  if (!article.content || article.content.trim().length === 0) {
    issues.push('Content is required')
  } else {
    const contentLength = article.content.length
    
    // Check for truncated content
    if (contentLength < 100) {
      issues.push('Content is too short (less than 100 characters)')
    } else if (contentLength < 500) {
      warnings.push('Content is quite short (less than 500 characters)')
    }
    
    // Check for suspicious truncation patterns
    if (contentLength === 503) {
      issues.push('Content appears to be truncated (exactly 503 characters)')
    }
    
    // Check for incomplete sentences
    if (!article.content.endsWith('.') && !article.content.endsWith('!') && !article.content.endsWith('?')) {
      warnings.push('Content may be incomplete (does not end with punctuation)')
    }
    
    // Check for HTML content
    if (article.content.includes('<p>') && article.content.includes('</p>')) {
      // Count paragraphs
      const paragraphCount = (article.content.match(/<p>/g) || []).length
      if (paragraphCount < 2) {
        warnings.push('Content has only one paragraph')
      }
    }
  }

  // Excerpt validation
  if (!article.excerpt || article.excerpt.trim().length === 0) {
    warnings.push('Excerpt is missing')
  } else if (article.excerpt.length < 50) {
    warnings.push('Excerpt is very short (less than 50 characters)')
  } else if (article.excerpt.length > 300) {
    warnings.push('Excerpt is quite long (over 300 characters)')
  }

  // Category validation
  if (!article.category || article.category.trim().length === 0) {
    issues.push('Category is required')
  }

  // Suggestions based on content
  if (article.content && article.content.length > 1000) {
    suggestions.push('Consider adding subheadings to break up long content')
  }
  
  if (article.content && !article.content.includes('<img') && !article.content.includes('src=')) {
    suggestions.push('Consider adding images to make the content more engaging')
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    suggestions
  }
}

export function getContentQualityScore(article: {
  title: string
  content: string
  excerpt: string
  category: string
}): number {
  let score = 0
  const maxScore = 100

  // Title (20 points)
  if (article.title && article.title.length >= 10 && article.title.length <= 100) {
    score += 20
  } else if (article.title && article.title.length > 0) {
    score += 10
  }

  // Content length (40 points)
  if (article.content) {
    const contentLength = article.content.length
    if (contentLength >= 2000) {
      score += 40
    } else if (contentLength >= 1000) {
      score += 30
    } else if (contentLength >= 500) {
      score += 20
    } else if (contentLength >= 100) {
      score += 10
    }
  }

  // Content quality (20 points)
  if (article.content) {
    // Check for proper structure
    if (article.content.includes('<p>') && article.content.includes('</p>')) {
      score += 10
    }
    
    // Check for variety in content
    const hasImages = article.content.includes('<img') || article.content.includes('src=')
    const hasLinks = article.content.includes('<a href')
    const hasHeadings = article.content.includes('<h') || article.content.includes('##')
    
    if (hasImages) score += 5
    if (hasLinks) score += 3
    if (hasHeadings) score += 2
  }

  // Excerpt (10 points)
  if (article.excerpt && article.excerpt.length >= 50 && article.excerpt.length <= 300) {
    score += 10
  } else if (article.excerpt && article.excerpt.length > 0) {
    score += 5
  }

  // Category (10 points)
  if (article.category && article.category.trim().length > 0) {
    score += 10
  }

  return Math.min(score, maxScore)
}

export function getContentQualityLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Very Good'
  if (score >= 70) return 'Good'
  if (score >= 60) return 'Fair'
  if (score >= 40) return 'Poor'
  return 'Very Poor'
}
