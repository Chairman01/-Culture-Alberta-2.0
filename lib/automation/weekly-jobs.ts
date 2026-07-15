/**
 * Weekly jobs article orchestrator ("Who's Hiring in {City} This Week").
 *
 * Queries the past week's active jobs from the jobs table, has Claude write
 * a per-city roundup (every job links to its INTERNAL /jobs/posting page),
 * and inserts the article — same proven service-role insert pattern as
 * weekend-events.ts. Runs Mondays via /api/cron/weekly-jobs (vercel.json).
 */

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { generateJobsArticle, JobsArticleJob } from './article-generator'
import { getCityWeekendPhoto } from './pexels'
import { createSlug } from '@/lib/utils/slug'
import { formatSalary, JOB_CITY_LABELS, JOB_CITIES } from '@/lib/jobs'
import { Job, JobCity } from '@/lib/types/job'

// Don't publish a thin roundup — skip the city that week instead
const MIN_JOBS_FOR_ARTICLE = 8
const MAX_JOBS_IN_ARTICLE = 25

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export interface WeeklyJobsResult {
  success: boolean
  city: string
  cityLabel: string
  articleId?: string
  articleSlug?: string
  title?: string
  jobsFound: number
  jobsUsed: number
  error?: string
}

function weekLabel(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', {
    timeZone: 'America/Edmonton', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function toArticleJob(job: Job): JobsArticleJob {
  return {
    title: job.title,
    company: job.company,
    category: job.category || 'Other',
    salaryText: formatSalary(job),
    employmentType: job.employment_type ? EMPLOYMENT_LABELS[job.employment_type] || null : null,
    snippet: job.description_snippet?.slice(0, 300) || null,
    postingPath: `/jobs/posting/${job.slug}`,
    postedLabel: job.posted_at
      ? new Date(job.posted_at).toLocaleDateString('en-CA', { timeZone: 'America/Edmonton', month: 'long', day: 'numeric' })
      : null,
  }
}

export async function generateWeeklyJobsArticleForCity(
  city: JobCity,
  publishStatus: 'draft' | 'published' = 'draft'
): Promise<WeeklyJobsResult> {
  const cityLabel = JOB_CITY_LABELS[city]
  console.log(`\n[weekly-jobs] === Generating jobs article for ${cityLabel} ===`)

  const supabase = getSupabaseAdmin()

  // Jobs posted in the last 7 days, featured first, best-paying first among
  // the rest so the roundup leads with substance.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error: queryError } = await supabase
    .from('jobs')
    .select('*')
    .eq('city', city)
    .eq('status', 'active')
    .gte('posted_at', weekAgo)
    .order('is_featured', { ascending: false })
    .order('salary_max', { ascending: false, nullsFirst: false })
    .limit(MAX_JOBS_IN_ARTICLE)

  if (queryError) {
    return { success: false, city, cityLabel, jobsFound: 0, jobsUsed: 0, error: queryError.message }
  }

  const jobs = (data as Job[]) ?? []
  if (jobs.length < MIN_JOBS_FOR_ARTICLE) {
    const error = `Only ${jobs.length} new jobs for ${cityLabel} this week — below minimum of ${MIN_JOBS_FOR_ARTICLE}, skipping`
    console.warn(`[weekly-jobs] ${error}`)
    return { success: false, city, cityLabel, jobsFound: jobs.length, jobsUsed: 0, error }
  }

  // Cover photo (non-fatal)
  let imageUrl: string | undefined
  let imageSource: string | undefined
  try {
    const photo = await getCityWeekendPhoto(city)
    imageUrl = photo.url
    imageSource = photo.credit
  } catch (err) {
    console.warn('[weekly-jobs] Photo fetch failed (non-fatal):', err)
  }

  // Generate the article
  const label = weekLabel()
  let article
  try {
    article = await generateJobsArticle(city, cityLabel, label, jobs.map(toArticleJob))
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error(`[weekly-jobs] Generation failed for ${cityLabel}:`, error)
    return { success: false, city, cityLabel, jobsFound: jobs.length, jobsUsed: jobs.length, error }
  }

  // Slug + duplicate check
  const baseSlug = createSlug(article.title)
  const { data: existing } = await supabase
    .from('articles')
    .select('slug')
    .eq('slug', baseSlug)
    .maybeSingle()
  const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug

  const articleId = `article-auto-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  const now = new Date().toISOString()

  const { data: inserted, error: insertError } = await supabase
    .from('articles')
    .insert([{
      id: articleId,
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      category: cityLabel,
      categories: [cityLabel, 'Careers'],
      location: cityLabel,
      author: 'Culture Alberta',
      tags: ['jobs', city, 'hiring', 'careers'],
      type: 'article',
      status: publishStatus,
      image_url: imageUrl || null,
      image_source: imageSource || null,
      slug,
      trending_home: false,
      trending_edmonton: false,
      trending_calgary: false,
      featured_home: false,
      featured_edmonton: false,
      featured_calgary: false,
      created_at: now,
      updated_at: now,
    }])
    .select()
    .single()

  if (insertError) {
    console.error(`[weekly-jobs] Insert failed for ${cityLabel}:`, insertError.message)
    return { success: false, city, cityLabel, jobsFound: jobs.length, jobsUsed: jobs.length, error: insertError.message }
  }

  try {
    revalidatePath('/', 'layout')
    revalidatePath('/articles')
    revalidatePath(`/articles/${slug}`)
    revalidatePath(`/${city}`)
    revalidatePath('/jobs')
    revalidatePath(`/jobs/${city}`)
  } catch {
    // Non-fatal
  }

  console.log(`[weekly-jobs] === Done: ${cityLabel} — "${article.title}" (${publishStatus}) ===\n`)

  return {
    success: true,
    city,
    cityLabel,
    articleId: inserted.id,
    articleSlug: slug,
    title: article.title,
    jobsFound: jobs.length,
    jobsUsed: jobs.length,
  }
}

export async function generateWeeklyJobsArticlesForAllCities(
  publishStatus: 'draft' | 'published' = 'draft'
): Promise<WeeklyJobsResult[]> {
  const results: WeeklyJobsResult[] = []
  for (const city of JOB_CITIES) {
    try {
      results.push(await generateWeeklyJobsArticleForCity(city, publishStatus))
    } catch (err) {
      results.push({
        success: false,
        city,
        cityLabel: JOB_CITY_LABELS[city],
        jobsFound: 0,
        jobsUsed: 0,
        error: err instanceof Error ? err.message : String(err),
      })
    }
    // Gentle pacing between Claude calls
    await new Promise(r => setTimeout(r, 2000))
  }
  return results
}
