import Link from 'next/link'
import Image from 'next/image'
import { Clock, Bookmark } from 'lucide-react'
import { getServiceClient } from '@/lib/supabase-admin'
import { processArticleContent } from '@/lib/utils/youtube'
import { ArticleEmbedActivator } from '@/components/article-embed-activator'

// Never cache a preview: an editor tweaking a draft must see the current row,
// not a 30-minute-old copy.
export const dynamic = 'force-dynamic'
export const revalidate = 0

type PreviewArticle = {
  id: string
  title: string
  content: string | null
  excerpt: string | null
  description: string | null
  category: string | null
  location: string | null
  author: string | null
  status: string | null
  slug: string | null
  image_url: string | null
  image_source: string | null
  read_time: string | null
  date: string | null
  created_at: string | null
}

// Reads drafts on purpose. Safe because every /admin/* route is gated by the
// JWT check in middleware.ts — this page is unreachable without an admin session.
async function getArticleForPreview(id: string): Promise<PreviewArticle | null> {
  // Service role: once RLS limits `anon` to published rows, the anon key can no
  // longer see the drafts this page exists to show.
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('articles')
    // One string literal, not a concatenation — the client infers the row type
    // from the literal and silently gives up on anything it has to evaluate.
    .select('id, title, content, excerpt, description, category, location, author, status, slug, image_url, image_source, read_time, date, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return data as PreviewArticle
}

/** Same format and timezone the public article page prints. */
function formatDate(value: string | null): string {
  if (!value?.trim()) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Edmonton',
  }).format(date)
}

export default async function AdminArticlePreview({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const article = await getArticleForPreview(id)

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold mb-2">Article not found</h1>
        <p className="text-gray-600 mb-6">No article with id <code>{id}</code>.</p>
        <Link href="/admin/articles" className="text-blue-600 hover:underline">
          Back to all articles
        </Link>
      </div>
    )
  }

  const isDraft = article.status !== 'published'
  const published = formatDate(article.date || article.created_at)
  const lead = article.description || article.excerpt
  const hasBody = !!article.content && article.content.trim().length > 10

  return (
    <div className="min-h-screen bg-gray-50">
      {/* The one thing a reader would not see, kept deliberately loud so nobody
          mistakes this page for the live article. */}
      <div
        className={`sticky top-0 z-30 border-b px-4 py-3 ${
          isDraft ? 'bg-amber-100 border-amber-300' : 'bg-green-100 border-green-300'
        }`}
      >
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <strong>{isDraft ? 'DRAFT PREVIEW' : 'PUBLISHED'}</strong>
            <span className="text-gray-700">
              {isDraft
                ? ' — this is how it will look once approved. Nobody else can see this page.'
                : ' — this article is live on the site.'}
            </span>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href={`/admin/articles/${article.id}`} className="text-blue-700 hover:underline">
              Edit
            </Link>
            <Link href="/admin/review" className="text-blue-700 hover:underline">
              Review queue
            </Link>
          </div>
        </div>
      </div>

      {/* Below this line the markup mirrors app/articles/[slug]/page.tsx — same
          classes, same order, same date and byline formatting — so what an
          editor approves is what the page will render. */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            {article.category && (
              <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-800">
                {article.category}
              </span>
            )}
            {published && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {published}
              </span>
            )}
            {article.read_time && (
              <span className="flex items-center gap-1">
                <Bookmark className="h-4 w-4" />
                {article.read_time} read
              </span>
            )}
            {article.author && <span className="font-medium">By {article.author}</span>}
          </div>

          <h1 className="text-4xl font-bold leading-tight text-gray-900 lg:text-5xl">
            {article.title}
          </h1>

          {lead && <p className="max-w-3xl text-xl leading-relaxed text-gray-600">{lead}</p>}
        </div>

        <div className="mt-6">
          {article.image_url && !article.image_url.startsWith('data:image') ? (
            <>
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-gray-100">
                <Image
                  src={article.image_url}
                  alt={article.title || 'Article image'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 900px"
                  quality={85}
                  unoptimized
                />
              </div>
              {article.image_source && (
                <p className="mt-2 text-right text-sm text-gray-500">
                  Photo: {article.image_source}
                </p>
              )}
            </>
          ) : (
            // Not a reader-facing state — it is the single most common thing
            // missing from a draft, and the preview is where it gets noticed.
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
              No cover image set. Add one in the editor before approving.
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="article-content">
            {hasBody ? (
              <>
                <div
                  className="prose prose-lg max-w-none article-content-wrapper"
                  dangerouslySetInnerHTML={{ __html: processArticleContent(article.content!) }}
                />
                <ArticleEmbedActivator />
              </>
            ) : (
              <p className="text-gray-500">This article has no content yet.</p>
            )}
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          Will publish at <code>/articles/{article.slug || '(no slug yet)'}</code>
        </div>
      </div>
    </div>
  )
}
