/**
 * Alberta rent increase rules — single source of truth for the rental increase
 * calculator, its FAQ copy, and its structured data.
 *
 * Sources (verified 2026-07-30):
 *  - Residential Tenancies Act, RSA 2000, c R-17.1
 *  - CPLEA (Centre for Public Legal Education Alberta), Notice of Rent Increase
 *    https://www.landlordandtenant.org/notices/rent-increase/
 *  - Mobile Home Sites Tenancies Act, RSA 2000, c M-20
 *
 * The rules that actually matter, and the traps in each:
 *
 *  1. NOTICE LENGTH depends on the tenancy type, not a flat 3 months:
 *       monthly periodic  — 3 full tenancy months
 *       weekly periodic   — 12 tenancy weeks (84 days)
 *       other periodic    — 90 days
 *       mobile home site  — 180 days
 *       fixed term        — rent cannot be raised mid-term at all
 *
 *  2. "3 full tenancy months" is NOT "notice date + 3 months". CPLEA's worked
 *     example: to raise rent on November 1, notice must be served by July 31.
 *     Three *whole* months (Aug, Sep, Oct) have to sit between the notice month
 *     and the effective date, so the earliest effective date is the first day of
 *     the fourth month after the notice month. Notice on April 1 and notice on
 *     April 30 both land on August 1.
 *
 *  3. The gap between increases is 365 DAYS, not twelve calendar months, and it
 *     runs from the later of the last increase or the day the tenant moved in.
 *
 *  4. A fixed-term lease cannot be increased partway through even if 365 days
 *     have passed. The landlord has to wait for the term to end.
 */

// ---------------------------------------------------------------------------
// Tenancy types
// ---------------------------------------------------------------------------

export type TenancyType =
  | "monthly"
  | "weekly"
  | "other-periodic"
  | "fixed-term"
  | "mobile-home"

export interface TenancyRule {
  value: TenancyType
  label: string
  /** Short hint shown under the option. */
  hint: string
  /** How the notice requirement is described to the user. */
  noticeLabel: string
}

export const TENANCY_RULES: TenancyRule[] = [
  {
    value: "monthly",
    label: "Month to month",
    hint: "The most common. You pay monthly with no fixed end date.",
    noticeLabel: "3 full tenancy months",
  },
  {
    value: "fixed-term",
    label: "Fixed-term lease",
    hint: "A lease with a set end date, like a one-year term.",
    noticeLabel: "No increase allowed during the term",
  },
  {
    value: "weekly",
    label: "Week to week",
    hint: "You pay weekly with no fixed end date.",
    noticeLabel: "12 tenancy weeks (84 days)",
  },
  {
    value: "other-periodic",
    label: "Other periodic",
    hint: "Any other repeating term, such as quarterly.",
    noticeLabel: "90 days",
  },
  {
    value: "mobile-home",
    label: "Mobile home site",
    hint: "You rent the land your mobile home sits on.",
    noticeLabel: "180 days",
  },
]

/** Minimum days between rent increases, from the last increase or move-in. */
export const MIN_DAYS_BETWEEN_INCREASES = 365

export const NOTICE_DAYS: Partial<Record<TenancyType, number>> = {
  weekly: 84,
  "other-periodic": 90,
  "mobile-home": 180,
}

// ---------------------------------------------------------------------------
// Date helpers
//
// All dates are handled as UTC midnight built from Y/M/D parts. Date inputs give
// us "YYYY-MM-DD" with no timezone, and mutating a Date with setMonth() silently
// overflows (Oct 31 + 4 months lands on March 3, not March 1), so we never
// mutate — we always rebuild from components.
// ---------------------------------------------------------------------------

/** Parse a "YYYY-MM-DD" input value into a UTC-midnight Date, or null. */
export function parseDateInput(value: string): Date | null {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  const [, y, mo, d] = m
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)))
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000)
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

/**
 * First day of the month that is `months` months after `date`'s month.
 * Built from components so day-of-month never overflows.
 */
