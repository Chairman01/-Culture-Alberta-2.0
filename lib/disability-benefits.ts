/**
 * AISH and ADAP program constants and benefit math — single source of truth.
 *
 * Every calculator, FAQ answer, and rate card on the site should read from this
 * file. The numbers used to be copy-pasted across six files and drifted apart,
 * which is how the calculators ended up serving pre-August child benefit rates.
 *
 * Sources (verified 2026-07-30):
 *  - AISH Financial Benefits Summary, Rev. 2026-01
 *    https://manuals.alberta.ca/media/ioklsmqk/aish-financial-benefits-summary.pdf
 *  - Alberta Disability Assistance Program (ADAP)
 *    https://www.alberta.ca/alberta-disability-assistance-program
 *
 * Changes that took effect with the AUGUST 2026 benefit period:
 *  - Child benefit was recalibrated from "$232 first child / $117 each
 *    additional" to a per-child tier: $300 / $117 / $88 / $59 / $30. The
 *    recalibration reflects other child-related supports (notably the federal
 *    Canada Child Benefit) and applies to BOTH AISH and ADAP.
 *  - Couples where both adults receive disability income assistance (AISH or
 *    ADAP) each receive 88% of the maximum individual living allowance.
 */

// ---------------------------------------------------------------------------
// Living allowances
// ---------------------------------------------------------------------------

/** AISH monthly living allowance (Code 1601). */
export const AISH_LIVING_ALLOWANCE = 1940

/** ADAP monthly living allowance. ADAP launched July 1, 2026. */
export const ADAP_LIVING_ALLOWANCE = 1740

/**
 * August 2026 couples rule: where both adults in a household receive AISH or
 * ADAP, each partner receives 88% of the maximum individual living allowance.
 *
 * Alberta describes the 88% as applying to "the maximum individual benefit" —
 * we apply it to the living allowance only, not to the child benefit, which is
 * a per-child household supplement rather than an individual benefit.
 */
export const COUPLE_BOTH_ON_DISABILITY_RATE = 0.88

// ---------------------------------------------------------------------------
// Child benefit — August 2026 recalibrated tiers (AISH and ADAP)
// ---------------------------------------------------------------------------

/** Monthly child benefit by child number. The last value repeats for 5+. */
export const CHILD_BENEFIT_TIERS = [300, 117, 88, 59, 30] as const

/** Monthly child benefit for each additional child beyond the fourth. */
export const CHILD_BENEFIT_ADDITIONAL = CHILD_BENEFIT_TIERS[CHILD_BENEFIT_TIERS.length - 1]

/**
 * Total monthly child benefit for `children` dependent children.
 *
 *   1 child  → $300      3 children → $505
 *   2 children → $417    4 children → $564   (then +$30 each)
 */
export function getChildBenefit(children: number): number {
  const n = Math.max(0, Math.floor(children))
  let total = 0
  for (let i = 0; i < n; i++) {
    total += CHILD_BENEFIT_TIERS[Math.min(i, CHILD_BENEFIT_TIERS.length - 1)]
  }
  return total
}

/** The marginal amount the nth child adds (1-indexed), for UI copy. */
export function getChildBenefitTier(childNumber: number): number {
  const i = Math.max(1, Math.floor(childNumber)) - 1
  return CHILD_BENEFIT_TIERS[Math.min(i, CHILD_BENEFIT_TIERS.length - 1)]
}

// ---------------------------------------------------------------------------
// AISH employment income exemption
//
// Single: up to $1,072 fully exempt, up to $2,009 is 50% exempt, to a maximum
//         exemption of $1,541/month.
// Family: up to $2,612 fully exempt, up to $3,349 is 50% exempt, to a maximum
//         exemption of $2,981/month.
//
// Income above the maximum exemption is deducted dollar-for-dollar.
// ---------------------------------------------------------------------------

export type ExemptionType = "single" | "family"

export const AISH_EMPLOYMENT_EXEMPTION = {
  single: { full: 1072, partialLimit: 2009, max: 1541 },
  family: { full: 2612, partialLimit: 3349, max: 2981 },
} as const

/** Portion of monthly employment income that AISH exempts. */
export function getAishExemption(monthlyIncome: number, type: ExemptionType): number {
  const { full, partialLimit, max } = AISH_EMPLOYMENT_EXEMPTION[type]
  const income = Math.max(0, monthlyIncome)
  if (income <= full) return income
  if (income <= partialLimit) return full + (income - full) * 0.5
  return max
}

// ---------------------------------------------------------------------------
// ADAP employment income exemption
//
// Alberta publishes three fully-exempt thresholds by household type:
//   single clients                          $700/month
//   clients with dependent children       $1,100/month
//   cohabiting partners (both AISH/ADAP)  $1,500/month
// ---------------------------------------------------------------------------

export const ADAP_EXEMPTION_SINGLE = 700
export const ADAP_EXEMPTION_WITH_CHILDREN = 1100
export const ADAP_EXEMPTION_COHABITING = 1500

/**
 * ADAP's fully exempt monthly employment income. Where more than one threshold
 * could apply (children *and* a cohabiting partner on disability assistance),
 * the higher exemption is used.
 */
export function getAdapExemption(opts: {
  children: number
  partnerOnDisabilityAssistance: boolean
}): number {
  const candidates = [ADAP_EXEMPTION_SINGLE]
  if (opts.children > 0) candidates.push(ADAP_EXEMPTION_WITH_CHILDREN)
  if (opts.partnerOnDisabilityAssistance) candidates.push(ADAP_EXEMPTION_COHABITING)
  return Math.max(...candidates)
}

