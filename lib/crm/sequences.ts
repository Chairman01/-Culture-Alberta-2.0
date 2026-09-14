/**
 * Follow-up cadences and their copy.
 *
 * Templates live here rather than in the database so a wording change ships
 * with a deploy, shows up in a diff, and can be reverted. The database holds
 * only which sequence a lead is on and how far through it they are.
 *
 * Every sequence is a list of steps with an offset in days from the *previous*
 * step. The generator never looks at wall-clock dates itself — it asks this
 * module what comes next and when.
 *
 * CASL: each rendered message gets the identification block and unsubscribe
 * line appended by renderStep(), not by the individual templates, so a new
 * template physically cannot ship without them.
 */

export type SequenceKey = 'smb_intro' | 'institution_intro' | 'inbound_rates' | 'renewal'

export type LeadFields = {
  company: string
  contactName?: string | null
  city?: string | null
  category?: string | null
}

type Step = {
  /** Days to wait after the previous step before this one is due. */
  afterDays: number
  subject: (lead: LeadFields) => string
  body: (lead: LeadFields) => string
  /** Shown in the admin queue so you know why this email exists. */
  intent: string
}

type Sequence = {
  key: SequenceKey
  label: string
  description: string
  steps: Step[]
}

const MEDIA_KIT_URL = process.env.CRM_MEDIA_KIT_URL || 'https://www.culturealberta.com/partner'
const SENDER_NAME = process.env.CRM_SENDER_NAME || 'Adam Harrison'
const SENDER_TITLE = process.env.CRM_SENDER_TITLE || 'Culture Media'
const SENDER_EMAIL = process.env.CRM_SENDER_EMAIL || 'adamharrison@culturemedia.ca'
/**
 * CASL s.6(2) requires a mailing address in every commercial electronic
 * message. Without it configured the footer says so loudly rather than
 * quietly shipping non-compliant mail.
 */
const MAILING_ADDRESS = process.env.CRM_MAILING_ADDRESS || '[SET CRM_MAILING_ADDRESS IN VERCEL]'

/** First name only, and only when we actually have one worth using. */
function firstName(lead: LeadFields): string {
  const name = (lead.contactName || '').trim()
  if (!name) return 'there'
  const first = name.split(/\s+/)[0]
  return first.length > 1 ? first : 'there'
}

function cityLine(lead: LeadFields): string {
  const city = (lead.city || '').trim()
  return city ? `${city}` : 'Alberta'
}

