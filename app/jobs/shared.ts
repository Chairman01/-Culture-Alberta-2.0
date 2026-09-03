import { Job } from '@/lib/types/job'
import { JOB_CITY_LABELS, formatSalary } from '@/lib/jobs'
import { BOARD_DOMAINS } from '@/lib/automation/ats/boards'
import { detectUnionStatus, inferEmploymentType, extractPay } from '@/lib/job-attributes'
import { resolveCategory } from '@/lib/job-categories'
import type { BrowserJob } from './jobs-browser'

/**
 * Employers we post manually, which have no ATS board to resolve a domain from.
 * Keyed by the exact company name stored on the job.
 */
const MANUAL_COMPANY_DOMAINS: Record<string, string> = {
  'Elections Alberta': 'elections.ab.ca',
  // Deliberately no entry for Hell's Kitchen: hellskitchenrestaurant.com only
  // publishes a 32px white-on-black favicon, which scales up to an indistinct
  // dark square. The lettered tile reads better until the real asset is hosted.
}

/**
 * Logo files we host ourselves, for employers whose own site blocks automated
 * requests or only publishes a 32px favicon — too small to render at the sizes
 * used on the board. Takes priority over the domain lookup; if the file is
 * missing the component falls back to the domain, then to a lettered tile, so
 * a missing asset never shows a broken image.
 */
const MANUAL_COMPANY_LOGOS: Record<string, string> = {
  "Hell's Kitchen at River Cree Resort": '/images/Hells-Kitchen-Logo.jpeg',
  // Google's favicon service 404s on calgarycoop.com — the only employer on the
  // board it doesn't know — which left the largest employer we carry showing an
  // empty tile across 149 postings. Their own site publishes a 192px icon.
  'Calgary Co-op': '/images/calgary-coop-logo.png',
}

/** Locally hosted logo for an employer, if we have one. */
export function logoSrcFor(job: Pick<Job, 'company'>): string | undefined {
  return MANUAL_COMPANY_LOGOS[job.company]
}

/**
 * Company website for the logo lookup. Resolved from the board registry rather
 * than stored per row, so correcting one employer's domain fixes every one of
 * their postings without a re-sync. Manual postings fall back to the map above —
 * without it they showed a lettered tile while every ATS job had a real logo.
 */
export function logoDomainFor(job: Pick<Job, 'ats_board' | 'company'>): string | undefined {
  if (job.ats_board && BOARD_DOMAINS[job.ats_board]) return BOARD_DOMAINS[job.ats_board]
  return MANUAL_COMPANY_DOMAINS[job.company]
}

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
    logoDomain: logoDomainFor(job),
    logoSrc: logoSrcFor(job),
    // Rows synced before the classifier existed hold null or a retired label;
    // resolving here categorises the whole back catalogue without a migration.
    category: resolveCategory(job.category, job.title),
    // Feed salary first, then whatever the employer stated in the body.
    salaryText: formatSalary(job) || extractPay(job.description_html) || undefined,
    postedAt: job.posted_at || undefined,
    postedLabel: formatPostedDate(job.posted_at),
    // Fall back to the description when the feed omits it — Greenhouse never
    // supplies employment type, which left a quarter of the board unlabelled.
    employmentType: employmentLabel(inferEmploymentType(job.employment_type, job.description_html)),
    unionStatus: detectUnionStatus(job.description_html),
    snippet: job.description_snippet?.slice(0, 200) || undefined,
    featured: job.is_featured || undefined,
    manual: job.is_manual || undefined,
  }
}
