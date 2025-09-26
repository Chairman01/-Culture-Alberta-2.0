import Head from 'next/head'

interface ArticleSEOProps {
  title: string
  description: string
  url?: string
  image?: string
  publishedTime?: string
  modifiedTime?: string
  author?: string
  section?: string
  tags?: string[]
  category?: string
  slug?: string
}

export function ArticleSEO({
  title,
  description,
  url,
  image = 'https://www.culturealberta.com/images/culture-alberta-og.jpg',
  publishedTime,
  modifiedTime,
  author = 'Culture Alberta',
  section = 'Culture',
  tags = [],
  category,
  slug
}: ArticleSEOProps) {
  const fullTitle = title.includes('Culture Alberta') ? title : `${title} | Culture Alberta`
  const fullUrl = url ? `https://www.culturealberta.com${url}` : 'https://www.culturealberta.com'
  // Handle image URL properly - use article image if available, otherwise use default
  const articleImage = image || '/images/culture-alberta-og.jpg'
  
  // Ensure image URL is absolute
  const absoluteImageUrl = articleImage.startsWith('http') 
    ? articleImage 
    : `https://www.culturealberta.com${articleImage}`
  
  // Debug logging for SEO image
  console.log('ArticleSEO Image Debug:', {
    originalImage: image,
    articleImage,
    absoluteImageUrl,
    title
  })

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={[...tags, category, 'Alberta', 'Culture'].filter(Boolean).join(', ')} />
      <meta name="robots" content="index, follow" />
      <meta name="author" content={author} />
      
      {/* Open Graph - Enhanced for better social sharing */}
      <meta property="og:type" content="article" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={absoluteImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:site_name" content="Culture Alberta" />
      <meta property="og:locale" content="en_CA" />
      
      {/* Article specific Open Graph tags */}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {author && <meta property="article:author" content={author} />}
      {section && <meta property="article:section" content={section} />}
      {category && <meta property="article:section" content={category} />}
      {tags.length > 0 && tags.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}
      
      {/* Twitter Card - Enhanced */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImageUrl} />
      <meta name="twitter:image:alt" content={title} />
      <meta name="twitter:site" content="@culturealberta" />
      <meta name="twitter:creator" content="@culturealberta" />
      
      {/* Canonical URL */}
      {url && <link rel="canonical" href={fullUrl} />}
      
      {/* Additional meta tags for better SEO */}
      <meta name="article:author" content={author} />
      <meta name="article:section" content={section} />
      {category && <meta name="article:section" content={category} />}
      
      {/* Structured Data for Article */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": title,
            "description": description,
            "image": absoluteImageUrl,
            "author": {
              "@type": "Organization",
              "name": author,
              "url": "https://www.culturealberta.com"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Culture Alberta",
              "logo": {
                "@type": "ImageObject",
                "url": "https://www.culturealberta.com/favicon.svg",
                "width": "32",
                "height": "32"
              }
            },
            "datePublished": publishedTime,
            "dateModified": modifiedTime || publishedTime,
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": fullUrl
            },
            "articleSection": section,
            "keywords": [...tags, category].filter(Boolean).join(", "),
            "inLanguage": "en-CA",
            "isAccessibleForFree": true
          })
        }}
      />
    </Head>
  )
}