const SEQUENCES: Record<SequenceKey, Sequence> = {
  /**
   * Local businesses — the ones we already sell single features to.
   * Short, concrete, and it leads with the work rather than the audience.
   */
  smb_intro: {
    key: 'smb_intro',
    label: 'Local business intro',
    description: 'Cold outreach to an Alberta business that could buy a sponsored feature.',
    steps: [
      {
        afterDays: 0,
        intent: 'Open. One specific reason we noticed them.',
        subject: lead => `${lead.company} on Culture Alberta`,
        body: lead =>
          `Hi ${firstName(lead)},\n\n` +
          `I run Culture Alberta — we cover food, culture and city life in Calgary and Edmonton, and about 175,000 people read us a month.\n\n` +
          `We write full features on ${cityLine(lead)} businesses: our own reporter, our own words, published permanently and pushed out through the newsletter and socials. It reads like the rest of the site, which is why people actually finish them.\n\n` +
          `Would ${lead.company} be interested? Happy to send the rate card and a couple of examples.\n\n` +
          `${SENDER_NAME}`,
      },
      {
        afterDays: 3,
        intent: 'Bump with proof. Nothing new asked for.',
        subject: lead => `Re: ${lead.company} on Culture Alberta`,
        body: lead =>
          `Hi ${firstName(lead)},\n\n` +
          `Following up on the note below — here is one we did recently so you can see the format:\n\n` +
          `https://www.culturealberta.com/articles/tutti-frutti-breakfast-lunch-is-the-diner-thats-taking-over-edmonton-alberta\n\n` +
          `Rates and reach are here: ${MEDIA_KIT_URL}\n\n` +
          `${SENDER_NAME}`,
      },
      {
        afterDays: 5,
        intent: 'Give something away. No ask at all.',
        subject: lead => `An idea for ${lead.company}`,
        body: lead =>
          `Hi ${firstName(lead)},\n\n` +
          `No pitch this time. We are putting together our ${cityLine(lead)} coverage for the next few weeks and ${lead.company} came up.\n\n` +
          `If you have anything going on — a new location, a menu change, an anniversary, a hire — send it over and I will see whether it fits our editorial calendar. No charge either way.\n\n` +
          `${SENDER_NAME}`,
      },
      {
        afterDays: 8,
        intent: 'Close the loop. Makes it easy to say no.',
        subject: lead => `Closing the loop — ${lead.company}`,
        body: lead =>
          `Hi ${firstName(lead)},\n\n` +
          `I have not heard back, so I will assume the timing is not right and stop emailing.\n\n` +
          `If that changes, we are here — just reply to this and I will pick it up.\n\n` +
          `${SENDER_NAME}`,
      },
    ],
  },

  /**
   * Institutions — post-secondaries, credit unions, tourism boards,
   * municipalities. These have real budgets and a procurement rhythm, so the
   * cadence is slower and the pitch leads with the vertical, not the feature.
   */
  institution_intro: {
    key: 'institution_intro',
    label: 'Institutional / retainer intro',
    description: 'Outreach to an organisation that could sponsor a vertical on a term.',
    steps: [
      {
        afterDays: 0,
        intent: 'Open on the vertical, not on the ad unit.',
        subject: lead => `Sponsorship of our Alberta jobs and benefits coverage`,
        body: lead =>
          `Hi ${firstName(lead)},\n\n` +
          `I publish Culture Alberta — an independent Alberta newsroom, roughly 175,000 sessions a month and over nine in ten of those readers in Canada.\n\n` +
          `Two of our sections would sit naturally with ${lead.company}: our jobs board, which carries several thousand live Alberta listings, and our benefits and money tools, which is where readers arrive with the most intent.\n\n` +
          `Each section carries a single named sponsor, with presented-by billing across the section, the newsletter and social. It is a term commitment rather than a one-off placement.\n\n` +
          `Is this something worth a short call? I can send the numbers first if that is more useful.\n\n` +
          `${SENDER_NAME}\n${SENDER_TITLE}`,
      },
      {
        afterDays: 5,
        intent: 'Send the numbers unprompted. Institutions want the deck.',
        subject: lead => `Re: Sponsorship of our Alberta jobs and benefits coverage`,
        body: lead =>
          `Hi ${firstName(lead)},\n\n` +
          `Sending the media kit along in case it is easier to circulate than a call: ${MEDIA_KIT_URL}\n\n` +
          `It has the audience breakdown, the section sponsorships and what each includes. Happy to put together a proposal specific to ${lead.company} if the fit looks right.\n\n` +
          `${SENDER_NAME}`,
      },
      {
        afterDays: 9,
        intent: 'Name the exclusivity. This is the actual differentiator.',
        subject: lead => `One sponsor per category`,
        body: lead =>
          `Hi ${firstName(lead)},\n\n` +
          `One thing worth flagging since it is time-sensitive: we only take one sponsor per category, so a section sponsorship locks out direct competitors for the term.\n\n` +
          `Nothing is committed on our side yet. If ${lead.company} wants first look, let me know and I will hold it while you decide.\n\n` +
          `${SENDER_NAME}`,
      },
      {
        afterDays: 14,
        intent: 'Park it politely and set up the quarterly nurture.',
        subject: lead => `Parking this for now`,
        body: lead =>
          `Hi ${firstName(lead)},\n\n` +
          `I will stop chasing this one. If budgets open up later in the year, or you would just like the numbers on file for planning, reply and I will send them over.\n\n` +
          `${SENDER_NAME}`,
      },
    ],
  },

  /**
   * They asked us. Speed is the entire advantage here — an inbound rate
   * request answered inside a day converts far better than one answered in a
   * week, which is most of why this system exists.
   */
  inbound_rates: {
    key: 'inbound_rates',
    label: 'Inbound rate request',
    description: 'Someone asked what we charge. Answer fast, then follow up twice.',
    steps: [
      {
        afterDays: 0,
        intent: 'Answer the question. Do not make them ask twice.',
        subject: lead => `Re: rates — Culture Alberta`,
        body: lead =>
          `Hi ${firstName(lead)},\n\n` +
          `Thanks for getting in touch. Everything is here — audience, placements and rates: ${MEDIA_KIT_URL}\n\n` +
          `The short version: a sponsored feature is written by our team and hosted permanently, and most partners pair it with a newsletter placement. Section sponsorships run on a term.\n\n` +
          `Tell me who you are trying to reach and I will come back with a plan and a number.\n\n` +
          `${SENDER_NAME}`,
      },
      {
        afterDays: 4,
        intent: 'Check they got it and offer to do the thinking.',
        subject: lead => `Re: rates — Culture Alberta`,
        body: lead =>
          `Hi ${firstName(lead)},\n\n` +
          `Did the rate card come through? If it is easier, tell me the budget you are working with and I will tell you honestly what it buys and whether it is worth doing.\n\n` +
          `${SENDER_NAME}`,
      },
      {
        afterDays: 7,
        intent: 'Last touch on a warm lead. Keep the door open.',
        subject: lead => `Still interested?`,
        body: lead =>
          `Hi ${firstName(lead)},\n\n` +
          `Last note from me on this. If the timing is off, no problem — reply whenever it comes back around and we will pick it up.\n\n` +
          `${SENDER_NAME}`,
      },
    ],
  },

  /**
   * Renewal. Fires before a term ends rather than after, because a partner who
   * has already lapsed is a new sale again.
   */
  renewal: {
    key: 'renewal',
    label: 'Renewal',
    description: 'Runs ahead of a term ending on a won deal.',
    steps: [
      {
        afterDays: 0,
        intent: 'Open the renewal early, with results in hand.',
        subject: lead => `${lead.company} — renewing for the next term`,
        body: lead =>
          `Hi ${firstName(lead)},\n\n` +
          `Our term together wraps up soon and I wanted to get ahead of it rather than let it lapse.\n\n` +
          `I will pull the numbers on what we ran and send them over. If you want to continue, we can keep the same terms — and if you want to change the mix, now is the easy time to do it.\n\n` +
          `${SENDER_NAME}`,
      },
      {
        afterDays: 7,
        intent: 'Bump before the term actually ends.',
        subject: lead => `Re: ${lead.company} — renewing for the next term`,
        body: lead =>
          `Hi ${firstName(lead)},\n\n` +
          `Following up on renewal — do you want me to keep your slot held for the next term?\n\n` +
          `${SENDER_NAME}`,
      },
    ],
  },
}

