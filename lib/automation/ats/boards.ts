/**
 * Employers whose public ATS board we read.
 *
 * Every entry here was verified live before being added — a guessed token
 * silently returns nothing, which looks identical to "this employer has no
 * openings right now". Confirmed 2026-08-02; the Calgary block 2026-08-11;
 * retail and the post-secondaries 2026-08-14.
 *
 * Adding an employer is a two-minute job and needs no permission: open their
 * careers page and the provider, token and (for Workday) datacenter and site
 * name are all visible in the URL.
 *
 *   Greenhouse   job-boards.greenhouse.io/{token}
 *   Lever        jobs.lever.co/{token}
 *   Ashby        jobs.ashbyhq.com/{token}
 *   Workday      {token}.{datacenter}.myworkdayjobs.com/{site}
 *   PeopleAdmin  {token}.peopleadmin.ca            → /postings/search.atom
 *   HRsmart      {tenant}.hua.hrsmart.com          → /hr/ats/JobSearch/viewAll
 *   Avanti       {tenant}.myavanti.ca/careers      → POST /careers/Job/Search
 *   TalentBrew   careers.{domain}                 → /jobs.xml?per_page=N
 *   PeopleSoft   recruiting.{domain}              → no feed; needs an indexUrl
 *
 * Finding one is the hard part, not adding it. Fetch the site ROOT and follow
 * its careers links — guessing `careers.{domain}` almost never resolves — then
 * grep for the vendor hosts above. Don't trust a "JavaScript required" banner:
 * HRsmart shows one on /JobSearch/index while /JobSearch/viewAll serves the
 * whole board as plain HTML.
 *
 * Boards with no Alberta postings today are kept rather than removed — they
 * cost one request per sync and start producing the moment they hire locally.
 */

import { AtsProvider, JobCity } from '@/lib/types/job'

export interface AtsBoard {
  provider: AtsProvider
  /** Board token, or Workday tenant. */
  token: string
  /** Display name — ATS feeds are inconsistent about company naming. */
  company: string
  /**
   * Company website, used only to resolve a logo. None of the ATS APIs return
   * one, so it's curated here alongside the token. Omit and the card falls back
   * to a lettered tile rather than showing a broken image.
   */
  domain?: string
  /**
   * Overrides `domain` for logo lookup only. Needed where `domain` is the board
   * origin rather than the corporate site — jobpostings.alberta.ca has no
   * recognisable mark, alberta.ca does.
   */
  logoDomain?: string
  /** Workday only: datacenter subdomain, e.g. "wd3". */
  datacenter?: string
  /** Workday and Oracle: career site name, e.g. "Careers" or "UOA-Careers". */
  site?: string
  /**
   * Oracle only: the tenant's API hostname. Kept separate from `domain` because
   * it's an opaque vendor host (`iaejup.fa.ocs.oraclecloud.com`) that would be
   * useless as a logo source — `domain` stays the employer's own site.
   */
  host?: string
  /**
   * Site names this board uses in place of a city, mapped onto the city they're
   * actually in.
   *
   * Most boards state a municipality. A few state an internal site instead:
   * NAIT posts every role against "Main Campus" / "Souch Campus" / "Patricia
   * Campus", which named no city, so 24 of its 25 openings were silently
   * dropped by the Alberta filter — only "Spruce Grove Campus" got through, on
   * the accident of containing a town name.
   *
   * Applied only when the location text matches no city on its own, so a board
   * that usually states a real city is unaffected.
   */
  locationAliases?: Array<{ pattern: RegExp; city: JobCity }>
  /**
   * PeopleSoft only: a machine-readable list of the employer's open postings,
   * because PeopleSoft itself publishes none. The City of Calgary puts one on
   * its own open data portal, which is a better source than its careers page —
   * the City keeps it current, and nobody promises the page's markup.
   *
   * It supplies ids, titles and closing dates; the descriptions still come from
   * the posting pages it links to.
   */
  indexUrl?: string
}

