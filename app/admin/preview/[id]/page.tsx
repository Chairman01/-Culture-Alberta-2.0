import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

// Never cache a preview: an editor tweaking a draft must see the current row,
// not a 30-minute-old copy.
export const dynamic = 'force-dynamic'
export const revalidate = 0

type PreviewArticle = {
  id: string
  title: string
  content: string | null
  excerpt: string | null
  category: string | null
  location: string | null
  author: string | null
  status: string | null
  slug: string | null
  image_url: string | null
  created_at: string | null
}

// Reads drafts on purpose. Safe because every /admin/* route is gated by the
// JWT check in middleware.ts — this page is unreachable without an admin session.
async function getArticleForPreview(id: string): Promise<PreviewArticle | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  const supabase = createClient(url, key)
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, content, excerpt, category, location, author, status, slug, image_url, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return data as PreviewArticle
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className={`sticky top-0 z-10 border-b px-4 py-3 ${
          isDraft ? 'bg-amber-100 border-amber-300' : 'bg-green-100 border-green-300'
        }`}
      >
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <strong>{isDraft ? 'DRAFT PREVIEW' : 'PUBLISHED'}</strong>
            <span className="text-gray-700">
              {isDraft
                ? ' — this is not visible to the public. Only you can see this page.'
                : ' — this article is live on the site.'}
            </span>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href={`/admin/edit-post/${article.id}`} className="text-blue-700 hover:underline">
              Edit
            </Link>
            <Link href="/admin/articles" className="text-blue-700 hover:underline">
              All articles
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-10">
          <div className="mb-2 text-sm text-gray-500">
            {[article.category, article.location].filter(Boolean).join(' · ')}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">{article.title}</h1>

          {article.excerpt && (
            <p className="text-lg text-gray-700 mb-6">{article.excerpt}</p>
          )}

          <div className="text-sm text-gray-500 border-b pb-4 mb-6">
            {article.author || 'Culture Alberta'}
            {article.created_at && ` · ${new Date(article.created_at).toLocaleDateString('en-CA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}`}
          </div>

          {article.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full rounded-lg mb-6"
            />
          ) : (
            <div className="mb-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
              No cover image set. Add one in the editor before publishing.
            </div>
          )}

          {article.content ? (
            <div
              className="prose prose-lg max-w-none article-content-wrapper"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          ) : (
            <p className="text-gray-500">This article has no content.</p>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-500">
          Slug: <code>{article.slug || '(none)'}</code>
          {isDraft && ' · Publishing is done from the admin articles list.'}
        </div>
      </div>
    </div>
  )
}
