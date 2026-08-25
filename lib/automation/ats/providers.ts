/**
 * One fetcher per ATS. Each returns raw postings in a common shape; mapping to
 * JobUpsertRow and Alberta filtering happen once, in ./index.ts.
 *
 * Response shapes here were read off the live APIs rather than the docs — the
 * published field lists are incomplete and, in Greenhouse's case, misleading
 * about encoding.
 */

import { AtsBoard } from './boards'

const TIMEOUT_MS = 15_000
const UA = 'CultureAlberta/1.0 (+https://www.culturealberta.com/jobs)'

/** Provider-neutral posting, before Alberta filtering. */
export interface RawPosting {
  /** Unique within the board. */
  id: string
  title: string
  /** Free text — matched against our municipalities downstream. */
  location: string
  /** Full description as HTML. The whole point of tier 2: this is what indexes. */
  descriptionHtml: string
  /** Where the candidate actually applies — the employer's own ATS page. */
  applyUrl: string
  postedAt: string | null
  employmentType: string | null
  /** Set only when the source states pay outright; otherwise read from the body later. */
  salaryLabel?: string | null
  /**
   * Closing date, when the provider returns one as a real field. Most don't —
   * for those it stays undefined and the date is read out of the description
   * body instead. Oracle Recruiting Cloud is the exception.
   */
  validThrough?: string | null
}

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: 'application/json', 'user-agent': UA, ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * Greenhouse returns `content` HTML-entity-encoded (`&lt;p&gt;`), so it renders
 * as visible tag soup unless decoded first. Every other provider returns real
 * HTML. Handles the five XML entities plus numeric escapes.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&') // last, so "&amp;lt;" doesn't become "<"
}

/**
 * Detail fetches to run at once on the providers that need a request per
 * posting. The sync has a 300-second ceiling on Vercel and every board runs in
 * the same invocation, so the detail phases — which are most of the wall clock
 * — cannot afford to be sequential: adding the retail boards in August 2026 put
 * roughly 250 more requests in the run, which one at a time would not have fit.
 *
 * Six is what the AHS reader has used against a far larger board without
 * trouble; it's polite to the employer and still cuts these phases sixfold.
 */
const DETAIL_CONCURRENCY = 6

/**
 * Map over items with a bounded number of requests in flight, preserving input
 * order. Failures are dropped, not thrown — one unreadable posting must never
 * sink a whole board.
 */
async function mapDetails<T, R>(
  items: T[],
  fn: (item: T) => Promise<R | null>
): Promise<R[]> {
  const out: Array<R | null> = new Array(items.length).fill(null)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(DETAIL_CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        try {
          out[i] = await fn(items[i])
        } catch {
          // Leaves a null, filtered out below.
        }
      }
    })
  )
  return out.filter((r): r is R => r !== null)
}

/**
 * The JobPosting JSON-LD a career site embeds in its own posting page.
 *
 * Career sites publish this so Google for Jobs can read them, which makes it
 * the one field set on these pages that is a contract rather than markup we
 * happen to be able to parse. A page can carry several blocks (breadcrumbs,
 * the organisation), so this returns the first one that is actually a
 * JobPosting rather than the first script tag.
 */
interface JobPostingSchema {
  title?: string
  description?: string
  datePosted?: string
  validThrough?: string
  employmentType?: string | string[]
  jobLocation?: SchemaPlace | SchemaPlace[]
}

interface SchemaPlace {
  address?: {
    addressLocality?: string
    addressRegion?: string
  }
}

function jobPostingSchema(html: string): JobPostingSchema | null {
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const parsed = JSON.parse(m[1])
      if (parsed?.['@type'] === 'JobPosting') return parsed as JobPostingSchema
    } catch {
      /* keep looking — one malformed block must not hide a later valid one */
    }
  }
  return null
}

function normaliseEmployment(value: string | null | undefined): string | null {
  if (!value) return null
  const v = value.toLowerCase().replace(/[\s_-]/g, '')
  if (v.includes('fulltime')) return 'FULL_TIME'
  if (v.includes('parttime')) return 'PART_TIME'
  if (v.includes('intern')) return 'INTERN'
  if (v.includes('temporary') || v.includes('contract')) return 'CONTRACTOR'
  return null
}

// ── Greenhouse ───────────────────────────────────────────────────────────────
interface GreenhouseJob {
  id: number
  title?: string
  content?: string
  absolute_url?: string
  location?: { name?: string }
  first_published?: string
  updated_at?: string
}

async function fetchGreenhouse(board: AtsBoard): Promise<RawPosting[]> {
  const data = (await getJson(
    `https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs?content=true`
  )) as { jobs?: GreenhouseJob[] }

  return (data.jobs ?? [])
    .filter(j => j.id && j.title && j.absolute_url)
    .map(j => ({
      id: String(j.id),
      title: j.title!.trim(),
      location: j.location?.name ?? '',
      descriptionHtml: decodeEntities(j.content ?? ''),
      applyUrl: j.absolute_url!,
      postedAt: j.first_published ?? j.updated_at ?? null,
      employmentType: null, // Greenhouse doesn't expose this on the board API
    }))
}

// ── Lever ────────────────────────────────────────────────────────────────────
interface LeverJob {
  id?: string
  text?: string
  description?: string
  descriptionBody?: string
  additional?: string
  lists?: Array<{ text?: string; content?: string }>
  categories?: { location?: string; commitment?: string }
  applyUrl?: string
  hostedUrl?: string
  createdAt?: number
}

async function fetchLever(board: AtsBoard): Promise<RawPosting[]> {
  const data = (await getJson(
    `https://api.lever.co/v0/postings/${board.token}?mode=json`
  )) as LeverJob[]

  return (Array.isArray(data) ? data : [])
    .filter(j => j.id && j.text)
    .map(j => {
      // Lever splits a posting across several fields; the page a candidate sees
      // is description + the bulleted lists + additional, in that order.
      const lists = (j.lists ?? [])
        .map(l => `<h3>${l.text ?? ''}</h3><ul>${l.content ?? ''}</ul>`)
        .join('')
      return {
        id: j.id!,
        title: j.text!.trim(),
        location: j.categories?.location ?? '',
        descriptionHtml: [j.description ?? j.descriptionBody ?? '', lists, j.additional ?? ''].join(''),
        applyUrl: j.applyUrl || j.hostedUrl!,
        postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
        employmentType: normaliseEmployment(j.categories?.commitment),
      }
    })
}

// ── Ashby ────────────────────────────────────────────────────────────────────
interface AshbyJob {
  id?: string
  title?: string
  location?: string
  secondaryLocations?: Array<{ location?: string }>
  descriptionHtml?: string
  applyUrl?: string
  jobUrl?: string
  publishedAt?: string
  employmentType?: string
  isListed?: boolean
}

async function fetchAshby(board: AtsBoard): Promise<RawPosting[]> {
  const data = (await getJson(
    `https://api.ashbyhq.com/posting-api/job-board/${board.token}?includeCompensation=true`
  )) as { jobs?: AshbyJob[] }

  return (data.jobs ?? [])
    .filter(j => j.id && j.title && j.isListed !== false)
    .map(j => ({
      id: j.id!,
      title: j.title!.trim(),
      // Secondary locations matter: a role can be posted in Vancouver with
      // Calgary as an additional office, and we'd otherwise miss it.
      location: [j.location, ...(j.secondaryLocations ?? []).map(s => s.location)]
        .filter(Boolean)
        .join('; '),
      descriptionHtml: j.descriptionHtml ?? '',
      applyUrl: j.applyUrl || j.jobUrl!,
      postedAt: j.publishedAt ?? null,
      employmentType: normaliseEmployment(j.employmentType),
    }))
}