function firstOfMonthAfter(date: Date, months: number): Date {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + months
  return new Date(Date.UTC(y + Math.floor(m / 12), ((m % 12) + 12) % 12, 1))
}

// ---------------------------------------------------------------------------
// Notice rules
// ---------------------------------------------------------------------------

/**
 * Earliest date a rent increase can legally take effect, given the date written
 * notice was served. Returns null for fixed-term tenancies, where no mid-term
 * increase is permitted at all.
 */
export function earliestEffectiveDate(noticeDate: Date, tenancy: TenancyType): Date | null {
  if (tenancy === "fixed-term") return null

  if (tenancy === "monthly") {
    // Three *full* tenancy months must fall between the notice month and the
    // effective date, so the earliest is the 1st of the fourth month after.
    return firstOfMonthAfter(noticeDate, 4)
  }

  const days = NOTICE_DAYS[tenancy]
  if (days == null) return null
  return addDays(noticeDate, days)
}

/** Human-readable description of the notice requirement. */
export function noticeRequirementLabel(tenancy: TenancyType): string {
  return TENANCY_RULES.find((r) => r.value === tenancy)?.noticeLabel ?? ""
}

// ---------------------------------------------------------------------------
// Full check
// ---------------------------------------------------------------------------

export type CheckStatus = "pass" | "fail" | "unknown"

export interface RentIncreaseCheck {
  /** Money */
  currentRent: number
  newRent: number
  monthlyIncrease: number
  percentIncrease: number
  annualIncrease: number

  /** Notice timing */
  noticeStatus: CheckStatus
  earliestDate: Date | null
  noticeDate: Date | null
  effectiveDate: Date | null

  /** 365-day frequency */
  frequencyStatus: CheckStatus
  daysSinceLast: number | null
  earliestByFrequency: Date | null

  /** Fixed-term tenancies cannot be increased mid-term at all. */
  fixedTermBlocked: boolean

  /** Overall: "fail" if any check failed, "pass" if all answered checks passed. */
  overall: CheckStatus
}

export function checkRentIncrease(input: {
  currentRent: number
  newRent: number
  tenancy: TenancyType
  noticeDate: Date | null
  effectiveDate: Date | null
  /** Last increase, or move-in date if there has never been one. */
  lastIncreaseDate: Date | null
}): RentIncreaseCheck {
  const { currentRent, newRent, tenancy, noticeDate, effectiveDate, lastIncreaseDate } = input

  const monthlyIncrease = newRent - currentRent
  const percentIncrease = currentRent > 0 ? (monthlyIncrease / currentRent) * 100 : 0

  // ---- Notice timing ----
  const earliestDate = noticeDate ? earliestEffectiveDate(noticeDate, tenancy) : null
  let noticeStatus: CheckStatus = "unknown"
  if (earliestDate && effectiveDate) {
    noticeStatus = effectiveDate >= earliestDate ? "pass" : "fail"
  }

  // ---- 365-day frequency ----
  let frequencyStatus: CheckStatus = "unknown"
  let daysSinceLast: number | null = null
  let earliestByFrequency: Date | null = null
  if (lastIncreaseDate) {
    earliestByFrequency = addDays(lastIncreaseDate, MIN_DAYS_BETWEEN_INCREASES)
    if (effectiveDate) {
      daysSinceLast = daysBetween(lastIncreaseDate, effectiveDate)
      frequencyStatus = daysSinceLast >= MIN_DAYS_BETWEEN_INCREASES ? "pass" : "fail"
    }
  }

  // ---- Fixed term ----
  const fixedTermBlocked = tenancy === "fixed-term"

  let overall: CheckStatus = "unknown"
  if (fixedTermBlocked) {
    overall = "fail"
  } else if (noticeStatus === "fail" || frequencyStatus === "fail") {
    overall = "fail"
  } else if (noticeStatus === "pass") {
    // Neither check failed (handled above), and the notice check passed. An
    // unanswered frequency check leaves this a "looks legal on what you gave us".
    overall = "pass"
  }

  return {
    currentRent,
    newRent,
    monthlyIncrease,
    percentIncrease,
    annualIncrease: monthlyIncrease * 12,
    noticeStatus,
    earliestDate,
    noticeDate,
    effectiveDate,
    frequencyStatus,
    daysSinceLast,
    earliestByFrequency,
    fixedTermBlocked,
    overall,
  }
}

