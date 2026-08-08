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
const WORKDAY_MAX_PAGES = 15

/**
 * Workday is the only two-call provider: the list endpoint carries titles and
 * locations but no descriptions, so each Alberta match needs a detail fetch.
 * The list is filtered to Alberta FIRST so a national employer costs a handful
 * of detail calls rather than one per posting company-wide.
 */
async function fetchWorkday(
  board: AtsBoard,
  isAlberta: (location: string) => boolean
): Promise<RawPosting[]> {
  const base = `https://${board.token}.${board.datacenter}.myworkdayjobs.com/wday/cxs/${board.token}/${board.site}`

  const albertaItems: WorkdayListItem[] = []
  for (let page = 0; page < WORKDAY_MAX_PAGES; page++) {
    const data = (await getJson(`${base}/jobs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ appliedFacets: {}, limit: WORKDAY_PAGE, offset: page * WORKDAY_PAGE, searchText: '' }),
    })) as { jobPostings?: WorkdayListItem[]; total?: number }

    const items = data.jobPostings ?? []
    if (items.length === 0) break
    albertaItems.push(...items.filter(i => isAlberta(i.locationsText ?? '')))
    if (items.length < WORKDAY_PAGE) break
  }

  const postings: RawPosting[] = []
  for (const item of albertaItems) {
    if (!item.externalPath) continue
    try {
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
      if (!info?.externalUrl) continue
      postings.push({
        id: info.jobPostingId || item.bulletFields?.[0] || item.externalPath,
        title: (item.title ?? '').trim(),
        location: item.locationsText ?? '',
        descriptionHtml: info.jobDescription ?? '',
        applyUrl: info.externalUrl,
        // `postedOn` is relative prose ("Posted 2 Days Ago"); startDate is real.
        postedAt: info.startDate ? new Date(info.startDate).toISOString() : null,
        employmentType: normaliseEmployment(info.timeType),
      })
    } catch {
      // One unreadable posting must not sink the whole board.
    }
  }
  return postings
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
      const path = tr.match(/href="(\/job\/[^"]+)"/)?.[1]
      if (!path || seen.has(path)) continue
      seen.add(path)
      fresh++
      // Entities must be decoded, not just tags stripped: titles arrive as
      // "Barrister &amp; Solicitor" and would render with the raw entity.
      const strip = (s?: string) =>
        decodeEntities((s ?? '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
      listing.push({
        path,
        title: strip(tr.match(/class="jobTitle-link"[^>]*>([\s\S]*?)<\/a>/)?.[1]),
        location: strip(tr.match(/class="jobLocation">([\s\S]*?)<\/span>/)?.[1]),
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

  const postings: RawPosting[] = []
  for (const job of wanted.slice(0, SF_MAX_DETAILS)) {
    try {
      const res = await fetch(`${origin}${job.path}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'user-agent': UA },
      })
      if (!res.ok) continue
      const html = await res.text()

      const start = html.indexOf('<div class="jobDisplay"')
      if (start < 0) continue
      const end = html.indexOf('<div class="joblayouttoken', start + 10)
      const block = html.slice(start, end > start ? end : start + 60_000)
      if (!block) continue

      const plain = block.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
      const field = (label: string): string | null => {
        const i = plain.indexOf(`${label}:`)
        if (i < 0) return null
        return plain.slice(i + label.length + 1, i + label.length + 90).trim() || null
      }

      // Requisition id is stable; the URL id changes if the posting is reissued.
      const reqId = field('Job Requisition ID')?.match(/^\d+/)?.[0]
      const idFromPath = job.path.match(/\/(\d+)\/?$/)?.[1]

      postings.push({
        id: reqId || idFromPath || job.path,
        title: job.title,
        location: job.location,
        descriptionHtml: block,
        applyUrl: `${origin}${job.path}`,
        postedAt: job.posted ? new Date(job.posted).toISOString() : null,
        employmentType: normaliseEmployment(field('Full or Part-Time')),
        // GoA states pay as a biweekly figure with the annual in brackets —
        // "$2,918.05 - $4,001.58 biweekly ($76,161 - $104,441/year)". The
        // annual is what readers compare on, so prefer it.
        salaryLabel: parseGoaSalary(field('Salary')),
      })
    } catch {
      // One unreadable posting must not sink the board.
    }
  }
  return postings
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
/** Detail fetches per run. Logged when hit, never silently truncated. */
const ORACLE_MAX_DETAILS = 150

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

  const postings: RawPosting[] = []
  for (const req of wanted.slice(0, ORACLE_MAX_DETAILS)) {
    if (!req.Id || !req.Title) continue
    try {
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
      if (!info) continue

      const html = [
        info.ExternalDescriptionStr ?? '',
        info.ExternalResponsibilitiesStr ?? '',
        info.ExternalQualificationsStr ?? '',
      ].filter(Boolean).join('')
      if (!html.trim()) continue

      postings.push({
        id: String(req.Id),
        title: req.Title.trim(),
        location: oracleLocation(req),
        descriptionHtml: html,
        applyUrl: `https://${host}/hcmUI/CandidateExperience/en/sites/${site}/job/${req.Id}`,
        postedAt: info.ExternalPostedStartDate ?? req.PostedDate ?? null,
        employmentType: normaliseEmployment(info.JobSchedule ?? req.JobSchedule ?? req.ContractType),
        validThrough: info.ExternalPostedEndDate ?? null,
      })
    } catch {
      // One unreadable posting must not sink the board.
    }
  }
  return postings
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
function extractBalancedDiv(html: string, opener: string): string | null {
  const start = html.indexOf(opener)
  if (start < 0) return null
  const inner = start + opener.length
  let depth = 1
  const tag = /<(\/?)div\b/g
  tag.lastIndex = inner
  let m: RegExpExecArray | null
  while ((m = tag.exec(html))) {
    depth += m[1] ? -1 : 1
    if (depth === 0) return html.slice(inner, m.index)
  }
  return null
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
    default: return []
  }
}
