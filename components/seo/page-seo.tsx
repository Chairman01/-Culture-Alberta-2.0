import Head from 'next/head'
import { Metadata } from 'next'

interface PageSEOProps {
  title: string
  description: string
  url?: string
  image?: string
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  author?: string
  section?: string
  tags?: string[]
}

export function PageSEO({
  title,
  description,
  url,
  image = 'https://www.culturealberta.com/images/culture-alberta-og.jpg',
  type = 'website',
  publishedTime,
  modifiedTime,
  author = 'Culture Alberta',
  section,
  tags = []
}: PageSEOProps) {
  const fullTitle = title.includes('Culture Alberta') ? title : `${title} | Culture Alberta`
  const fullUrl = url ? `https://www.culturealberta.com${url}` : 'https://www.culturealberta.com'

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={tags.join(', ')} />
      <meta name="robots" content="index, follow" />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Culture Alberta" />
      <meta property="og:locale" content="en_CA" />
      
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {author && <meta property="article:author" content={author} />}
      {section && <meta property="article:section" content={section} />}
      {tags.length > 0 && <meta property="article:tag" content={tags.join(', ')} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@culturealberta" />
      
      {/* Canonical - Always add canonical tag for proper indexing */}
      <link rel="canonical" href={fullUrl} />
    </Head>
  )
}
