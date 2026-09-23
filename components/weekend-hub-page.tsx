import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarDays, ChevronRight, Clock } from 'lucide-react'
import ArticleNewsletterSignup from '@/components/article-newsletter-signup'
import { ArticleEmbedActivator } from '@/components/article-embed-activator'
import { ArticleStructuredData, ListicleStructuredData } from '@/components/seo/structured-data'
import { buildSeoTitle } from '@/lib/seo/title'
import { getSocialImageUrl } from '@/lib/social-image-url'
import { processArticleContent } from '@/lib/utils/youtube'
import type { Article } from '@/lib/types/article'
import { getWeekendGuides, WEEKEND_CITIES, type WeekendCity, type WeekendGuides } from '@/lib/weekend-guides'

/**
 * The permanent "Things to Do in {City} This Weekend" page. It renders the
 * newest published weekend guide for the city (see lib/weekend-guides.ts) and
 * links the earlier ones, so the one URL keeps its ranking from week to week.
 * The newest guide's own article page points its canonical here while it is
 * the current one (app/articles/[slug]/page.tsx).
 */

const BASE_URL = 'https://www.culturealberta.com'
// A guide older than this has missed a Thursday; say so rather than pass last
// weekend off as this one.
const STALE_AFTER_DAYS = 8

const hubTitle = (city: WeekendCity) => `Things to Do in ${WEEKEND_CITIES[city].label} This Weekend`

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Edmonton',
  })
}

function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Edmonton',
  })
}

async function loadGuides(city: WeekendCity): Promise<WeekendGuides> {
  try {
    return await getWeekendGuides(city)
  } catch (err) {
    console.error('[weekend-hub] could not load guides:', err)
    return { latest: null, past: [] }
  }
}

export async function buildWeekendHubMetadata(city: WeekendCity): Promise<Metadata> {
  const { label, path } = WEEKEND_CITIES[city]
  const url = `${BASE_URL}${path}`
  const { latest } = await loadGuides(city)
  const description =
    latest?.excerpt ||
    `The best things to do in ${label} this weekend, picked by Culture Alberta and updated every Thursday: festivals, markets, food, family outings and free events.`
  const image = getSocialImageUrl(latest?.imageUrl)

  return {
    title: buildSeoTitle(hubTitle(city)),
    description,
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    },
    openGraph: {
      type: 'article',
      title: hubTitle(city),
      description,
      url,
      siteName: 'Culture Alberta',
      locale: 'en_CA',
      images: [{ url: image, width: 1200, height: 630, alt: hubTitle(city) }],
      ...(latest ? { modifiedTime: latest.updatedAt || latest.createdAt } : {}),
    },
    twitter: { card: 'summary_large_image', title: hubTitle(city), description, images: [image] },
  }
}