// ── Workday ──────────────────────────────────────────────────────────────────
interface WorkdayListItem {
  title?: string
  externalPath?: string
  locationsText?: string
  bulletFields?: string[]
}

const WORKDAY_PAGE = 20
/**
 * 500 postings. Workday caps `limit` at 20, so this is purely a runaway guard.
 * Raised from 15 (300) when Save-On-Foods and Home Depot Canada were added:
 * both run ~370 postings nationally, and a 300 ceiling would have read four
 * fifths of each board while looking complete — the same failure that keeps BMO
 * and CIBC out of the registry.
 */
const WORKDAY_MAX_PAGES = 25

/**
 * Workday is the only two-call provider: the list endpoint carries titles and
 * locations but no descriptions, so each Alberta match needs a detail fetch.
 * The list is filtered to Alberta FIRST so a national employer costs a handful
 * of detail calls rather than one per posting company-wide.
 *
 * Paging has to be defensive, because some tenants never signal the end. Ask
 * Cenovus for offset 480 of a 40-posting board and it answers with a full page
 * of jobs rather than an empty one, so the naive "stop on a short page" test
 * never fired: we collected the same 40 postings twelve times over and spent a
 * detail request on each copy. The rows deduplicated later, at the database, so
 * nothing looked wrong — it just quietly cost 300 requests a sync.
 *
 * Three independent stops now: the tenant's own `total`, a page that adds
 * nothing new, and the page ceiling as a last resort.
 */
