import { Job } from '@/lib/types/job'
import { JOB_CITY_LABELS, formatSalary } from '@/lib/jobs'
import type { BrowserJob } from './jobs-browser'

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  TEMPORARY: 'Temporary',
  INTERN: 'Internship',
}

export function formatPostedDate(iso: string | null): string | undefined {
  if (!iso) return undefined
  try {
    return new Date(iso).toLocaleDateString('en-CA', {
      timeZone: 'America/Edmonton', month: 'long', day: 'numeric', year: 'numeric',
    })
  } catch {
    return undefined
  }
}

export function employmentLabel(type: string | null): string | undefined {
  if (!type) return undefined
  return EMPLOYMENT_LABELS[type] || undefined
}

export function toBrowserJob(job: Job): BrowserJob {
  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    company: job.company,
    city: JOB_CITY_LABELS[job.city] as BrowserJob['city'],
    category: job.category || 'Other',
    salaryText: formatSalary(job) || undefined,
    postedAt: job.posted_at || undefined,
    postedLabel: formatPostedDate(job.posted_at),
    employmentType: employmentLabel(job.employment_type),
    snippet: job.description_snippet?.slice(0, 200) || undefined,
    featured: job.is_featured || undefined,
    manual: job.is_manual || undefined,
  }
}