// ---------------------------------------------------------------------------
// ADAP income reduction
//
// IMPORTANT: the exact reduction schedule is set by Ministerial order and has
// not been published. Alberta has published only two anchors:
//
//   1. Above the exemption the reduction starts "with less than a cent per
//      dollar and increas[es] significantly approaching $45,000 employment
//      income per year".
//   2. ADAP clients "are able to earn up to $45,240 annually in employment
//      income while continuing to receive financial benefits".
//
// We model the taper as an accelerating curve between those two anchors: zero
// reduction at the exemption, rising to a full offset at $45,240/year. This is
// an approximation, and the UI must say so. It is materially closer to the
// published description than a flat 50% clawback, which would remove roughly
// $150/month from someone earning $1,000/month even though Alberta says the
// reduction there is a fraction of a cent per dollar.
// ---------------------------------------------------------------------------

/** Annual employment income at which ADAP financial benefits are exhausted. */
export const ADAP_BENEFIT_END_ANNUAL_INCOME = 45240

/** Monthly equivalent of {@link ADAP_BENEFIT_END_ANNUAL_INCOME}. */
export const ADAP_BENEFIT_END_MONTHLY_INCOME = ADAP_BENEFIT_END_ANNUAL_INCOME / 12

/**
 * Curvature of the modelled taper. >1 makes the reduction start near zero and
 * accelerate, matching Alberta's "less than a cent per dollar" description.
 * Chosen so the marginal reduction never exceeds $1 of benefit per $1 earned.
 */
export const ADAP_TAPER_EXPONENT = 1.5

/** Modelled monthly ADAP reduction for a given household employment income. */
export function getAdapReduction(
  monthlyIncome: number,
  exemption: number,
  grossBenefit: number
): number {
  const income = Math.max(0, monthlyIncome)
  if (income <= exemption) return 0
  const span = ADAP_BENEFIT_END_MONTHLY_INCOME - exemption
  if (span <= 0) return grossBenefit
  const t = Math.min(1, (income - exemption) / span)
  return Math.min(grossBenefit, grossBenefit * Math.pow(t, ADAP_TAPER_EXPONENT))
}

// ---------------------------------------------------------------------------
// Full benefit calculations
// ---------------------------------------------------------------------------

export interface BenefitResult {
  /** Living allowance after the 88% couples rule, before child benefit. */
  livingAllowance: number
  /** Whether the 88% couples rule reduced the living allowance. */
  coupleRateApplied: boolean
  childBenefit: number
  /** Living allowance + child benefit, before any income reduction. */
  grossBenefit: number
  householdIncome: number
  /** Employment income the program disregards. */
  exemption: number
  /** Amount deducted from the gross benefit. */
  reduction: number
  /** What the recipient actually receives. */
  netBenefit: number
  annualBenefit: number
  fullyReduced: boolean
}

export function calculateAish(opts: {
  children: number
  monthlyIncome: number
  partnerMonthlyIncome: number
  exemptionType: ExemptionType
  /** Both adults receive AISH or ADAP → 88% living allowance each. */
  partnerOnDisabilityAssistance: boolean
}): BenefitResult {
  const householdIncome = Math.max(0, opts.monthlyIncome) + Math.max(0, opts.partnerMonthlyIncome)

  const coupleRateApplied = opts.partnerOnDisabilityAssistance
  const livingAllowance = coupleRateApplied
    ? AISH_LIVING_ALLOWANCE * COUPLE_BOTH_ON_DISABILITY_RATE
    : AISH_LIVING_ALLOWANCE

  const childBenefit = getChildBenefit(opts.children)
  const grossBenefit = livingAllowance + childBenefit

  const exemption = getAishExemption(householdIncome, opts.exemptionType)
  const reduction = Math.min(grossBenefit, Math.max(0, householdIncome - exemption))
  const netBenefit = Math.max(0, grossBenefit - reduction)

  return {
    livingAllowance,
    coupleRateApplied,
    childBenefit,
    grossBenefit,
    householdIncome,
    exemption,
    reduction,
    netBenefit,
    annualBenefit: netBenefit * 12,
    fullyReduced: netBenefit === 0 && grossBenefit > 0,
  }
}

export function calculateAdap(opts: {
  children: number
  monthlyIncome: number
  partnerMonthlyIncome: number
  partnerOnDisabilityAssistance: boolean
}): BenefitResult {
  const householdIncome = Math.max(0, opts.monthlyIncome) + Math.max(0, opts.partnerMonthlyIncome)

  const coupleRateApplied = opts.partnerOnDisabilityAssistance
  const livingAllowance = coupleRateApplied
    ? ADAP_LIVING_ALLOWANCE * COUPLE_BOTH_ON_DISABILITY_RATE
    : ADAP_LIVING_ALLOWANCE

  const childBenefit = getChildBenefit(opts.children)
  const grossBenefit = livingAllowance + childBenefit

  const exemption = getAdapExemption({
    children: opts.children,
    partnerOnDisabilityAssistance: opts.partnerOnDisabilityAssistance,
  })
  const reduction = getAdapReduction(householdIncome, exemption, grossBenefit)
  const netBenefit = Math.max(0, grossBenefit - reduction)

  return {
    livingAllowance,
    coupleRateApplied,
    childBenefit,
    grossBenefit,
    householdIncome,
    exemption,
    reduction,
    netBenefit,
    annualBenefit: netBenefit * 12,
    fullyReduced: netBenefit === 0 && grossBenefit > 0,
  }
}