// ---------------------------------------------------------------------------
// FAQ — one source for both the visible accordion and the FAQPage schema.
//
// Google requires FAQ structured data to match content visible on the page, so
// these must never be maintained separately.
// ---------------------------------------------------------------------------

export interface FaqItem {
  q: string
  a: string
}

export const RENT_INCREASE_FAQ: FaqItem[] = [
  {
    q: "Is there a limit on how much rent can go up in Alberta?",
    a: "No. Alberta ended rent control in 1995 and has not brought it back, so there is no maximum percentage or dollar cap on a rent increase. A landlord can raise rent by any amount as long as they give the right amount of written notice and have not raised the rent in the past 365 days. The protections in Alberta are about timing and paperwork, not price.",
  },
  {
    q: "How much notice does my landlord have to give?",
    a: "It depends on your tenancy. A month-to-month tenancy needs 3 full tenancy months of written notice. A week-to-week tenancy needs 12 tenancy weeks, which is 84 days. Any other periodic tenancy needs 90 days. A mobile home site tenancy needs 180 days. During a fixed-term lease, the rent cannot be increased at all until the term ends.",
  },
  {
    q: "How do I count 3 full tenancy months?",
    a: "Three whole calendar months have to pass between the month you got the notice and the month the increase starts, so the earliest effective date is the first day of the fourth month after the notice. To raise rent on November 1, notice has to be served by July 31, because August, September and October each need to pass in full. Notice given on April 1 and notice given on April 30 both give the same earliest date of August 1.",
  },
  {
    q: "Can my landlord raise rent more than once a year?",
    a: "No. At least 365 days must pass between rent increases, measured from the last increase or from the day you moved in if the rent has never gone up. This applies no matter what your lease says. A second increase inside that window is not enforceable.",
  },
  {
    q: "Can my rent go up in the middle of a fixed-term lease?",
    a: "No. If you signed a lease with a set end date, the rent is locked for the whole term, even if more than 365 days pass during it. Your landlord has to wait until the term ends. They can propose a higher rent for a new agreement after that, and the usual notice rules apply to the new tenancy.",
  },
  {
    q: "What counts as written notice?",
    a: "A letter or email that states the new rent amount and the date the increase takes effect, signed and dated by the landlord or their agent. A verbal mention does not count, and neither does a rent increase that simply appears on an invoice without proper notice.",
  },
  {
    q: "My landlord gave notice but the increase starts mid-month. Is that valid?",
    a: "A rent increase has to take effect on the first day of a rental period. For a month-to-month tenancy that is normally the first of the month. An increase that starts partway through a rental period is not properly served and is worth challenging in writing.",
  },
  {
    q: "Can my landlord raise the rent when I renew my lease?",
    a: "Yes, but the same rules still apply. At least 365 days must have passed since the last increase, and the landlord must give the written notice their tenancy type requires. Signing a renewal does not waive those requirements.",
  },
  {
    q: "What can I do if the increase is not legal?",
    a: "An increase that fails the notice or timing rules is not enforceable, and you do not have to pay the higher amount. Start by writing to your landlord and naming the specific rule that was missed, keeping a copy. If that does not resolve it, you can apply to the Residential Tenancy Dispute Resolution Service (RTDRS) for a $75 filing fee, or take the matter to Provincial Court (Civil Division).",
  },
  {
    q: "Does Calgary or Edmonton have its own rent control?",
    a: "No. Neither city has local rent control, and municipalities in Alberta do not have the power to create it. The provincial rules on notice and timing are the same in Calgary, Edmonton and everywhere else in the province.",
  },
]
