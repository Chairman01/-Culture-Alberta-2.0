import { Article } from '@/lib/types/article'
import { getAbsoluteImageUrl, getSocialPreviewImageUrl } from '@/lib/social-image'

interface ArticleSchemaProps {
  article: Article
  baseUrl?: string
}

export function ArticleSchema({ article, baseUrl = 'https://www.culturealberta.com' }: ArticleSchemaProps) {
  const sourceImage = getAbsoluteImageUrl(article.imageUrl, baseUrl)
  const socialImage = getSocialPreviewImageUrl(article.imageUrl, baseUrl)

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.excerpt || article.content?.substring(0, 160),
    "image": [socialImage, sourceImage],
    "author": {
      "@type": "Organization",
      "name": "Culture Alberta",
      "url": baseUrl
    },
    "publisher": {
      "@type": "Organization",
      "name": "Culture Alberta",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/favicon.svg`
      }
    },
    "datePublished": article.createdAt,
    "dateModified": article.updatedAt || article.createdAt,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${baseUrl}/articles/${article.id}`
    },
    "articleSection": article.category || "Culture",
    "keywords": article.tags?.join(", ") || "Alberta, Culture, Events",
    "inLanguage": "en-CA",
    "isAccessibleForFree": true,
    "wordCount": article.content?.length || 0
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema)
      }}
    />
  )
}