async function fetchWorkday(
  board: AtsBoard,
  isAlberta: (location: string) => boolean
): Promise<RawPosting[]> {
  const base = `https://${board.token}.${board.datacenter}.myworkdayjobs.com/wday/cxs/${board.token}/${board.site}`

  const albertaItems: WorkdayListItem[] = []
  const seen = new Set<string>()
  let total: number | null = null

  for (let page = 0; page < WORKDAY_MAX_PAGES; page++) {
    const data = (await getJson(`${base}/jobs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ appliedFacets: {}, limit: WORKDAY_PAGE, offset: page * WORKDAY_PAGE, searchText: '' }),
    })) as { jobPostings?: WorkdayListItem[]; total?: number }

    if (total === null && typeof data.total === 'number') total = data.total

    const items = data.jobPostings ?? []
    if (items.length === 0) break

    let fresh = 0
    for (const item of items) {
      const key = item.externalPath ?? `${item.title}|${item.locationsText}`
      if (seen.has(key)) continue
      seen.add(key)
      fresh++
      if (isAlberta(item.locationsText ?? '')) albertaItems.push(item)
    }

    if (fresh === 0) break
    if (total !== null && seen.size >= total) break
    if (items.length < WORKDAY_PAGE) break
  }

  return mapDetails(albertaItems, async item => {
    if (!item.externalPath) return null
    const detail = (await getJson(`${base}${item.externalPath}`)) as {
      jobPostingInfo?: {
        jobDescription?: string
        externalUrl?: string
        startDate?: string
        timeType?: string
        jobPostingId?: string
      }
    }
    const info = detail.jobPostingInfo
    if (!info?.externalUrl) return null
    return {
      id: info.jobPostingId || item.bulletFields?.[0] || item.externalPath,
      title: (item.title ?? '').trim(),
      location: item.locationsText ?? '',
      descriptionHtml: info.jobDescription ?? '',
      applyUrl: info.externalUrl,
      // `postedOn` is relative prose ("Posted 2 Days Ago"); startDate is real.
      postedAt: info.startDate ? new Date(info.startDate).toISOString() : null,
      employmentType: normaliseEmployment(info.timeType),
    }
  })
}

// ── SuccessFactors (Government of Alberta) ───────────────────────────────────

const SF_PAGE = 25
const SF_MAX_PAGES = 12
/** Detail fetches per run. Logged when hit, never silently truncated. */
const SF_MAX_DETAILS = 130

/**
 * SuccessFactors career sites publish an RSS feed, but it only carries the ten
 * most recent postings — the Government of Alberta runs ~140 at a time. The
 * search results paginate properly though, and each row already states the
 * location, so the Alberta filter runs on the cheap listing and only matching
 * jobs cost a detail request.
 */
async function fetchSuccessFactors(
  board: AtsBoard,
  isAlberta: (location: string) => boolean
): Promise<RawPosting[]> {
  const origin = `https://${board.domain}`
  const listing: Array<{ path: string; title: string; location: string; posted: string | null }> = []
  const seen = new Set<string>()

  for (let page = 0; page < SF_MAX_PAGES; page++) {
    const res = await fetch(`${origin}/search/?startrow=${page * SF_PAGE}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': UA },
    })
    if (!res.ok) break
    const html = await res.text()

    let fresh = 0
    for (const m of html.matchAll(/<tr class="data-row"[\s\S]*?<\/tr>/g)) {
      const tr = m[0]
      // Decoded, not raw: a title containing an ampersand ("Access & Privacy")
      // arrives as "&amp;" inside the href, and carrying that through produced
      // an apply URL that doesn't resolve.
      const path = tr.match(/href="(\/job\/[^"]+)"/)?.[1]?.replace(/&amp;/g, '&')
      if (!path || seen.has(path)) continue
      seen.add(path)
      fresh++
      // Entities must be decoded, not just tags stripped: titles arrive as
      // "Barrister &amp; Solicitor" and would render with the raw entity.
      const strip = (s?: string) =>
        decodeEntities((s ?? '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
      const title = strip(tr.match(/class="jobTitle-link"[^>]*>([\s\S]*?)<\/a>/)?.[1])
      listing.push({
        path,
        title,
        // Not every SuccessFactors site renders a location column. The Regional
        // Municipality of Wood Buffalo's doesn't, so every row read as "no
        // location" and the whole board was dropped by the Alberta filter.
        location: strip(tr.match(/class="jobLocation">([\s\S]*?)<\/span>/)?.[1])
          || locationFromSlug(path, title),
        posted: strip(tr.match(/class="jobDate">([\s\S]*?)<\/span>/)?.[1]) || null,
      })
    }
    if (fresh === 0) break
  }

  const wanted = listing.filter(j => j.title && isAlberta(j.location))
  if (wanted.length > SF_MAX_DETAILS) {
    console.warn(
      `[ats:${board.token}] ${wanted.length} Alberta jobs matched but only ${SF_MAX_DETAILS} descriptions fetched this run`
    )
  }

  return mapDetails(wanted.slice(0, SF_MAX_DETAILS), async job => {
    const res = await fetch(`${origin}${job.path}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': UA },
    })
    if (!res.ok) return null
    const html = await res.text()

    const start = html.indexOf('<div class="jobDisplay"')
    if (start < 0) return null
    const end = html.indexOf('<div class="joblayouttoken', start + 10)
    const block = html.slice(start, end > start ? end : start + 60_000)
    if (!block) return null

    const plain = block.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
    const field = (label: string): string | null => {
      const i = plain.indexOf(`${label}:`)
      if (i < 0) return null
      return plain.slice(i + label.length + 1, i + label.length + 90).trim() || null
    }

    // Requisition id is stable; the URL id changes if the posting is reissued.
    const reqId = field('Job Requisition ID')?.match(/^\d+/)?.[0]
    const idFromPath = job.path.match(/\/(\d+)\/?$/)?.[1]

    // The jobDisplay slice above is the right place to read the labelled fields
    // from, but it is NOT reliably the description: on the Government of
    // Alberta's template it contains the whole posting, while on NorQuest's the
    // same markers sit either side of the title and apply button, yielding 487
    // characters of "Apply now »". Both templates publish the real body as
    // schema.org microdata, so that is what's preferred, with the old slice
    // kept as the fallback. GoA's microdata still carries its Closing Date,
    // Salary and Requisition ID text, so nothing downstream loses a field.
    const described = extractItemprop(html, 'description')

    return {
      id: reqId || idFromPath || job.path,
      title: job.title,
      location: job.location,
      descriptionHtml: described?.trim() ? described : block,
      applyUrl: `${origin}${job.path}`,
      postedAt: job.posted ? new Date(job.posted).toISOString() : null,
      // Where the tenant states a closing date as microdata, take it; where it
      // doesn't (GoA), leave it undefined so the date is read out of the body.
      validThrough: itempropMeta(html, 'validThrough'),
      employmentType: normaliseEmployment(field('Full or Part-Time')),
      // GoA states pay as a biweekly figure with the annual in brackets —
      // "$2,918.05 - $4,001.58 biweekly ($76,161 - $104,441/year)". The
      // annual is what readers compare on, so prefer it.
      salaryLabel: parseGoaSalary(field('Salary')),
    }
  })
}

/**
 * Recover a location from a SuccessFactors job URL, for sites that publish no
 * location column.
 *
 * The slugs are built as `{Location}-{Title}-{Province}-{Postal}`, e.g.
 * `/job/Fort-McMurray-Supervisor%2C-Assessment-AB-T9H-2K4/1291336147/`. The row
 * already told us the title, so cutting the slug at the title leaves the
 * location on its own — which matters, because handing the whole slug to the
 * city matcher would let a city named in a job title decide the posting's city.
 *
 * When the title can't be found in the slug (they encode punctuation
 * differently now and then) the whole slug is returned. That's the looser
 * reading, and it's acceptable only because this path is reached solely by
 * boards with no location column at all — all of them single-municipality
 * employers, where the title is not competing with a real other city.
 */
function locationFromSlug(path: string, title: string): string {
  const slug = path.split('/').filter(Boolean)[1] ?? ''
  let text: string
  try {
    text = decodeURIComponent(slug)
  } catch {
    text = slug
  }
  text = text.replace(/-/g, ' ').replace(/\s+/g, ' ').trim()

  const needle = title.replace(/\s+/g, ' ').trim()
  if (!needle) return text
  const at = text.toLowerCase().indexOf(needle.toLowerCase())
  return at > 0 ? text.slice(0, at).trim() : text
}

/** Prefer the annual figure GoA puts in brackets after a biweekly rate. */
function parseGoaSalary(raw: string | null): string | null {
  if (!raw) return null
  const annual = raw.match(/\(\s*\$?([\d,]+)\s*(?:-|–|to)\s*\$?([\d,]+)\s*\/?\s*year\s*\)/i)
  if (annual) return `$${annual[1]}–$${annual[2]} a year`
  const hourly = raw.match(/\$?([\d,]+\.\d{2})\s*(?:-|–|to)\s*\$?([\d,]+\.\d{2})\s*(?:per\s+)?hour/i)
  if (hourly) return `$${hourly[1]}–$${hourly[2]} an hour`
  return null
}

// ── Phenom People (City of Edmonton) ─────────────────────────────────────────

const PHENOM_PAGE = 10
const PHENOM_MAX_PAGES = 20

/** Pull the balanced JSON object that follows a marker in the page source. */
function jsonAfter(html: string, marker: string): unknown | null {
  const at = html.indexOf(marker)
  if (at < 0) return null
  const start = html.indexOf('{', at)
  if (start < 0) return null
  let depth = 0
  for (let i = start; i < html.length; i++) {
    if (html[i] === '{') depth++
    else if (html[i] === '}' && --depth === 0) {
      try { return JSON.parse(html.slice(start, i + 1)) } catch { return null }
    }
  }
  return null
}

interface PhenomJob {
  jobId?: string
  title?: string
  city?: string
  state?: string
  cityState?: string
  type?: string
  postedDate?: string
  applyUrl?: string
}

/**
 * Phenom People career sites embed their result set as JSON in the page rather
 * than exposing a documented API, and the listing carries only a ~200-character
 * teaser. The saving grace is that each job page publishes a complete
 * JobPosting ld+json block — description, validThrough and employmentType — so
 * the detail fetch reads structured data instead of scraping markup.
 */
async function fetchPhenom(
  board: AtsBoard,
  isAlberta: (location: string) => boolean
): Promise<RawPosting[]> {
  const origin = `https://${board.domain}`
  const listing: PhenomJob[] = []
  const seen = new Set<string>()

  for (let page = 0; page < PHENOM_MAX_PAGES; page++) {
    const res = await fetch(`${origin}/search-results?from=${page * PHENOM_PAGE}&s=1`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': UA },
    })
    if (!res.ok) break
    const payload = jsonAfter(await res.text(), 'eagerLoadRefineSearch') as
      | { data?: { jobs?: PhenomJob[]; totalHits?: number } }
      | null
    const jobs = payload?.data?.jobs ?? []
    if (jobs.length === 0) break

    let fresh = 0
    for (const j of jobs) {
      if (!j.jobId || seen.has(j.jobId)) continue
      seen.add(j.jobId)
      listing.push(j)
      fresh++
    }
    if (fresh === 0) break
    const total = payload?.data?.totalHits
    if (typeof total === 'number' && listing.length >= total) break
  }

  const postings: RawPosting[] = []
  for (const job of listing) {
    const where = job.cityState || [job.city, job.state].filter(Boolean).join(', ')
    if (!job.title || !isAlberta(where)) continue

    try {
      const slug = job.title.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
      const res = await fetch(`${origin}/job/${job.jobId}/${slug}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'user-agent': UA },
      })
      if (!res.ok) continue
      const html = await res.text()

      let schema: {
        description?: string
        validThrough?: string
        employmentType?: string | string[]
        datePosted?: string
      } | null = null
      for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
        try {
          const parsed = JSON.parse(m[1])
          if (parsed['@type'] === 'JobPosting') { schema = parsed; break }
        } catch { /* keep looking */ }
      }
      if (!schema?.description) continue

      const type = Array.isArray(schema.employmentType) ? schema.employmentType[0] : schema.employmentType

      postings.push({
        id: job.jobId!,
        title: job.title,
        location: where,
        // Entity-encoded, exactly like Greenhouse.
        descriptionHtml: decodeEntities(schema.description),
        // Send applicants to the posting, not straight into the Taleo apply
        // form — the posting is what they need to read first.
        applyUrl: `${origin}/job/${job.jobId}/${slug}`,
        postedAt: job.postedDate ?? schema.datePosted ?? null,
        employmentType: normaliseEmployment(type ?? job.type),
      })
    } catch {
      // One unreadable posting must not sink the board.
    }
  }
  return postings
}

// ── Oracle Recruiting Cloud ──────────────────────────────────────────────────

const ORACLE_PAGE = 200
const ORACLE_MAX_PAGES = 5
/**
 * Detail fetches per run. Logged when hit, never silently truncated.
 *
 * Raised from 150 once these ran concurrently: Calgary Co-op matches ~161
 * Alberta postings, so the old ceiling dropped eleven entry-level Calgary jobs
 * every sync — exactly the roles this board exists to surface.
 */
const ORACLE_MAX_DETAILS = 220

interface OracleReq {
  Id?: number | string
  Title?: string
  PrimaryLocation?: string
  PostedDate?: string
  JobSchedule?: string
  ContractType?: string
  secondaryLocations?: Array<{ LocationName?: string }>
}

/**
 * Oracle Recruiting Cloud, used by the University of Alberta and Strathcona
 * County. Same two-call shape as Workday — the list endpoint is cheap and
 * carries the location, so the Alberta filter runs there and only matching
 * jobs cost a detail request.
 *
 * The detail response splits a posting across three fields (description,
 * responsibilities, qualifications) which have to be concatenated to
 * reconstruct the page a candidate actually reads. It also returns a real
 * ExternalPostedEndDate, so these rows get a genuine validThrough rather than
 * the 30-day fallback.
 */
async function fetchOracle(
  board: AtsBoard,
  isAlberta: (location: string) => boolean
): Promise<RawPosting[]> {
  const host = board.host!
  const site = board.site!
  const api = `https://${host}/hcmRestApi/resources/latest`

  const wanted: OracleReq[] = []
  for (let page = 0; page < ORACLE_MAX_PAGES; page++) {
    const data = (await getJson(
      `${api}/recruitingCEJobRequisitions?onlyData=true` +
      `&expand=requisitionList.secondaryLocations` +
      `&finder=findReqs;siteNumber=${site},limit=${ORACLE_PAGE},offset=${page * ORACLE_PAGE}` +
      `,sortBy=POSTING_DATES_DESC`
    )) as { items?: Array<{ requisitionList?: OracleReq[] }> }

    const list = data.items?.[0]?.requisitionList ?? []
    if (list.length === 0) break
    wanted.push(...list.filter(j => isAlberta(oracleLocation(j))))
    if (list.length < ORACLE_PAGE) break
  }

  if (wanted.length > ORACLE_MAX_DETAILS) {
    console.warn(
      `[ats:${board.token}] ${wanted.length} Alberta jobs matched but only ${ORACLE_MAX_DETAILS} descriptions fetched this run`
    )
  }

  return mapDetails(wanted.slice(0, ORACLE_MAX_DETAILS), async req => {
    if (!req.Id || !req.Title) return null
    const detail = (await getJson(
      `${api}/recruitingCEJobRequisitionDetails?expand=all&onlyData=true` +
      `&finder=ById;Id=%22${req.Id}%22,siteNumber=${site}`
    )) as {
      items?: Array<{
        ExternalDescriptionStr?: string
        ExternalResponsibilitiesStr?: string
        ExternalQualificationsStr?: string
        ExternalPostedEndDate?: string
        ExternalPostedStartDate?: string
        JobSchedule?: string
      }>
    }
    const info = detail.items?.[0]
    if (!info) return null

    const html = [
      info.ExternalDescriptionStr ?? '',
      info.ExternalResponsibilitiesStr ?? '',
      info.ExternalQualificationsStr ?? '',
    ].filter(Boolean).join('')
    if (!html.trim()) return null

    return {
      id: String(req.Id),
      title: req.Title.trim(),
      location: oracleLocation(req),
      descriptionHtml: html,
      applyUrl: `https://${host}/hcmUI/CandidateExperience/en/sites/${site}/job/${req.Id}`,
      postedAt: info.ExternalPostedStartDate ?? req.PostedDate ?? null,
      employmentType: normaliseEmployment(info.JobSchedule ?? req.JobSchedule ?? req.ContractType),
      validThrough: info.ExternalPostedEndDate ?? null,
    }
  })
}

/** Primary plus any secondary offices, as one string for the city matcher. */
function oracleLocation(req: OracleReq): string {
  return [req.PrimaryLocation, ...(req.secondaryLocations ?? []).map(s => s.LocationName)]
    .filter(Boolean)
    .join('; ')
}

// ── Oracle Talent Social Sourcing (Alberta Health Services, Covenant Health) ─

const OTSS_MAX_PAGES = 200
/** Detail fetches per run. Logged when hit, never silently truncated. */
const OTSS_MAX_DETAILS = 700
/** Parallel detail fetches. AHS runs ~500 Alberta jobs; sequential is ~190s. */
const OTSS_DETAIL_CONCURRENCY = 6

/**
 * AHS and Covenant Health.
 *
 * Their Taleo career sections are decommissioned — the REST endpoint answers
 * `{"careerSectionUnAvailable": true}` and the .ftl URLs 302 to a branded
 * Oracle Talent Social Sourcing site. That site is the real board, so this
 * reads it rather than Taleo.
 *
 * Two things it does that no other provider here needs:
 *
 *  1. Keeps a cookie jar. The search is server-side state keyed by a numeric id
 *     handed out per session, and paging a search id from a different session
 *     silently re-serves page 1 — which looks like "the employer only has ten
 *     jobs" rather than an error.
 *  2. Fetches details concurrently. AHS alone matches ~500 Alberta postings and
 *     the daily cron has a 300-second ceiling; one at a time doesn't fit.
 */
async function fetchOtss(
  board: AtsBoard,
  isAlberta: (location: string) => boolean
): Promise<RawPosting[]> {
  const origin = `https://${board.domain}`
  const jar = new Map<string, string>()

  const getText = async (path: string): Promise<{ url: string; body: string }> => {
    const res = await fetch(path.startsWith('http') ? path : origin + path, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'user-agent': UA,
        accept: 'text/html',
        ...(jar.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
      },
    })
    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const pair = raw.split(';')[0]
      const eq = pair.indexOf('=')
      if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim())
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { url: res.url, body: await res.text() }
  }

  // Establish a session, then open a search to get its id and page count.
  await getText('/')
  const search = await getText('/jobs/search')
  const searchId = search.url.match(/\/jobs\/search\/(\d+)/)?.[1]
  if (!searchId) throw new Error('no search id — career site layout changed')
  const pageCount = Math.min(
    Math.ceil(Number(search.body.match(/jPaginateNumPages[^>]*>([\d.]+)</)?.[1] ?? 1)),
    OTSS_MAX_PAGES
  )

  interface Row { id: string; title: string; location: string; url: string }
  const rows: Row[] = []
  const collect = (html: string) => {
    for (const m of html.matchAll(
      /<div id="job_list_(\d+)"[\s\S]*?<a href="([^"]+)" class="job_link[^"]*">([\s\S]*?)<\/a>[\s\S]*?class="location">([\s\S]*?)<\/span>/g
    )) {
      rows.push({
        id: m[1],
        url: m[2],
        title: decodeEntities(m[3].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim(),
        location: decodeEntities(m[4].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim(),
      })
    }
  }

  collect(search.body)
  for (let page = 2; page <= pageCount; page++) {
    try {
      collect((await getText(`/jobs/search/${searchId}/page${page}`)).body)
    } catch {
      // A dropped page costs ten postings, not the board.
    }
  }

  const wanted = rows.filter(r => r.title && isAlberta(otssLocation(r.location)))
  if (wanted.length > OTSS_MAX_DETAILS) {
    console.warn(
      `[ats:${board.token}] ${wanted.length} Alberta jobs matched but only ${OTSS_MAX_DETAILS} descriptions fetched this run`
    )
  }

  const queue = wanted.slice(0, OTSS_MAX_DETAILS)
  const postings: RawPosting[] = []
  let next = 0
  await Promise.all(
    Array.from({ length: OTSS_DETAIL_CONCURRENCY }, async () => {
      while (next < queue.length) {
        const row = queue[next++]
        try {
          const { body } = await getText(row.url)
          const html = extractBalancedDiv(body, '<div class="job_description">')
          if (!html?.trim()) continue

          const plain = body.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
          postings.push({
            id: row.id,
            title: row.title,
            location: otssLocation(row.location),
            descriptionHtml: html,
            applyUrl: row.url,
            // The board states no posting date anywhere — only the closing date
            // and the date the role starts. Left null rather than guessed.
            postedAt: null,
            employmentType: otssEmploymentType(otssField(plain, 'Employee Class')),
            salaryLabel: otssSalary(plain),
            validThrough: otssClosingDate(otssField(plain, 'Posting End Date')),
          })
        } catch {
          // One unreadable posting must not sink the board.
        }
      }
    })
  )
  return postings
}

/**
 * AHS states location as "Zone, City, Site". The zone is a region, not a place:
 * "Calgary Zone, Vulcan, Vulcan" is a job in Vulcan, and "Edmonton Zone, Stony
 * Plain, Westview Health Centre" is in Stony Plain. Matching the raw string put
 * 93 of 992 postings in the wrong city, so the zone is dropped and only the
 * municipality and site are kept.
 */
function otssLocation(raw: string): string {
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean)
  return parts.length >= 3 ? parts.slice(1).join(', ') : raw
}

/** Value of a "Label: value" field from the flattened detail page. */
function otssField(plain: string, label: string): string | null {
  const at = plain.indexOf(`${label}:`)
  if (at < 0) return null
  return plain.slice(at + label.length + 1, at + label.length + 60).trim() || null
}

/**
 * AHS employee classes are "Regular Full Time", "Temporary Part Time",
 * "Casual" — no hyphen, so the generic inference in job-attributes.ts misses
 * them. Temporary wins over the hours because it's the fact a candidate most
 * needs to see; casual states no hours at all and stays null.
 */
function otssEmploymentType(employeeClass: string | null): string | null {
  if (!employeeClass) return null
  const v = employeeClass.toLowerCase()
  if (v.startsWith('temporary')) return 'TEMPORARY'
  if (v.startsWith('regular full') || v.startsWith('full')) return 'FULL_TIME'
  if (v.startsWith('regular part') || v.startsWith('part')) return 'PART_TIME'
  return null
}

/** "Minimum Salary: $22.05 Maximum Salary: $23.69" — always an hourly rate. */
function otssSalary(plain: string): string | null {
  const min = plain.match(/Minimum Salary:\s*\$?\s*([\d,]+\.\d{2})/i)?.[1]
  if (!min) return null
  const max = plain.match(/Maximum Salary:\s*\$?\s*([\d,]+\.\d{2})/i)?.[1]
  return max ? `$${min}–$${max} an hour` : `$${min} an hour`
}

/** "21-SEP-2026" → ISO, end of that day. */
function otssClosingDate(raw: string | null): string | null {
  const m = raw?.match(/^(\d{1,2})-([A-Z]{3})-(\d{4})/i)
  if (!m) return null
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const month = months.indexOf(m[2].toUpperCase())
  if (month < 0) return null
  return new Date(Date.UTC(Number(m[3]), month, Number(m[1]), 23, 59, 59)).toISOString()
}

/**
 * Slice out a div and everything nested inside it. The description ends at a
 * closing tag several levels deep, so counting depth is the only way to take
 * the whole block without also swallowing the rest of the page.
 */
function extractBalancedDiv(html: string, opener: string, from = 0): string | null {
  const start = html.indexOf(opener, from)
  if (start < 0) return null
  return divContentFrom(html, start + opener.length)
}

/** Depth-counting walk from the first character inside an already-opened tag. */
function balancedFrom(html: string, inner: number, tagName = 'div'): string | null {
  let depth = 1
  const tag = new RegExp(`<(/?)${tagName}\\b`, 'g')
  tag.lastIndex = inner
  let m: RegExpExecArray | null
  while ((m = tag.exec(html))) {
    depth += m[1] ? -1 : 1
    if (depth === 0) return html.slice(inner, m.index)
  }
  return null
}

function divContentFrom(html: string, inner: number): string | null {
  return balancedFrom(html, inner, 'div')
}

/**
 * Contents of the element carrying a schema.org itemprop, whatever tag it is.
 *
 * Career sites disagree wildly about their own page furniture but agree about
 * their microdata, so this is the stable way in. The element's tag name is read
 * off the page rather than assumed — SuccessFactors marks the description on a
 * <span>, and nothing stops another tenant using a <div>.
 */
function extractItemprop(html: string, prop: string): string | null {
  const at = html.indexOf(`itemprop="${prop}"`)
  if (at < 0) return null
  const open = html.lastIndexOf('<', at)
  if (open < 0) return null
  const name = html.slice(open + 1, open + 40).match(/^([a-zA-Z][\w-]*)/)?.[1]
  if (!name) return null
  const gt = html.indexOf('>', at)
  if (gt < 0) return null
  return balancedFrom(html, gt + 1, name)
}

/** `content` attribute of a <meta itemprop="…">, for the microdata date fields. */
function itempropMeta(html: string, prop: string): string | null {
  const m = html.match(new RegExp(`<meta[^>]*itemprop="${prop}"[^>]*content="([^"]*)"`))
  if (!m) return null
  const d = new Date(m[1])
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/**
 * Same idea, but keyed on a div's id rather than its opening tag. Needed where
 * the element is identified by id and its class list varies between fields.
 */
function extractDivById(html: string, id: string): string | null {
  const at = html.indexOf(`id="${id}"`)
  if (at < 0) return null
  const gt = html.indexOf('>', at)
  if (gt < 0) return null
  return divContentFrom(html, gt + 1)
}

// ── PeopleAdmin (University of Lethbridge) ───────────────────────────────────

/**
 * PeopleAdmin runs the applicant portals of most Canadian universities. The
 * search page is a JavaScript grid, but the same query is published as an Atom
 * feed at /postings/search.atom carrying the complete posting body — the only
 * provider here that needs a single request for the whole board.
 *
 * The feed states no location. Every institution on it is a single campus
 * employer, so the city comes from the board's `locationAliases`, after the
 * matcher has had a look at the job title — which is what catches the
 * occasional role advertised at a satellite campus in another city.
 */
async function fetchPeopleAdmin(board: AtsBoard): Promise<RawPosting[]> {
  const origin = `https://${board.domain}`
  const res = await fetch(`${origin}/postings/search.atom`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'user-agent': UA, accept: 'application/atom+xml' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const xml = await res.text()

  const postings: RawPosting[] = []
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const entry = m[1]
    const url = entry.match(/<link[^>]+rel="alternate"[^>]+href="([^"]+)"/)?.[1]
    const id = entry.match(/<id>[^<]*?\/postings\/(\d+)<\/id>/)?.[1]
    const title = decodeEntities(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '')
      .replace(/\s+/g, ' ')
      .trim()
    const content = decodeEntities(entry.match(/<content>([\s\S]*?)<\/content>/)?.[1] ?? '')
    if (!id || !url || !title || !content.trim()) continue

    postings.push({
      id,
      title,
      location: '',
      descriptionHtml: content,
      applyUrl: url,
      postedAt: entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? null,
      // PeopleAdmin has no employment-type field, but these titles state it
      // outright — "Event Set Up Operator (Full-time, Continuing)".
      employmentType: normaliseEmployment(title),
    })
  }
  return postings
}

// ── Medicine Hat College (own CMS, no ATS) ───────────────────────────────────

/** Detail fetches per run. Logged when hit, never silently truncated. */
const MHC_MAX_DETAILS = 60

/**
 * Medicine Hat College runs no applicant tracking system at all — it publishes
 * each opening as an ordinary page on its own website. This provider is
 * therefore tuned to that one site's markup, which is why it is named after the
 * employer rather than a vendor: unlike `phenom` or `cadient`, there is no
 * product here that a second employer could also be using.
 *
 * It earns its keep because Medicine Hat is the thinnest of our seven cities
 * and the college is one of its largest employers. The tradeoff is that a
 * redesign of their site breaks this quietly, so the board reports zero rather
 * than erroring — worth checking with the dry-run script now and then.
 */
async function fetchMedicineHatCollege(board: AtsBoard): Promise<RawPosting[]> {
  const origin = `https://${board.domain}`
  const listing = await fetch(`${origin}/about-mhc/careers/current-openings`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'user-agent': UA, accept: 'text/html' },
  })
  if (!listing.ok) throw new Error(`HTTP ${listing.status}`)
  const html = await listing.text()

  const paths = [
    ...new Set(
      [...html.matchAll(/href="(\/about-mhc\/careers\/current-openings\/(\d+)-[^"]*)"/g)]
        .map(m => m[1])
    ),
  ]
  if (paths.length > MHC_MAX_DETAILS) {
    console.warn(
      `[ats:${board.token}] ${paths.length} openings listed but only ${MHC_MAX_DETAILS} fetched this run`
    )
  }

  return mapDetails(paths.slice(0, MHC_MAX_DETAILS), async path => {
    const res = await fetch(`${origin}${path}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': UA, accept: 'text/html' },
    })
    if (!res.ok) return null
    const page = await res.text()

    // Several rich-text blocks share the same class; the posting is the one
    // carrying the competition-number table, which no other block on the page
    // has. Falling back to the first block would silently publish a sidebar.
    let body: string | null = null
    const opener = '<div class="wrapper padded simple-rich-text">'
    for (let at = 0; ; ) {
      const next = page.indexOf(opener, at)
      if (next < 0) break
      const block = extractBalancedDiv(page, opener, next)
      if (block && /competition\s*number/i.test(block)) { body = block; break }
      at = next + opener.length
    }
    if (!body?.trim()) return null

    const title = decodeEntities(body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1]?.replace(/<[^>]+>/g, '') ?? '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!title) return null

    return {
      id: path.match(/current-openings\/(\d+)-/)?.[1] ?? path,
      title,
      location: '',
      descriptionHtml: body,
      applyUrl: `${origin}${path}`,
      // The pages state a closing date in the body but no posting date, so the
      // date is left to extractClosingDate downstream rather than guessed here.
      postedAt: null,
      employmentType: normaliseEmployment(
        body.replace(/<[^>]+>/g, ' ').match(/Type:\s*([^<\n]{0,60})/i)?.[1] ?? null
      ),
    }
  })
}

// ── Avanti Career Connector (Keyano College) ─────────────────────────────────

/** Detail fetches per run. Logged when hit, never silently truncated. */
const AVANTI_MAX_DETAILS = 120

/**
 * Avanti is Canadian payroll/HR software whose Career Connector module several
 * smaller institutions use. The listing page is a Kendo grid that renders
 * client-side, so the HTML carries no jobs — but the grid is fed by a plain
 * `POST /careers/Job/Search` that answers with the whole board as JSON, no
 * session or token required. The detail page keys on the job code as a path
 * segment, not a query parameter.
 */
async function fetchAvanti(
  board: AtsBoard,
  isAlberta: (location: string) => boolean
): Promise<RawPosting[]> {
  const origin = `https://${board.domain}`

  interface AvantiJob {
    Job?: string
    Title?: string
    Location?: string
    ClosingDate?: string
    Category?: string
  }

  const res = await fetch(`${origin}/careers/Job/Search`, {
    method: 'POST',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'user-agent': UA, 'content-type': 'application/json', accept: 'application/json' },
    body: '{}',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const list = (await res.json()) as AvantiJob[]

  const wanted = (Array.isArray(list) ? list : []).filter(
    j => j.Job && j.Title && isAlberta(j.Location ?? '')
  )
  if (wanted.length > AVANTI_MAX_DETAILS) {
    console.warn(
      `[ats:${board.token}] ${wanted.length} Alberta jobs matched but only ${AVANTI_MAX_DETAILS} descriptions fetched this run`
    )
  }

  return mapDetails(wanted.slice(0, AVANTI_MAX_DETAILS), async job => {
    const url = `${origin}/careers/Job/Details/${encodeURIComponent(job.Job!.trim())}`
    const page = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': UA, accept: 'text/html' },
    })
    if (!page.ok) return null
    const html = await page.text()

    const description = extractDivById(html, 'jobDescriptions')
    if (!description?.trim()) return null

    return {
      id: job.Job!.trim(),
      title: job.Title!.trim(),
      location: job.Location ?? '',
      descriptionHtml: description,
      applyUrl: url,
      // The feed states no posting date, only a closing date, and that is
      // frequently blank for continuous postings.
      postedAt: null,
      employmentType: normaliseEmployment(job.Category),
      validThrough: parseIsoish(job.ClosingDate),
    }
  })
}

/** Lenient date parse for feeds that use a blank string to mean "no deadline". */
function parseIsoish(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null
  const d = new Date(raw.trim())
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// ── RSS careers feed (MacEwan University) ────────────────────────────────────

/**
 * Some employers publish their whole board as an ordinary RSS feed with the
 * full posting in each item — the cheapest possible source, one request for
 * everything, and explicitly meant to be read by machines.
 *
 * `site` carries the feed path rather than a career-site name, because a feed
 * URL is what identifies this board. The feed states no location; single-campus
 * employers supply the city through the board's `locationAliases`.
 */
async function fetchRssFeed(board: AtsBoard): Promise<RawPosting[]> {
  const res = await fetch(`https://${board.domain}${board.site ?? ''}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const xml = await res.text()

  const postings: RawPosting[] = []
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const item = m[1]
    const pick = (tag: string) =>
      decodeEntities(item.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? '').trim()

    const title = pick('title').replace(/\s+/g, ' ')
    const link = pick('link')
    const description = pick('description')
    // guid is the employer's competition number and is stable across edits;
    // the link carries the same value as a query parameter.
    const id = pick('guid') || link
    if (!title || !link || !description.trim() || !id) continue

    postings.push({
      id,
      title,
      location: '',
      descriptionHtml: description,
      applyUrl: link,
      postedAt: parseIsoish(pick('pubDate')),
      // Category is stated inside the body ("Category: Full-Time Continuing"),
      // which is also where the employment type has to be read from.
      employmentType: normaliseEmployment(
        description.match(/Category:\s*<\/strong>\s*([^<]{0,60})/i)?.[1] ?? null
      ),
    })
  }
  return postings
}

// ── HRsmart / Deltek Talent (Mount Royal, Northwestern Polytechnic) ──────────

const HRSMART_PAGE = 100
const HRSMART_MAX_PAGES = 6
/** Detail fetches per run. Logged when hit, never silently truncated. */
const HRSMART_MAX_DETAILS = 150

/**
 * HRsmart, sold now as Deltek Talent Management, runs several Alberta
 * post-secondary boards.
 *
 * It looks unreadable at first and isn't: the landing page shouts that
 * JavaScript and cookies are required, and the job list genuinely is absent
 * from `/hr/ats/JobSearch/index`. But `/hr/ats/JobSearch/viewAll` renders the
 * whole thing server-side as an ordinary table, needing neither a cookie nor a
 * token. The postings are simply linked as `/hr/ats/Posting/view/{id}` rather
 * than any of the usual "viewJob"-style paths.
 *
 * Columns differ per tenant, so the header row is read rather than assumed:
 * Northwestern Polytechnic publishes a Location column, Mount Royal doesn't.
 * A tenant without one falls back to the board's `locationAliases`, which is
 * safe for the single-campus institutions and is why Mount Royal declares one.
 */
async function fetchHrsmart(
  board: AtsBoard,
  isAlberta: (location: string) => boolean
): Promise<RawPosting[]> {
  const origin = `https://${board.domain}`

  interface Row { id: string; title: string; location: string; opened: string | null; closes: string | null }
  const rows: Row[] = []
  const seen = new Set<string>()
  let statesLocation = false

  for (let page = 1; page <= HRSMART_MAX_PAGES; page++) {
    const res = await fetch(
      `${origin}/hr/ats/JobSearch/viewAll` +
      `/jobSearchPaginationExternal_pageSize:${HRSMART_PAGE}` +
      `/jobSearchPaginationExternal_page:${page}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'user-agent': UA } }
    )
    if (!res.ok) break
    const html = await res.text()

    // Column order varies per tenant; find the ones we care about by name.
    const headers = [...(html.match(/<thead[\s\S]*?<\/thead>/)?.[0] ?? '').matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)]
      .map(h => decodeEntities(h[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim().toLowerCase())
    const col = (...names: string[]) => headers.findIndex(h => names.some(n => h.startsWith(n)))
    const iLocation = col('location')
    const iOpened = col('date opened', 'posted')
    const iCloses = col('closing date')
    if (iLocation >= 0) statesLocation = true

    const body = html.match(/<tbody[\s\S]*?<\/tbody>/)?.[0] ?? ''
    let fresh = 0
    for (const tr of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
      const cells = [...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(c => c[1])
      const link = cells.find(c => /\/hr\/ats\/Posting\/view\/\d+/.test(c))
      const id = link?.match(/\/hr\/ats\/Posting\/view\/(\d+)/)?.[1]
      if (!id || seen.has(id)) continue
      seen.add(id)
      fresh++

      const text = (s?: string) =>
        decodeEntities((s ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
      rows.push({
        id,
        title: text(link),
        location: iLocation >= 0 ? text(cells[iLocation]) : '',
        opened: iOpened >= 0 ? text(cells[iOpened]) || null : null,
        closes: iCloses >= 0 ? text(cells[iCloses]) || null : null,
      })
    }
    if (fresh === 0) break
  }

  // Only pre-filter when the tenant actually said where the job is; otherwise
  // every row has to go through and the board's aliases decide the city.
  const wanted = rows.filter(r => r.title && (!statesLocation || isAlberta(r.location)))
  if (wanted.length > HRSMART_MAX_DETAILS) {
    console.warn(
      `[ats:${board.token}] ${wanted.length} jobs matched but only ${HRSMART_MAX_DETAILS} descriptions fetched this run`
    )
  }

  return mapDetails(wanted.slice(0, HRSMART_MAX_DETAILS), async row => {
    const res = await fetch(`${origin}/hr/ats/Posting/view/${row.id}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': UA },
    })
    if (!res.ok) return null
    const html = await res.text()

    const description = extractDivById(html, 'job_details_ats_requisition_description')
    if (!description?.trim()) return null

    return {
      id: row.id,
      title: row.title,
      location: row.location,
      descriptionHtml: description,
      applyUrl: `${origin}/hr/ats/Posting/view/${row.id}`,
      postedAt: parseUsDate(row.opened),
      employmentType: normaliseEmployment(
        decodeEntities(extractDivById(html, 'job_details_hua_job_type_id') ?? '').replace(/<[^>]+>/g, '')
      ),
      // "Open until filled" is the common value and states no deadline, so it
      // parses to null rather than being read as a date.
      validThrough: parseUsDate(row.closes),
    }
  })
}

/** "8/13/2026" → ISO. Anything else, including "Open until filled", is null. */
function parseUsDate(raw: string | null): string | null {
  const m = raw?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const d = new Date(Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2])))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// ── Cadient Talent (Costco Wholesale Canada) ─────────────────────────────────

