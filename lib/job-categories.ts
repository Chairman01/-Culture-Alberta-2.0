/**
 * The specialty a posting belongs to, worked out from its title.
 *
 * None of the feeds supply one. lib/automation/ats/index.ts stored `category: null`
 * on every ATS row, which left 1,289 of 1,379 active jobs uncategorised and the
 * board's category filter offering two options for the whole province. Rather than
 * only backfilling a column — which would then drift every time this list changes —
 * the value is derived on read, the same way inferEmploymentType and
 * detectUnionStatus already are. The sync stores it too, so a later query can
 * filter in Postgres without re-deriving 1,400 rows.
 *
 * Order is the entire design: first match wins, so the list runs specific to
 * general. "Financial Analyst" has to reach Finance before IT claims it for
 * "analyst"; "Sales Associate" has to reach Retail before Sales takes it; and the
 * broad admin and management rules sit at the bottom where they can only pick up
 * what nothing else wanted.
 *
 * Matching is on the title alone. Descriptions read as boilerplate — nearly every
 * posting mentions "team", "safety" and "customer" somewhere — and testing against
 * them produced worse categories than testing against nothing.
 */

export interface Specialty {
  /** Display name, and the value stored in jobs.category. */
  name: string
  test: RegExp
}

export const SPECIALTIES: Specialty[] = [
  {
    name: 'Health & Medicine',
    test: /\b(nurse|nursing|rn|lpn|physician|surgeon|medical|clinical|physiotherap|physical therap|occupational therap|respiratory therap|speech[- ]language|pharmac|dental|dentist|hygienist|paramedic|radiolog|sonograph|ultrasound|midwif|dietit|nutritionist|psycholog|psychiatr|chiropract|optomet|audiolog|veterinar|health ?care aide|patient care|phlebotom|kinesiolog|podiat|therapy assistant|optician|optical|hearing instrument)\b/,
  },
  {
    name: 'Social Work & Counselling',
    test: /\b(social work|counsellor|counselor|counselling|counseling|case manager|case management|outreach worker|addictions?|mental health|child and youth|youth worker|family support|community support|crisis|shelter worker|settlement worker|support worker|disability services)\b/,
  },
  {
    name: 'Legal',
    test: /\b(lawyer|attorney|legal counsel|general counsel|paralegal|articling|law clerk|legal assistant|legal administrat|solicitor|barrister|notary|litigation|prosecutor)\b/,
  },
  {
    name: 'Finance & Accounting',
    test: /\b(accountant|accounting|financial|finance|controller|comptroller|auditor|auditing|payroll|bookkeep|treasury|taxation|tax (analyst|specialist|manager)|actuar|underwrit|credit analyst|accounts (payable|receivable)|cpa|budget analyst|investment|portfolio manager|banking|teller|mortgage|procurement|purchasing|pension|royalty analyst)\b/,
  },
  {
    name: 'Engineering',
    test: /\b(engineer|engineering|geoscientist|geologist|geotechnical|land surveyor|survey technologist|draftsperson|drafting|cad technician|metallurgist|hydrogeolog)\b/,
  },
  {
    name: 'IT & Software',
    test: /\b(software|developer|programmer|devops|full[- ]?stack|front[- ]?end|back[- ]?end|web develop|data (scientist|engineer|analyst)|data ?base|sql|cyber ?security|information security|network (admin|analyst|engineer|technician)|systems (analyst|administrator)|sysadmin|it (support|technician|analyst|specialist|manager|advisor)|help ?desk|service desk|quality assurance analyst|cloud|machine learning|scrum master|product manager|ux|ui designer|business (systems?|solutions)|servicenow|geographic information|gis|solutions architect|technical support|informatics)\b/,
  },
  {
    name: 'Science & Research',
    test: /\b(research (associate|assistant|coordinator|technician|scientist)|scientist|laboratory|lab (technician|technologist|assistant)|biologist|chemist|microbiolog|toxicolog|postdoctoral|clinical trial|environmental (scientist|science|technician|specialist|advisor)|statistician)\b/,
  },
  {
    name: 'Education & Training',
    test: /\b(teacher|instructor|professor|lecturer|faculty|tutor|curriculum|education(al)? assistant|early childhood educator|ece|principal|dean|academic advisor|librarian|registrar|student (advisor|services|success)|training (specialist|coordinator|advisor)|trainer|invigilator|professeur|enseignant)\b/,
  },
  {
    name: 'Human Resources',
    test: /\b(human resources|hr (advisor|manager|generalist|coordinator|business partner|assistant|specialist)|recruit(er|ment|ing)|talent acquisition|(labour|labor) relations|compensation|benefits (advisor|specialist|coordinator)|organizational (development|learning)|learning (&|and) development|executive search|occupational health|\bhs&e\b|health (&|and) safety)\b/,
  },
  {
    name: 'Marketing & Communications',
    test: /\b(marketing|communications|social media|content (creator|specialist|writer|coordinator)|brand|public relations|graphic design|copywriter|digital (marketing|strategist)|seo|advertising|media relations|editor|journalist|videographer|photographer|fundraising|donor relations)\b/,
  },
  {
    name: 'Protective Services',
    test: /\b(police|constable|firefighter|fire fighter|security (guard|officer|supervisor|analyst)|peace officer|corrections|bylaw|emergency (management|communications|services)|loss prevention)\b/,
  },
  {
    name: 'Government & Policy',
    test: /\b(policy (analyst|advisor|coordinator)|legislative|election|referendum|returning officer|city clerk|planner|planning (technician|analyst|assistant)|permit|licensing|assessor|economic development|intergovernmental)\b/,
  },
  {
    name: 'Skilled Trades',
    test: /\b(electrician|plumber|welder|welding|millwright|carpenter|machinist|mechanic|hvac|refrigeration|apprentice|journey(man|person)|pipefitter|steamfitter|ironworker|boilermaker|crane operator|heavy equipment|instrumentation|power engineer|glazier|roofer|insulator|sheet metal|automotive|diesel|technologist|technician|operator|tire (installer|technician)|installer)\b/,
  },
  {
    name: 'Transportation & Logistics',
    test: /\b(driver|truck|delivery|courier|warehouse|forklift|dispatch|logistics|supply chain|shipper|receiver|shipping|inventory|fleet|transit|transport|freight|sorter)\b/,
  },
  {
    name: 'Construction & Facilities',
    test: /\b(construction|labourer|laborer|general labour|site supervisor|foreman|estimator|scaffold|concrete|framing|superintendent|janitor|custodian|cleaner|housekeep|groundskeep|maintenance|facilities|caretaker|building (operator|service)|utility worker)\b/,
  },
  {
    name: 'Hospitality & Food Service',
    test: /\b(server|cook|chef|barista|host(ess)?|kitchen|restaurant|hotel|food service|dishwasher|catering|banquet|concierge|front desk|guest service|baker|butcher|deli|food counter|meat cutter|cake decorator|food prep)\b/,
  },
  {
    name: 'Retail & Customer Service',
    test: /\b(cashier|retail|store (associate|manager|clerk|supervisor|person)|merchandis|customer (service|experience|care)|sales associate|stock(er|ing)|grocery|produce clerk|checkout|call c(en|re)ntre|contact centre|clerk|personal shopper|lumber associate)\b/,
  },
  {
    name: 'Sales & Business Development',
    test: /\b(sales|account (executive|manager|representative)|business development|territory manager|inside sales|client relations|partnerships?)\b/,
  },
  {
    name: 'Recreation & Culture',
    test: /\b(recreation|fitness|lifeguard|aquatic|coach|athletic|museum|curator|gallery|performing arts|theatre|camp (leader|counsellor)|program (leader|facilitator|assistant))\b/,
  },
  {
    // Professional roles the specific rules miss because the title names a
    // function rather than a field — "Business Strategist", "Regulatory
    // Specialist", "Program Officer", "PMO Analyst". Placed after every subject
    // rule so a Financial Analyst is still Finance, and before Administration so
    // its broad coordinator/assistant catch cannot claim them first.
    name: 'Analysis & Consulting',
    test: /\b(analyst|analysis|consultant|consulting|advisor|adviser|strategist|specialist|subject matter expert|regulatory|program officer|project (manager|officer))\b/,
  },
  {
    name: 'Administration & Office',
    test: /\b(administrative|administrator|admin assistant|receptionist|office (manager|assistant|coordinator|administrator)|executive assistant|data entry|scheduler|records|secretary|coordinator|assistant)\b/,
  },
  {
    name: 'Management',
    test: /\b(director|vice president|vp|chief|general manager|manager|supervisor|head of|lead)\b/,
  },
]

