import { Article } from '@/lib/types/article'

interface ArticleSchemaProps {
  article: Article
  baseUrl?: string
}

export function ArticleSchema({ article, baseUrl = 'https://www.culturealberta.com' }: ArticleSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.excerpt || article.content?.substring(0, 160),
    "image": article.image || `${baseUrl}/images/placeholder.jpg`,
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
    "datePublished": article.created_at,
    "dateModified": article.updated_at || article.created_at,
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