/** Detail fetches per run. Logged when hit, never silently truncated. */
const CADIENT_MAX_DETAILS = 80

/**
 * Cadient runs the hourly-hiring boards of large retailers, and it is not a
 * requisition system: an employer publishes one entry per ROLE, listing every
 * store that accepts applications for it, and candidates join a rolling pool
 * rather than answering a dated vacancy. Costco Wholesale Canada posts all of
 * its warehouse hiring this way — the only route to Costco's Alberta jobs,
 * since it publishes no per-store openings anywhere.
 *
 * The consequences run through the rest of the pipeline, so they're worth
 * stating plainly:
 *
 *   - There is no posting date and no closing date, and none is invented. Both
 *     stay null, the way the AHS board is handled.
 *   - One role legitimately covers many cities. The location list is handed to
 *     the matcher whole and ./index.ts fans it out into one row per city, which
 *     is the same path a multi-office Ashby posting already takes.
 *   - These rows are deliberately NOT offered to Google — see isIndexableJob in
 *     lib/jobs.ts. A candidate pool is not a job opening, and JobPosting markup
 *     on one would be a policy breach.
 */
async function fetchCadient(board: AtsBoard): Promise<RawPosting[]> {
  const origin = `https://${board.domain}`
  const url = (params: Record<string, string>) =>
    `${origin}/index.jsp?${new URLSearchParams({
      applicationName: board.token,
      locale: 'en_US',
      ...params,
    })}`

  const getHtml = async (target: string): Promise<string> => {
    const res = await fetch(target, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': UA, accept: 'text/html' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.text()
  }

  // One request lists every role on the board.
  const index = await getHtml(url({ seq: 'allOpenJobs', allOpenJobs: 'true' }))
  const ids = [...new Set([...index.matchAll(/POSTING_ID=(\d+)/g)].map(m => m[1]))]
  if (ids.length > CADIENT_MAX_DETAILS) {
    console.warn(
      `[ats:${board.token}] ${ids.length} roles listed but only ${CADIENT_MAX_DETAILS} descriptions fetched this run`
    )
  }

  return mapDetails(ids.slice(0, CADIENT_MAX_DETAILS), async id => {
    const detail = await getHtml(url({ POSTING_ID: id, SEQ: 'positionDetails' }))

    // The page opens with a <h1>No JavaScript</h1> in a noscript banner; the
    // role's own heading is the next one.
    const title = [...detail.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)]
      .map(m => decodeEntities(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim())
      .find(t => t && t !== 'No JavaScript')
    if (!title) return null

    // Cadient splits long postings across several formatted blocks.
    let body = ''
    for (let at = 0; ; ) {
      const opener = '<div class="formattedContent formRow">'
      const next = detail.indexOf(opener, at)
      if (next < 0) break
      body += extractBalancedDiv(detail, opener, next) ?? ''
      at = next + opener.length
    }
    if (!body.trim()) return null

    const locations = [
      ...detail.matchAll(
        /class="location-item[^"]*"[\s\S]*?<span class="small fw-medium text-dark">([\s\S]*?)<\/span>/g
      ),
    ].map(m => decodeEntities(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim())
    if (locations.length === 0) return null

    return {
      id,
      title,
      location: [...new Set(locations)].join('; '),
      // The pool caveat goes after the description rather than before it, so
      // the card snippet still shows the actual work — 25 Costco rows in one
      // city all leading with the same disclaimer would be unreadable.
      descriptionHtml:
        `${body}<p><em>${board.company} accepts applications for this role on an ongoing ` +
        `basis rather than posting a dated vacancy. Applying adds you to the pool the ` +
        `location draws on when a shift opens. Choose the location you want on ` +
        `${board.company}'s page before you apply.</em></p>`,
      applyUrl: url({ POSTING_ID: id, SEQ: 'positionDetails' }),
      // A pool entry has no posting date and no deadline. Neither is guessed.
      postedAt: null,
      employmentType: null,
    }
  })
}

// ── Radancy TalentBrew ───────────────────────────────────────────────────────

/**
 * Pages of the listing to walk. Twenty-five rows a page, so this covers 300
 * postings — well clear of UCalgary's ~115 — and the loop stops early the
 * moment a page adds nothing new.
 */
const TALENTBREW_MAX_PAGES = 12

/** Detail fetches per run. Logged when hit, never silently truncated. */
const TALENTBREW_MAX_DETAILS = 200

/**
 * Radancy's TalentBrew — the career-site product behind careers.ucalgary.ca.
 *
 * The University of Calgary was left out of this list for months on the finding
 * that `/search/jobs` answered 403 behind a Cloudflare challenge. Re-checked
 * 2026-08-25 and that is no longer true: robots.txt reads "Disallow:" (allow
 * everything), names a sitemap, and every listing and posting page serves our
 * real User-Agent as plain HTML. Nothing here spoofs a browser; if the
 * challenge ever returns, the fetch fails and the board reports an error rather
 * than quietly reading zero.
 *
 * The listing carries title, location and the posting URL but only a truncated
 * blurb, so the description comes from the JSON-LD JobPosting on each posting
 * page — which also states the real municipality, where the listing says only
 * which campus.
 */
async function fetchTalentBrew(
  board: AtsBoard,
  isAlberta: (location: string) => boolean
): Promise<RawPosting[]> {
  const origin = `https://${board.domain}`

  /**
   * One retry, because this board pays a request per posting and a transient
   * failure is expensive here in a way it isn't elsewhere: the first dry run
   * lost 35 of 115 postings to connection failures that a plain re-run did not
   * reproduce. Silently reading 80 postings looks exactly like an employer
   * having 80 openings.
   */
  const getHtml = async (path: string): Promise<string> => {
    let lastError: unknown
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${origin}${path}`, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { 'user-agent': UA, accept: 'text/html' },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      } catch (err) {
        lastError = err
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError))
  }

  const listed: Array<{ id: string; url: string; title: string; location: string }> = []
  const seen = new Set<string>()

  for (let page = 1; page <= TALENTBREW_MAX_PAGES; page++) {
    const html = await getHtml(`/search/jobs?page=${page}`)

    // Each result is one `.jobs-section__item` block. Splitting on the class
    // rather than matching hrefs across the whole document keeps a posting's
    // title and location tied to its own card — the "Learn More" link repeats
    // the same href further down the same block, which a flat href scan would
    // have counted twice.
    let fresh = 0
    for (const card of html.split('jobs-section__item').slice(1)) {
      const link = card.match(/<a href="(https?:\/\/[^"]+\/jobs\/(\d+)-[^"]*)"[^>]*>([\s\S]*?)<\/a>/)
      if (!link) continue
      const [, url, id, rawTitle] = link
      if (seen.has(id)) continue
      seen.add(id)
      fresh++

      const title = decodeEntities(rawTitle.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
      const location = decodeEntities(
        card.match(/<strong>\s*Location:\s*<\/strong>\s*([^<]*)</)?.[1] ?? ''
      ).replace(/\s+/g, ' ').trim()
      if (title) listed.push({ id, url, title, location })
    }
    if (fresh === 0) break
  }

  // UCalgary states a campus ("Main Campus", "Foothills Campus"), never a city,
  // so this only filters at all on a board whose sites span municipalities.
  // The board's own alias supplies the city for the ones that name none.
  const candidates = listed.filter(row => isAlberta(row.location) || isAlberta(row.title))
  if (candidates.length > TALENTBREW_MAX_DETAILS) {
    console.warn(
      `[ats:${board.token}] ${candidates.length} roles listed but only ${TALENTBREW_MAX_DETAILS} descriptions fetched this run`
    )
  }

  return mapDetails(candidates.slice(0, TALENTBREW_MAX_DETAILS), async row => {
    const html = await getHtml(new URL(row.url).pathname)
    const schema = jobPostingSchema(html)

    /**
     * The rendered block, for when the JSON-LD can't be read. Three of
     * UCalgary's 115 postings carry a stray backslash in the employer's own
     * rich text, which makes JSON.parse throw on the whole block — losing a
     * real Calgary job to that is not a tradeoff worth making. This is the
     * same markup the schema is generated from, so the text is identical.
     */
    const rendered = (() => {
      const at = html.search(/<div class="job-description\b/)
      if (at < 0) return null
      const inner = html.indexOf('>', at)
      return inner < 0 ? null : divContentFrom(html, inner + 1)
    })()

    // No description is no posting: a row without one is just a link, and the
    // whole point of reading the board directly is the text Google indexes.
    const descriptionHtml = schema?.description ?? rendered
    if (!descriptionHtml?.trim()) return null

    const place = Array.isArray(schema?.jobLocation) ? schema.jobLocation[0] : schema?.jobLocation
    const locality = place?.address?.addressLocality?.trim()
    const region = place?.address?.addressRegion?.trim()
    const type = Array.isArray(schema?.employmentType)
      ? schema.employmentType[0]
      : schema?.employmentType

    return {
      id: row.id,
      // The posting's own address beats the campus name — it is the only thing
      // on either page that names a municipality, and it is what keeps a role
      // at an off-campus site off the Calgary page by accident of the alias.
      location: locality ? [locality, region].filter(Boolean).join(', ') : row.location,
      title: row.title,
      // Real HTML once JSON.parse has run — unlike Greenhouse, nothing here is
      // entity-encoded a second time.
      descriptionHtml,
      applyUrl: row.url,
      postedAt: schema?.datePosted ?? null,
      employmentType: normaliseEmployment(type),
      validThrough: schema?.validThrough ?? null,
    }
  })
}

// ── Dispatch ─────────────────────────────────────────────────────────────────
export async function fetchBoard(
  board: AtsBoard,
  isAlberta: (location: string) => boolean
): Promise<RawPosting[]> {
  switch (board.provider) {
    case 'greenhouse': return fetchGreenhouse(board)
    case 'lever': return fetchLever(board)
    case 'ashby': return fetchAshby(board)
    case 'workday': return fetchWorkday(board, isAlberta)
    case 'successfactors': return fetchSuccessFactors(board, isAlberta)
    case 'phenom': return fetchPhenom(board, isAlberta)
    case 'oracle': return fetchOracle(board, isAlberta)
    case 'otss': return fetchOtss(board, isAlberta)
    case 'peopleadmin': return fetchPeopleAdmin(board)
    case 'cadient': return fetchCadient(board)
    case 'hrsmart': return fetchHrsmart(board, isAlberta)
    case 'avanti': return fetchAvanti(board, isAlberta)
    case 'rss': return fetchRssFeed(board)
    case 'mhc': return fetchMedicineHatCollege(board)
    case 'talentbrew': return fetchTalentBrew(board, isAlberta)
    default: return []
  }
}
