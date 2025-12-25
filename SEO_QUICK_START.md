# SEO Rich Results - Quick Start Guide

## 🚀 Quick Integration Checklist

### 1. Root Layout (Already Done ✅)
Location: `app/layout.tsx`

```typescript
import { SitelinksData, DEFAULT_NAVIGATION_LINKS } from '@/components/seo/sitelinks-data'

// In layout
<SitelinksData navigationLinks={DEFAULT_NAVIGATION_LINKS} />
```

### 2. Article Pages

Add to any article page:

```typescript
import { ArticleStructuredData, BreadcrumbStructuredData } from '@/components/seo/structured-data'
import { FAQSchema, extractFAQsFromContent } from '@/components/seo/faq-schema'
import { generatePageMetadata } from '@/lib/metadata-generator'

// Generate metadata
export async function generateMetadata({ params }) {
  const article = await getArticle(params.slug)
  return generatePageMetadata(article)
}

// In page component
<ArticleStructuredData article={article} />
<BreadcrumbStructuredData
  articleTitle={article.title}
  articleCategory={article.category}
  articleSlug={article.slug}
/>

// Optional: Add FAQs if article has Q&A
const faqs = extractFAQsFromContent(article.content)
{faqs.length > 0 && <FAQSchema faqs={faqs} />}
```

### 3. Category/Collection Pages

For `/articles`, `/events`, `/best-of` pages:

```typescript
import { CollectionSchema, articlesToCollectionItems } from '@/components/seo/collection-schema'

const articles = await getArticles()
const items = articlesToCollectionItems(articles)

<CollectionSchema
  items={items}
  collectionName="Latest Articles"
  collectionUrl="https://www.culturealberta.com/articles"
/>
```

### 4. Restaurant/Review Pages

```typescript
import { ReviewSchema, StarRating } from '@/components/seo/review-schema'

<ReviewSchema
  itemName="Restaurant Name"
  rating={4.5}
  reviewCount={100}
  reviewBody="Great dining experience..."
/>

// Show stars visually
<StarRating rating={4.5} />
```

### 5. Guide/Tutorial Pages

```typescript
import { HowToSchema } from '@/components/seo/howto-schema'

const steps = [
  { name: "Step 1", text: "Do this..." },
  { name: "Step 2", text: "Then this..." }
]

<HowToSchema
  name="How to Visit Calgary Stampede"
  description="Complete guide"
  steps={steps}
/>
```

## 🧪 Testing Your Implementation

### 1. Rich Results Test
Visit: https://search.google.com/test/rich-results

Enter your page URL and verify:
- ✅ All schemas detected
- ✅ No errors
- ✅ Preview looks correct

### 2. Check Source Code
View page source (Ctrl+U) and search for `application/ld+json`

You should see your schema JSON embedded in the page.

### 3. Submit to Google
1. Go to Google Search Console
2. Submit sitemap: `https://www.culturealberta.com/sitemap.xml`
3. Wait 2-4 weeks for rich results to appear

## 📊 Expected Timeline

- **1-3 days**: Google indexes new pages
- **1-2 weeks**: Structured data recognized
- **2-4 weeks**: Rich results start appearing
- **4-8 weeks**: Knowledge panel may appear

## 🎯 Priority Pages to Update First

1. **Homepage** - Already has sitelinks ✅
2. **Popular articles** - Add FAQ and Review schemas
3. **Category pages** - Add Collection schema
4. **Restaurant reviews** - Add Review schema
5. **Event pages** - Use Event schema (already exists)

## 📝 Content Best Practices

### FAQs
- Include 3-10 questions per page
- Use natural question phrasing
- Keep answers 2-3 sentences
- Focus on informational content

### Reviews
- Aggregate ratings from multiple sources
- Minimum 5 reviews recommended
- Include review date
- Keep reviews authentic

### Collections
- Order items logically (newest first, or by relevance)
- Include images when possible
- Use descriptive titles
- Limit to 10-20 items for best results

## ⚠️ Common Mistakes

❌ **Don't**: Create fake reviews or ratings  
✅ **Do**: Use genuine aggregate ratings

❌ **Don't**: Over-optimize with too many schemas  
✅ **Do**: Use relevant schemas for each page type

❌ **Don't**: Copy/paste same FAQs everywhere  
✅ **Do**: Create unique, helpful FAQs per page

❌ **Don't**: Expect instant results  
✅ **Do**: Wait 2-4 weeks and monitor Search Console

## 🔍 Monitoring Results

### Google Search Console
1. Go to **Enhancements**
2. Check:
   - Article rich results
   - FAQ rich results
   - Breadcrumbs
   - Site navigation

### Track Improvements
- Click-through rate (CTR)
- Average position
- Impressions
- Rich result eligible pages

## 🆘 Need Help?

See full guide: `SEO_RICH_RESULTS_GUIDE.md`

Example implementation: `EXAMPLE_ARTICLE_PAGE.tsx`

---

**Last Updated**: December 2024