export async function WeekendHubPage({ city }: { city: WeekendCity }) {
  const { label, path } = WEEKEND_CITIES[city]
  const otherCity: WeekendCity = city === 'edmonton' ? 'calgary' : 'edmonton'
  const url = `${BASE_URL}${path}`
  const { latest, past } = await loadGuides(city)
  const title = hubTitle(city)

  const updated = latest ? latest.updatedAt || latest.createdAt : null
  const isStale = latest
    ? Date.now() - new Date(latest.createdAt).getTime() > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000
    : false

  // Structured data describes this page, not the dated article it draws from.
  const schemaArticle: Article | null = latest
    ? {
        id: latest.id,
        title,
        slug: latest.slug,
        content: latest.content,
        excerpt: latest.excerpt || undefined,
        imageUrl: latest.imageUrl || undefined,
        author: latest.author || undefined,
        tags: latest.tags,
        category: label,
        location: `${label}, Alberta`,
        date: latest.createdAt,
        createdAt: latest.createdAt,
        updatedAt: latest.updatedAt || latest.createdAt,
      }
    : null

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: label, item: `${BASE_URL}/${city}` },
      { '@type': 'ListItem', position: 3, name: 'Things to Do This Weekend', item: url },
    ],
  }

  return (
    <div className="bg-white">
      {schemaArticle && (
        <>
          <ArticleStructuredData article={schemaArticle} pageUrl={url} />
          <ListicleStructuredData article={{ ...schemaArticle, title: latest!.title }} pageUrl={url} />
        </>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <nav className="flex items-center gap-1.5 text-sm text-gray-500 flex-wrap" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
            <Link href={`/${city}`} className="hover:text-blue-600 transition-colors">{label}</Link>
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-gray-700">Things to Do This Weekend</span>
          </nav>

          <header className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Updated every Thursday</p>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-gray-900">{title}</h1>
            {latest && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                {updated && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Updated {formatDay(updated)}
                  </span>
                )}
                {latest.author && <span className="font-medium">By {latest.author}</span>}
              </div>
            )}
          </header>

          {isStale && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              These are our most recent picks, from {formatDay(latest!.createdAt)}. The next guide comes out on
              Thursday. For what&apos;s on right now, see the{' '}
              <Link href="/events" className="font-medium underline">events calendar</Link>.
            </p>
          )}

          {latest ? (
            <>
              <section className="space-y-6" aria-labelledby="this-week">
                <h2 id="this-week" className="text-2xl font-bold text-gray-900">
                  <span className="block text-sm font-semibold uppercase tracking-wide text-gray-500 mb-1">This week&apos;s guide</span>
                  {latest.title}
                </h2>

                {latest.imageUrl && !latest.imageUrl.startsWith('data:image') && (
                  <div>
                    <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-gray-100">
                      <Image
                        src={latest.imageUrl}
                        alt={latest.title}
                        fill
                        className="object-cover"
                        priority
                        sizes="(max-width: 768px) 100vw, 900px"
                        quality={85}
                      />
                    </div>
                    {latest.imageSource && (
                      <p className="mt-2 text-sm text-gray-500 text-right">Photo: {latest.imageSource}</p>
                    )}
                  </div>
                )}

                {latest.excerpt && <p className="text-xl text-gray-600 leading-relaxed">{latest.excerpt}</p>}

                {/* Same wrapper classes as an article page: Mediavine places in-content ads
                    inside .article-content-wrapper, and the newsletter popup tracks .article-content. */}
                <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 border border-gray-100">
                  <div className="article-content">
                    <div
                      className="prose prose-lg max-w-none article-content-wrapper"
                      dangerouslySetInnerHTML={{ __html: processArticleContent(latest.content) }}
                      suppressHydrationWarning={true}
                    />
                  </div>
                  <ArticleEmbedActivator />
                </div>
              </section>

              <ArticleNewsletterSignup
                articleTitle={title}
                articleCategory={label}
                articleImageUrl={latest.imageUrl || undefined}
                variant="fixed"
              />
              <ArticleNewsletterSignup
                articleTitle={title}
                articleCategory={label}
                articleImageUrl={latest.imageUrl || undefined}
                variant="inline"
              />
            </>
          ) : (
            <p className="text-lg text-gray-700">
              This weekend&apos;s guide is on its way. In the meantime, everything happening in {label} is on the{' '}
              <Link href="/events" className="text-blue-600 underline">events calendar</Link>.
            </p>
          )}

          <section className="rounded-xl border border-gray-200 bg-gray-50 p-6 space-y-3" aria-labelledby="plan-more">
            <h2 id="plan-more" className="text-xl font-bold text-gray-900">Plan the rest of your weekend</h2>
            <ul className="space-y-2 text-gray-800">
              <li>
                <Link href="/events" className="inline-flex items-center gap-2 text-blue-700 hover:underline">
                  <CalendarDays className="w-4 h-4" />
                  Every upcoming event in Edmonton and Calgary
                </Link>
              </li>
              <li>
                <Link href={`/${city}`} className="inline-flex items-center gap-2 text-blue-700 hover:underline">
                  <ArrowRight className="w-4 h-4" />
                  More from {label}: food, openings and local stories
                </Link>
              </li>
              <li>
                <Link href={WEEKEND_CITIES[otherCity].path} className="inline-flex items-center gap-2 text-blue-700 hover:underline">
                  <ArrowRight className="w-4 h-4" />
                  {hubTitle(otherCity)}
                </Link>
              </li>
            </ul>
          </section>

          {past.length > 0 && (
            <section className="space-y-3" aria-labelledby="past-weekends">
              <h2 id="past-weekends" className="text-xl font-bold text-gray-900">Past weekend guides</h2>
              <ul className="divide-y divide-gray-100 border-y border-gray-100">
                {past.map((guide) => (
                  <li key={guide.id} className="py-3">
                    <Link href={`/articles/${guide.slug}`} className="group flex flex-col gap-0.5">
                      <span className="text-xs text-gray-500">{formatShort(guide.createdAt)}</span>
                      <span className="font-medium text-gray-900 group-hover:text-blue-700">{guide.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
