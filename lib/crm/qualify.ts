/**
 * Lead triage.
 *
 * Two jobs, both done at capture time so nothing downstream has to think:
 *
 *   1. Filter out link sellers. They arrive constantly, they look like
 *      advertisers, and they are the one category we will never sell to —
 *      paid dofollow links risk a manual action on the organic traffic the
 *      whole business rests on. They get tier 'decline' and are never
 *      sequenced, so they cost zero follow-up attention.
 *
 *   2. Guess the tier, which picks the cadence. A wrong guess is cheap: the
 *      admin UI can change it, and changing it re-picks the sequence.
 */

export type Tier = 'institution' | 'smb' | 'no_budget' | 'decline'

/**
 * Operators and marketplaces that resell links and guest posts. Matched against
 * the email domain and the free-text company name.
 */
const LINK_SELLER_DOMAINS = [
  'linkhouseconnects.com',
  'linkhouse.co',
  'whitepress.com',
  'getfluence.com',
  'adsy.com',
  'prposting.com',
  'serpzilla.com',
  'collaborator.pro',
  'rankz.io',
  'outreachmama.com',
  'fatjoe.com',
]

/** Phrases that only appear in link-buying and guest-post solicitations. */
const LINK_SELLER_PHRASES = [
  'guest post',
  'guest posting',
  'link building',
  'link-building',
  'linkbuilding',
  'backlink',
  'do-follow',
  'dofollow',
  'link insertion',
  'link placement',
  'sponsored link',
  'niche edit',
  'paid post',
  'seo agency',
  'seo outreach',
]

/**
 * Institutional signals — organisations with a media budget and a procurement
 * cycle. These get the slower, vertical-sponsorship cadence.
 */
const INSTITUTION_DOMAIN_HINTS = ['.edu', '.gov', '.ac.', 'ualberta.ca', 'ucalgary.ca']
const INSTITUTION_PHRASES = [
  'university',
  'college',
  'polytechnic',
  'institute',
  'credit union',
  'bank',
  'insurance',
  'municipality',
  'city of',
  'county of',
  'tourism',
  'travel alberta',
  'health',
  'authority',
  'association',
  'foundation',
  'chamber of commerce',
  'school division',
]

/**
 * Organisations that reliably have no cash — indie arts groups, small
 * promoters, volunteer-run events. Worth staying friendly with, not worth a
 * four-step sales cadence. They are captured but never sequenced.
 */
const NO_BUDGET_PHRASES = [
  'non-profit',
  'nonprofit',
  'not-for-profit',
  'volunteer',
  'collective',
  'grassroots',
  'student union',
  'fundraiser',
]

function haystack(input: { company?: string | null; email?: string | null; website?: string | null; notes?: string | null }): string {
  return [input.company, input.email, input.website, input.notes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function emailDomain(email?: string | null): string {
  const at = (email || '').lastIndexOf('@')
  return at === -1 ? '' : email!.slice(at + 1).toLowerCase().trim()
}

export type QualifyResult = {
  tier: Tier
  /** Why we landed on this tier — written into lead_events so it is auditable. */
  reason: string
  /** null for tiers we never email. */
  sequenceKey: 'smb_intro' | 'institution_intro' | null
}

export function qualifyLead(input: {
  company?: string | null
  email?: string | null
  website?: string | null
  notes?: string | null
  /** Set when the lead came from someone contacting us first. */
  inbound?: boolean
}): QualifyResult {
  const text = haystack(input)
  const domain = emailDomain(input.email)

  const sellerDomain = LINK_SELLER_DOMAINS.find(d => domain === d || domain.endsWith(`.${d}`))
  if (sellerDomain) {
    return { tier: 'decline', reason: `Known link-seller domain (${sellerDomain})`, sequenceKey: null }
  }

  const sellerPhrase = LINK_SELLER_PHRASES.find(p => text.includes(p))
  if (sellerPhrase) {
    return { tier: 'decline', reason: `Link-selling language ("${sellerPhrase}")`, sequenceKey: null }
  }

  const institutionHint =
    INSTITUTION_DOMAIN_HINTS.find(h => domain.includes(h)) || INSTITUTION_PHRASES.find(p => text.includes(p))
  if (institutionHint) {
    return {
      tier: 'institution',
      reason: `Institutional signal ("${institutionHint}")`,
      sequenceKey: 'institution_intro',
    }
  }

  const noBudget = NO_BUDGET_PHRASES.find(p => text.includes(p))
  if (noBudget) {
    return {
      tier: 'no_budget',
      // Captured, kept warm by hand, but never put into a paid cadence.
      reason: `Likely no media budget ("${noBudget}")`,
      sequenceKey: null,
    }
  }

  return {
    tier: 'smb',
    reason: input.inbound ? 'Inbound enquiry, no institutional signal' : 'Default: local business',
    sequenceKey: 'smb_intro',
  }
}

/**
 * CASL basis, guessed at capture. Not legal advice and deliberately
 * conservative — anything we cannot justify is left null so the admin UI can
 * flag it rather than the system inventing consent it does not have.
 */
export function guessConsentBasis(input: {
  source: string
  email?: string | null
  website?: string | null
}): { basis: string | null; note: string } {
  if (input.source === 'inbound' || input.source === 'partner_form') {
    return {
      basis: 'implied_inquiry',
      note: 'They contacted us first — implied consent runs 6 months from the enquiry.',
    }
  }

  const domain = emailDomain(input.email)
  const site = (input.website || '').toLowerCase()
  // A role address published on the company's own site is the textbook
  // conspicuous-publication case, but only when it is their domain and not a
  // free mailbox scraped from somewhere else.
  const isFreeMailbox = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'].includes(domain)
  if (domain && !isFreeMailbox && site.includes(domain)) {
    return {
      basis: 'implied_published',
      note: 'Business address published on their own site, contacted about their role.',
    }
  }

  return {
    basis: null,
    // Left blank on purpose: the admin has to look at it before this lead is
    // emailed. Guessing here is how a compliance problem gets manufactured.
    note: 'No basis established — confirm before sending.',
  }
}