/** Every specialty name, in display order. */
export const SPECIALTY_NAMES: string[] = SPECIALTIES.map(s => s.name)

/** What a posting gets when no rule matches. */
export const UNCATEGORISED = 'Other'

/**
 * Categories written before this taxonomy existed, mapped onto their successor.
 *
 * Without this the board grew two chips for one field — a handful of manually
 * entered rows kept "Government & Public Service" while every derived row said
 * "Government & Policy", and a reader filtering by one silently missed the other.
 */
const LEGACY_ALIASES: Record<string, string> = {
  'Government & Public Service': 'Government & Policy',
  'Hospitality & Catering': 'Hospitality & Food Service',
}

const KNOWN_CATEGORIES = new Set<string>([...SPECIALTY_NAMES, UNCATEGORISED])

/**
 * The specialty to show for a posting, preferring what the row already stores.
 *
 * A stored value is only trusted when it is part of the current taxonomy;
 * anything else is re-derived from the title, so retiring or renaming a
 * specialty here cannot leave orphan chips behind on old rows.
 */
export function resolveCategory(
  stored: string | null | undefined,
  title: string | null | undefined
): string {
  if (stored) {
    const alias = LEGACY_ALIASES[stored]
    if (alias) return alias
    if (KNOWN_CATEGORIES.has(stored)) return stored
  }
  return inferCategory(title)
}

/**
 * First matching specialty for a job title, or 'Other'.
 *
 * Title-only, so this stays cheap enough to run over every active job on each
 * render of the board.
 */
export function inferCategory(title: string | null | undefined): string {
  if (!title) return UNCATEGORISED
  const t = title.toLowerCase()
  for (const s of SPECIALTIES) {
    if (s.test.test(t)) return s.name
  }
  return UNCATEGORISED
}