export const ATS_BOARDS: AtsBoard[] = [
  // ── Ashby ──────────────────────────────────────────────────────────────────
  { provider: 'ashby', token: 'neofinancial', company: 'Neo Financial', domain: 'neofinancial.com' },
  { provider: 'ashby', token: 'benevity', company: 'Benevity', domain: 'benevity.com' },
  { provider: 'ashby', token: 'jobber', company: 'Jobber', domain: 'getjobber.com' },
  { provider: 'ashby', token: 'absorblms', company: 'Absorb LMS', domain: 'absorblms.com' },

  // ── Lever ──────────────────────────────────────────────────────────────────
  { provider: 'lever', token: 'sait', company: 'SAIT', domain: 'sait.ca' },
  { provider: 'lever', token: 'trellis', company: 'Trellis' },

  // ── Greenhouse ─────────────────────────────────────────────────────────────
  { provider: 'greenhouse', token: 'stackadapt', company: 'StackAdapt', domain: 'stackadapt.com' },
  { provider: 'greenhouse', token: 'bird', company: 'Bird', domain: 'bird.co' },
  { provider: 'greenhouse', token: 'chata', company: 'Chata', domain: 'chata.ai' },

  // ── Workday ────────────────────────────────────────────────────────────────
  { provider: 'workday', token: 'cenovus', company: 'Cenovus Energy', domain: 'cenovus.com', datacenter: 'wd3', site: 'Careers' },
  { provider: 'workday', token: 'enbridge', company: 'Enbridge', domain: 'enbridge.com', datacenter: 'wd3', site: 'enbridge_careers' },
  { provider: 'workday', token: 'capitalpower', company: 'Capital Power', domain: 'capitalpower.com', datacenter: 'wd10', site: 'External' },
  { provider: 'workday', token: 'enmax', company: 'ENMAX', domain: 'enmax.com', datacenter: 'wd3', site: 'enmaxCareers' },
  {
    provider: 'workday', token: 'nait', company: 'NAIT', domain: 'nait.ca',
    datacenter: 'wd10', site: 'nait_careers',
    // Every NAIT campus is in the Edmonton region. Spruce Grove is listed
    // explicitly rather than left to the catch-all so it lands on its own
    // commuter city the way the location matcher already handles it.
    locationAliases: [
      { pattern: /\bspruce\s*grove\b/i, city: 'edmonton' },
      { pattern: /\bcampus\b/i, city: 'edmonton' },
    ],
  },
  { provider: 'workday', token: 'suncor', company: 'Suncor', domain: 'suncor.com', datacenter: 'wd1', site: 'Suncor_External' },
  // Provincial agencies. Both verified 2026-09-03.
  //
  // Deliberately no locationAliases on either. Workday states a bare count
  // ("8 Locations") when a posting spans offices, and the fetcher matches on
  // that string alone, so a catch-all would stamp every multi-office job with
  // one city it may not be in. Losing those beats mislabelling them; the
  // postings that name a real place still come through.
  { provider: 'workday', token: 'aer', company: 'Alberta Energy Regulator', domain: 'aer.ca', datacenter: 'wd3', site: 'aer' },
  { provider: 'workday', token: 'aimco', company: 'AIMCo', domain: 'aimco.ca', datacenter: 'wd10', site: 'AIMCoCareers' },
  { provider: 'workday', token: 'finning', company: 'Finning', domain: 'finning.com', datacenter: 'wd3', site: 'External' },
  { provider: 'workday', token: 'ledcor', company: 'Ledcor', domain: 'ledcor.com', datacenter: 'wd3', site: 'Ledcor_External' },
  { provider: 'workday', token: 'strathconaresources', company: 'Strathcona Resources', domain: 'strathconaresources.com', datacenter: 'wd10', site: 'Careers' },

  // Retail, added 2026-08-14 to reach the cities outside Calgary and Edmonton.
  // Every board above is a head office or a campus, which is why Medicine Hat
  // had two openings and Grande Prairie seven — the employers who actually hire
  // in those cities are grocers and big-box stores, not oil and gas.
  //
  // Save-On-Foods is the single biggest fix available: 97 Alberta postings, and
  // the only board here present in all seven of our cities. The tenant is
  // Pattison Food Group ('pfg'), which also owns the PFGCareers site — that one
  // is corporate roles in BC and is deliberately not read.
  { provider: 'workday', token: 'pfg', company: 'Save-On-Foods', domain: 'saveonfoods.com', datacenter: 'wd3', site: 'SaveonfoodsCareers' },
  { provider: 'workday', token: 'homedepot', company: 'The Home Depot Canada', domain: 'homedepot.ca', datacenter: 'wd5', site: 'CareerDepotCanada' },
  // Corporate and distribution roles only — Canadian Tire's store jobs are
  // posted by the individual dealers, who are not on this board. Four Calgary
  // openings today, for six list requests a sync.
  { provider: 'workday', token: 'canadiantirecorporation', company: 'Canadian Tire', domain: 'canadiantire.ca', datacenter: 'wd3', site: 'Enterprise_External_Careers_Site' },

  // Added while the University of Calgary was still unreadable — a downtown
  // Calgary post-secondary with ~15,000 students, 18 of its 20 postings in
  // Calgary. UCalgary is now carried too (TalentBrew, below); this stays,
  // because it is a different employer and not a stand-in.
  { provider: 'workday', token: 'bowvalleycollege', company: 'Bow Valley College', domain: 'bowvalleycollege.ca', datacenter: 'wd10', site: 'BowValleyCollege' },

  // Calgary-weighted additions, confirmed live 2026-08-11. The board skewed
  // heavily to Edmonton (391 active postings against Calgary's 122), and the
  // gap was supply, not demand — these are all Calgary head offices.
  { provider: 'workday', token: 'tcenergy', company: 'TC Energy', domain: 'tcenergy.com', datacenter: 'wd3', site: 'CAREER_SITE_TC' },
  { provider: 'workday', token: 'keyera', company: 'Keyera', domain: 'keyera.com', datacenter: 'wd10', site: 'Keyera_Careers' },
  // Tenant is 'wgl' (WGL Holdings, acquired 2018), not 'altagas' — the board
  // still runs under the old company's Workday tenant. `company` is what
  // readers see; the token only has to match the URL.
  { provider: 'workday', token: 'wgl', company: 'AltaGas', domain: 'altagas.ca', datacenter: 'wd5', site: 'AltaGas' },
  { provider: 'workday', token: 'wcap', company: 'Whitecap Resources', domain: 'wcap.ca', datacenter: 'wd10', site: 'Whitecap_Careers' },
  // Calgary head office, but every posting today is in BC or France. Kept per
  // the policy above: the board is verified and costs one request per sync.
  { provider: 'workday', token: 'vermilionenergy', company: 'Vermilion Energy', domain: 'vermilionenergy.com', datacenter: 'wd10', site: 'VEI_EXTERNAL' },

  // BMO (bmo/wd3/External) and CIBC (cibc/wd3/search) are reachable and carry
  // real Calgary openings — personal bankers, customer service, branch roles.
  // They are left out because fetchWorkday pages the whole board and stops at
  // WORKDAY_MAX_PAGES: BMO posts 1,114 jobs nationally against a 300-posting
  // ceiling, so we would read a third of the board, miss most Alberta roles,
  // and spend 15 requests a sync doing it — while showing a page that looks
  // complete. Adding them needs the Workday location facet so the filter runs
  // server-side, not another entry in this list.

  // ── Oracle Recruiting Cloud ────────────────────────────────────────────────
  {
    provider: 'oracle',
    token: 'university-of-alberta',
    company: 'University of Alberta',
    domain: 'ualberta.ca',
    host: 'iaejup.fa.ocs.oraclecloud.com',
    site: 'UOA-Careers',
  },
  // The board's biggest source of entry-level work: 153 postings, every one of
  // them Alberta, and overwhelmingly Calgary (130, plus 22 across Airdrie, High
  // River, Cochrane, Strathmore and Okotoks, which the location matcher already
  // routes to Calgary). Deli and produce clerks, meat wrappers, gas bar
  // attendants — the roles a reader without a degree or a decade of experience
  // can actually apply for, which the oil-and-gas head offices never post.
  {
    provider: 'oracle',
    token: 'calgary-coop',
    company: 'Calgary Co-op',
    domain: 'calgarycoop.com',
    host: 'fa-etus-saasfaprod1.fa.ocs.oraclecloud.com',
    site: 'CX_2004',
  },
  // Red Deer's own municipality, and on its own the largest employer we can
  // reach there — 14 postings against the four the city page had in total.
  // Calgary's largest head-office employer we can reach, and the strongest
  // source of the professional roles the board was thin on. Verified 2026-09-02:
  // 106 requisitions, overwhelmingly Calgary — royalty analysts, property
  // accountants, area geologists, facilities engineers — plus Fort McMurray
  // site work, which no other board here supplies.
  {
    provider: 'oracle',
    token: 'canadian-natural',
    company: 'Canadian Natural Resources',
    domain: 'cnrl.com',
    host: 'ehaa.fa.ca2.oraclecloud.com',
    site: 'CNRL-Professional',
  },
  {
    provider: 'oracle',
    token: 'city-of-red-deer',
    company: 'City of Red Deer',
    domain: 'reddeer.ca',
    host: 'fa-eyjj-saasfaprod1.fa.ocs.oraclecloud.com',
    site: 'CX_1',
  },
  {
    provider: 'oracle',
    token: 'strathcona-county',
    company: 'Strathcona County',
    domain: 'strathcona.ca',
    host: 'fa-erjf-saasfaprod1.fa.ocs.oraclecloud.com',
    site: 'CX_1',
  },

  // ── SuccessFactors ─────────────────────────────────────────────────────────
  // `domain` doubles as the site origin here, not just a logo hint: the whole
  // board lives on jobpostings.alberta.ca.
  {
    provider: 'successfactors',
    token: 'government-of-alberta',
    company: 'Government of Alberta',
    domain: 'jobpostings.alberta.ca',
    logoDomain: 'alberta.ca',
  },
  // Fort McMurray's municipality. Its site renders no location column at all,
  // so the city is recovered from the job URL — see locationFromSlug. Postings
  // in the outlying hamlets (Conklin, Janvier, Fort Chipewyan) name no city we
  // cover and are dropped, which is correct.
  {
    provider: 'successfactors',
    token: 'norquest-college',
    company: 'NorQuest College',
    domain: 'careers.norquest.ca',
    logoDomain: 'norquest.ca',
  },
  {
    provider: 'successfactors',
    token: 'wood-buffalo',
    company: 'Regional Municipality of Wood Buffalo',
    domain: 'jobs.rmwb.ca',
    logoDomain: 'rmwb.ca',
  },
  // Edmonton-headquartered and employee-owned, and the largest general
  // contractor we can reach. Verified 2026-09-02: the board answers on
  // /search/?startrow=0 and carries Edmonton and Calgary roles well beyond the
  // trades — estimators, schedulers, integration developers, government
  // relations. `domain` is the board origin, as with the entries above.
  {
    provider: 'successfactors',
    token: 'pcl',
    company: 'PCL Construction',
    domain: 'careers.pcl.com',
    logoDomain: 'pcl.com',
  },

  // ── Oracle Talent Social Sourcing — DELIBERATELY NOT ENABLED ──────────────
  //
  // Alberta Health Services (992 postings, ~500 in our cities) and Covenant
  // Health (111) both publish here, and the `otss` provider in providers.ts is
  // written and works. They are not in this list on purpose.
  //
  // Their Taleo career sections are decommissioned (the REST endpoint answers
  // `careerSectionUnAvailable: true`) and the branded sites are the real board.
  // On those sites `/jobs/search` — the only path that enumerates postings —
  // returns 403 to any client that doesn't present as a browser. Every other
  // path, including individual job pages and /latest-jobs, serves our real
  // User-Agent fine, so the block is aimed squarely at bulk listing.
  //
  // robots.txt reads "Disallow:" (allow everything), but that is a stated
  // policy, not the enforced one; the 403 is what the operator actually does.
  // Reading the search endpoint therefore needs a spoofed browser User-Agent,
  // which is defeating their bot protection, so we don't.
  //
  // Legitimate routes back in, roughly in order of effort:
  //   - ask AHS Recruitment for the syndication feed they already give Indeed
  //     and Google for Jobs, or to allow our User-Agent
  //   - the federal Job Bank XML feed (access application), which carries AHS
  //   - post individual headline roles by hand via /admin/jobs
  //
  // If a feed is granted, add the boards back here and the provider handles it.

  // ── Radancy TalentBrew ─────────────────────────────────────────────────────
  // `domain` is the board origin, as with SuccessFactors above.
  //
  // The University of Calgary, enabled 2026-08-25 and producing nothing until
  // 2026-08-27 — not one row ever reached the table.
  //
  // Two readers looked for a way past Cloudflare and both missed the door.
  // /search/jobs is blocked by where the request comes from rather than what it
  // asks for: it serves our User-Agent 115 postings from a laptop and 403s the
  // identical request from Vercel, so that reader passed every dry run and
  // failed every production sync. The sitemap that replaced it enumerated URLs
  // but no content, so it still paid a request per posting.
  //
  // /jobs.xml is the StandOut feed Radancy publishes for the aggregators. One
  // request, full descriptions, real localities, and ?per_page= lifts the
  // default 25 to all 111. It is the feed the previous note said to go and ask
  // UCalgary for; it was already public.
  //
  // The blanket alias stays as a backstop for the sitemap fallback, whose
  // campus names ("Main Campus", "Foothills") name no municipality. The feed
  // states "Calgary, AB" on all 111, so it never fires on the primary route.
  {
    provider: 'talentbrew',
    token: 'university-of-calgary',
    company: 'University of Calgary',
    domain: 'careers.ucalgary.ca',
    logoDomain: 'ucalgary.ca',
    locationAliases: [{ pattern: /^/, city: 'calgary' }],
  },

  // ── PeopleSoft HCM ─────────────────────────────────────────────────────────
  // `domain` is the board origin, as with SuccessFactors above.
  //
  // The City of Calgary, added 2026-08-27 — the counterpart to the City of
  // Edmonton, and the largest single employer missing from the Calgary page.
  //
  // PeopleSoft publishes no feed, so the postings are enumerated from the
  // City's own open data portal instead of its careers page. `indexUrl` is the
  // "City of Calgary Careers" dataset: 73 rows on the day this was added, the
  // same list the careers page renders, maintained by the City.
  //
  // Two quirks the provider handles and this entry depends on: PeopleSoft needs
  // a cookie round-trip before it will serve a posting, and a posting past its
  // closing date renders the search page instead of a 404 — so every page is
  // checked to be the one that was asked for.
  {
    provider: 'peoplesoft',
    token: 'city-of-calgary',
    company: 'City of Calgary',
    domain: 'recruiting.calgary.ca',
    logoDomain: 'calgary.ca',
    indexUrl: 'https://data.calgary.ca/resource/5fsi-n9xm.json?$limit=500',
  },

  // ── Phenom People ──────────────────────────────────────────────────────────
  // `domain` is the board origin, as with SuccessFactors above.
  {
    provider: 'phenom',
    token: 'city-of-edmonton',
    company: 'City of Edmonton',
    domain: 'recruitment.edmonton.ca',
    logoDomain: 'edmonton.ca',
  },
  // Both boards below carry their locale in the path, so `domain` includes it —
  // the fetcher interpolates it straight into the origin, and the detail URLs
  // (`/job/{id}/{slug}`) resolve underneath it. Verified 2026-09-03; dropping
  // the prefix returns the marketing shell with no job payload at all.
  //
  // ATCO is one of the largest Alberta-headquartered utilities we can reach:
  // 96 requisitions, 16 Edmonton and 4 Leduc on the first page alone.
  {
    provider: 'phenom',
    token: 'atco',
    company: 'ATCO',
    domain: 'careers.atco.com/global/en',
    logoDomain: 'atco.com',
  },
  // National rather than Alberta-based, so most of its board is Toronto,
  // Montreal and Vancouver — kept because the Calgary and Edmonton airport
  // roles it does post are ones no other board here carries.
  {
    provider: 'phenom',
    token: 'air-canada',
    company: 'Air Canada',
    domain: 'careers.aircanada.com/ca/en',
    logoDomain: 'aircanada.com',
  },

  // ── PeopleAdmin ────────────────────────────────────────────────────────────
  // `domain` is the portal origin, as with SuccessFactors above. The Atom feed
  // states no location, so the alias supplies one — but only after the matcher
  // has read the job title, which is what routes a role advertised at the
  // Calgary campus to Calgary instead.
  {
    provider: 'peopleadmin',
    token: 'university-of-lethbridge',
    company: 'University of Lethbridge',
    domain: 'uleth.peopleadmin.ca',
    logoDomain: 'ulethbridge.ca',
    locationAliases: [{ pattern: /^/, city: 'lethbridge' }],
  },
  {
    provider: 'peopleadmin',
    token: 'lethbridge-polytechnic',
    company: 'Lethbridge Polytechnic',
    domain: 'lethpolytech.peopleadmin.ca',
    logoDomain: 'lethpolytech.ca',
    locationAliases: [{ pattern: /^/, city: 'lethbridge' }],
  },
  {
    provider: 'peopleadmin',
    token: 'red-deer-polytechnic',
    company: 'Red Deer Polytechnic',
    domain: 'employment.rdpolytech.ca',
    logoDomain: 'rdpolytech.ca',
    locationAliases: [{ pattern: /^/, city: 'red-deer' }],
  },

  // ── Avanti Career Connector ────────────────────────────────────────────────
  {
    provider: 'avanti',
    token: 'keyano-college',
    company: 'Keyano College',
    domain: 'keyanocollege.myavanti.ca',
    logoDomain: 'keyano.ca',
  },
  // Spruce Grove states a department where every other board states a place —
  // "Community and Protective Services - Transit" — so nothing here names a
  // city and the location matcher would drop the whole board. The catch-all
  // alias is correct rather than lazy: the town has one set of offices, and
  // NAIT's entry above already routes Spruce Grove to Edmonton.
  {
    provider: 'avanti',
    token: 'spruce-grove',
    company: 'City of Spruce Grove',
    domain: 'sprucegrove.myavanti.ca',
    logoDomain: 'sprucegrove.org',
    locationAliases: [{ pattern: /^/, city: 'edmonton' }],
  },

  // ── Medicine Hat College (own website) ─────────────────────────────────────
  // No ATS; see the provider note. The alias supplies the city because the
  // pages state none. MHC's small Brooks campus is the known imprecision here —
  // a Brooks-based posting would show under Medicine Hat unless its title says
  // otherwise, which the matcher checks before falling back to this alias.
  {
    provider: 'mhc',
    token: 'medicine-hat-college',
    company: 'Medicine Hat College',
    domain: 'www.mhc.ab.ca',
    logoDomain: 'mhc.ab.ca',
    locationAliases: [{ pattern: /^/, city: 'medicine-hat' }],
  },

  // ── Plain RSS careers feed ─────────────────────────────────────────────────
  // `site` is the feed path, not a career-site name. MacEwan states no location
  // in the feed and has one campus, in Edmonton.
  {
    provider: 'rss',
    token: 'macewan-university',
    company: 'MacEwan University',
    domain: 'www.macewan.ca',
    logoDomain: 'macewan.ca',
    site: '/rss/?feed=all-careers',
    locationAliases: [{ pattern: /^/, city: 'edmonton' }],
  },

  // ── HRsmart / Deltek Talent ────────────────────────────────────────────────
  // `domain` is the tenant's board host, as with SuccessFactors above.
  //
  // Northwestern Polytechnic states a Location column, so its Fairview and
  // Grande Cache campuses correctly name no city we cover and drop out. Mount
  // Royal publishes no Location column at all, hence the alias — it has one
  // campus, in Calgary. The tenant name 'gprc' is Grande Prairie Regional
  // College, NWP's name before 2022; only the URL has to match.
  {
    provider: 'hrsmart',
    token: 'northwestern-polytechnic',
    company: 'Northwestern Polytechnic',
    domain: 'gprc.hua.hrsmart.com',
    logoDomain: 'nwpolytech.ca',
  },
  {
    provider: 'hrsmart',
    token: 'mount-royal-university',
    company: 'Mount Royal University',
    domain: 'mtroyalca.hua.hrsmart.com',
    logoDomain: 'mtroyal.ca',
    locationAliases: [{ pattern: /^/, city: 'calgary' }],
  },

  // ── Cadient Talent ─────────────────────────────────────────────────────────
  // Costco Wholesale Canada. `token` is Cadient's applicationName and `domain`
  // the shared board origin, the way the SuccessFactors entries work.
  //
  // Costco publishes no dated vacancies anywhere — this rolling pool is the
  // whole of its Canadian hourly hiring, and it covers the warehouses in
  // Calgary, Edmonton, Red Deer, Lethbridge, Medicine Hat and Grande Prairie.
  // Rows from it are excluded from JobPosting markup on purpose; see the note
  // in providers.ts and isIndexableJob in lib/jobs.ts.
  {
    provider: 'cadient',
    token: 'CostcoCanadaNonReqExtCanada',
    company: 'Costco Wholesale Canada',
    domain: 'cta.cadienttalent.com',
    logoDomain: 'costco.ca',
  },
]

/** Board token → company website, for logo lookup at render time. */
export const BOARD_DOMAINS: Record<string, string> = Object.fromEntries(
  ATS_BOARDS.filter(b => b.logoDomain || b.domain).map(b => [b.token, (b.logoDomain ?? b.domain)!])
)