/**
 * CASL s.6: sender identity, a reachable address, a physical mailing address
 * and a working unsubscribe in every commercial message. Appended to every
 * rendered body so no template can omit it.
 */
function caslFooter(leadId: string): string {
  const optOut = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.culturealberta.com'}/api/leads/opt-out?id=${leadId}`
  return (
    `\n\n--\n` +
    `${SENDER_NAME} · ${SENDER_TITLE}\n` +
    `${SENDER_EMAIL}\n` +
    `${MAILING_ADDRESS}\n\n` +
    `Prefer not to hear from us? Unsubscribe: ${optOut}`
  )
}

export function getSequence(key: string): Sequence | null {
  return SEQUENCES[key as SequenceKey] ?? null
}

export function listSequences(): Sequence[] {
  return Object.values(SEQUENCES)
}

/**
 * Renders one step. Returns null when the sequence is finished, which is the
 * signal to the generator to stop rather than an error.
 */
export function renderStep(
  key: string,
  step: number,
  lead: LeadFields & { id: string },
): { subject: string; body: string; intent: string } | null {
  const sequence = getSequence(key)
  if (!sequence) return null
  const template = sequence.steps[step]
  if (!template) return null

  return {
    subject: template.subject(lead),
    body: template.body(lead) + caslFooter(lead.id),
    intent: template.intent,
  }
}

/** How many days after the previous step this one becomes due. */
export function stepDelay(key: string, step: number): number | null {
  const sequence = getSequence(key)
  if (!sequence) return null
  return sequence.steps[step]?.afterDays ?? null
}

export function isLastStep(key: string, step: number): boolean {
  const sequence = getSequence(key)
  if (!sequence) return true
  return step >= sequence.steps.length - 1
}

/** True when the mailing address has not been configured — surfaced in the UI. */
export function mailingAddressMissing(): boolean {
  return !process.env.CRM_MAILING_ADDRESS
}
