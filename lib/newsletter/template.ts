import type { NewsletterArticle, NewsletterContent, NewsletterEvent } from './fetch-articles'

// ── City configuration ────────────────────────────────────────────────────────
export type NewsletterCity = 'edmonton' | 'calgary' | 'lethbridge'

interface CityConfig {
  newsletterName: string
  tagline: string
  cityLabel: string
  accentColor: string
  accentColorDark: string
  greeting: string
  emoji: string
}

const CITY_CONFIG: Record<NewsletterCity, CityConfig> = {
  edmonton: {
    newsletterName: 'The Capital',
    tagline: "Edmonton's Daily Brief",
    cityLabel: 'Edmonton',
    accentColor: '#1a6fc4',
    accentColorDark: '#155fa0',
    greeting: 'Good morning, Edmonton',
    emoji: '🌆',
  },
  calgary: {
    newsletterName: 'The Chinook',
    tagline: "Calgary's Daily Brief",
    cityLabel: 'Calgary',
    accentColor: '#c0392b',
    accentColorDark: '#a93226',
    greeting: 'Good morning, Calgary',
    emoji: '🏔️',
  },
  lethbridge: {
    newsletterName: 'The Westerly',
    tagline: "Lethbridge's Daily Brief",
    cityLabel: 'Lethbridge',
    accentColor: '#c8860a',
    accentColorDark: '#a66f08',
    greeting: 'Good morning, Lethbridge',
    emoji: '🌾',
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-CA', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/Edmonton',
    })
  } catch {
    return new Date().toLocaleDateString('en-CA', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/Edmonton',
    })
  }
}

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-CA', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/Edmonton',
    })
  } catch {
    return ''
  }
}

function getReadTime(excerpt: string): string {
  const words = excerpt.split(' ').length
  const mins = Math.max(1, Math.round(words / 200))
  return `${mins} min read`
}

// ── Section builders ─────────────────────────────────────────────────────────
function heroSection(article: NewsletterArticle, accentColor: string): string {
  const imageBlock = article.imageUrl
    ? `<tr>
        <td style="padding:0;">
          <a href="${escapeHtml(article.url)}" style="display:block;">
            <img src="${escapeHtml(article.imageUrl)}"
              alt="${escapeHtml(article.title)}"
              width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
          </a>
        </td>
      </tr>`
    : `<tr>
        <td style="background-color:${accentColor};padding:32px 32px 24px 32px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-bottom:8px;">Top Story</div>
        </td>
      </tr>`

  return `
  <!-- HERO STORY -->
  <tr><td style="padding:0 0 8px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${imageBlock}
      <tr>
        <td style="padding:24px 32px 4px 32px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:${accentColor};text-transform:uppercase;margin-bottom:10px;">Today's Top Story</div>
          <h2 style="margin:0 0 12px 0;font-size:24px;font-weight:800;line-height:1.3;color:#0a0a0a;letter-spacing:-0.3px;">
            <a href="${escapeHtml(article.url)}" style="color:#0a0a0a;text-decoration:none;">${escapeHtml(article.title)}</a>
          </h2>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#444;">${escapeHtml(article.excerpt)}</p>
          <a href="${escapeHtml(article.url)}"
            style="display:inline-block;background-color:${accentColor};color:#ffffff;font-size:13px;font-weight:700;padding:10px 20px;border-radius:6px;text-decoration:none;letter-spacing:0.3px;">
            Read the full story &rarr;
          </a>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e8e8e8;"></div></td></tr>`
}

function cityStoriesSection(articles: NewsletterArticle[], cityLabel: string, accentColor: string): string {
  if (articles.length === 0) return ''
  const stories = articles.slice(0, 3).map((a, i) => `
    <tr>
      <td style="padding:${i === 0 ? '0' : '0'} 0 0 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${a.imageUrl ? `
            <td width="80" style="padding:16px 12px 16px 32px;vertical-align:top;">
              <a href="${escapeHtml(a.url)}" style="display:block;">
                <img src="${escapeHtml(a.imageUrl)}" alt="" width="80" height="60"
                  style="display:block;width:80px;height:60px;object-fit:cover;border-radius:4px;border:0;" />
              </a>
            </td>` : `<td width="32" style="padding:16px 0 16px 32px;"></td>`}
            <td style="padding:16px 32px 16px ${a.imageUrl ? '0' : '0'};vertical-align:top;">
              <h3 style="margin:0 0 5px 0;font-size:15px;font-weight:700;line-height:1.35;color:#0a0a0a;">
                <a href="${escapeHtml(a.url)}" style="color:#0a0a0a;text-decoration:none;">${escapeHtml(a.title)}</a>
              </h3>
              <p style="margin:0 0 6px 0;font-size:13px;line-height:1.5;color:#666;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(a.excerpt)}</p>
              <a href="${escapeHtml(a.url)}" style="font-size:12px;font-weight:600;color:${accentColor};text-decoration:none;">Read more &rarr;</a>
            </td>
          </tr>
        </table>
        ${i < articles.slice(0, 3).length - 1 ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:0 32px;"><div style="border-top:1px solid #f0f0f0;"></div></td></tr></table>` : ''}
      </td>
    </tr>`).join('')

  return `
  <!-- MORE FROM CITY -->
  <tr><td style="padding:24px 32px 8px 32px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:${accentColor};text-transform:uppercase;">More from ${cityLabel}</div>
  </td></tr>
  ${stories}
  <tr><td style="padding:8px 32px 0 32px;"><div style="border-top:1px solid #e8e8e8;"></div></td></tr>`
}

function albertaBriefSection(articles: NewsletterArticle[]): string {
  if (articles.length === 0) return ''
  const items = articles.slice(0, 2).map(a => `
    <tr>
      <td style="padding:10px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="6" style="padding-right:12px;vertical-align:top;">
            <div style="width:6px;height:6px;border-radius:50%;background-color:#666;margin-top:7px;"></div>
          </td>
          <td>
            <a href="${escapeHtml(a.url)}" style="font-size:14px;font-weight:600;color:#1a1a1a;text-decoration:none;line-height:1.4;">${escapeHtml(a.title)}</a>
            <p style="margin:3px 0 0 0;font-size:12px;color:#777;line-height:1.4;">${escapeHtml(a.excerpt.substring(0, 100))}${a.excerpt.length > 100 ? '...' : ''}</p>
          </td>
        </tr></table>
      </td>
    </tr>`).join('')

  return `
  <!-- ALBERTA BRIEF -->
  <tr><td style="padding:24px 0 0 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background-color:#f7f7f7;padding:16px 32px 4px 32px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#555;text-transform:uppercase;">Across Alberta</div>
      </td></tr>
      ${items}
      <tr><td style="background-color:#f7f7f7;padding:8px 0 4px 0;"></td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e8e8e8;"></div></td></tr>`
}

function eventsSection(events: NewsletterEvent[], cityLabel: string, accentColor: string): string {
  if (events.length === 0) return ''
  const items = events.map(e => `
    <tr>
      <td style="padding:8px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="70" style="vertical-align:top;padding-right:14px;">
            <div style="background-color:${accentColor};border-radius:6px;text-align:center;padding:6px 4px;">
              <div style="font-size:10px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px;">${formatEventDate(e.eventDate).split(' ')[0]}</div>
              <div style="font-size:20px;font-weight:800;color:#fff;line-height:1;">${new Date(e.eventDate).getDate()}</div>
            </div>
          </td>
          <td style="vertical-align:top;">
            <a href="${escapeHtml(e.url)}" style="font-size:14px;font-weight:600;color:#0a0a0a;text-decoration:none;line-height:1.35;">${escapeHtml(e.title)}</a>
            <div style="font-size:12px;color:#888;margin-top:2px;">${escapeHtml(e.venue || e.location)}</div>
          </td>
        </tr></table>
      </td>
    </tr>`).join('')

  return `
  <!-- EVENTS -->
  <tr><td style="padding:20px 32px 8px 32px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:${accentColor};text-transform:uppercase;">What's On in ${cityLabel}</div>
  </td></tr>
  ${items}
  <tr><td style="padding:16px 32px 0 32px;"><div style="border-top:1px solid #e8e8e8;"></div></td></tr>`
}

function footerSection(city: NewsletterCity, unsubscribeUrl: string): string {
  return `
  <!-- FOOTER -->
  <tr><td style="background-color:#f9f9f9;padding:24px 32px;border-top:1px solid #e8e8e8;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="text-align:center;">
          <a href="https://www.culturealberta.com" style="text-decoration:none;">
            <span style="font-size:14px;font-weight:800;color:#0a0a0a;letter-spacing:-0.3px;">Culture Alberta</span>
          </a>
          <p style="margin:6px 0 0 0;font-size:12px;color:#999;line-height:1.6;">
            You're receiving this because you subscribed at
            <a href="https://www.culturealberta.com" style="color:#999;">culturealberta.com</a>
          </p>
          <p style="margin:10px 0 0 0;font-size:12px;">
            <a href="${escapeHtml(unsubscribeUrl)}" style="color:#999;text-decoration:underline;">Unsubscribe</a>
            &nbsp;&middot;&nbsp;
            <a href="https://www.culturealberta.com/${city}" style="color:#999;text-decoration:underline;">View online</a>
            &nbsp;&middot;&nbsp;
            <a href="https://www.culturealberta.com" style="color:#999;text-decoration:underline;">culturealberta.com</a>
          </p>
          <p style="margin:10px 0 0 0;font-size:11px;color:#bbb;">
            &copy; ${new Date().getFullYear()} Culture Media &middot; Sent by Culture Alberta
          </p>
        </td>
      </tr>
    </table>
  </td></tr>`
}

// ── Main generator ────────────────────────────────────────────────────────────
export function generateNewsletterHtml(
  city: NewsletterCity,
  content: NewsletterContent,
  unsubscribeUrl: string
): string {
  const cfg = CITY_CONFIG[city]
  const today = formatDate(new Date().toISOString())
  const [hero, ...rest] = content.cityArticles

  const subject = `${cfg.newsletterName} · ${cfg.cityLabel} — ${today}`

  const body = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${escapeHtml(subject)}</title>
    <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  </head>
  <body style="margin:0;padding:0;background-color:#f0f0f0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f0f0f0;">
      ${escapeHtml(cfg.cityLabel)}'s top stories today — ${hero ? escapeHtml(hero.title.substring(0, 80)) : 'See what\'s happening in your city'}
      &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
      style="background-color:#f0f0f0;min-width:100%;">
      <tr><td align="center" style="padding:20px 10px;">

        <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation"
          style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- TOP ACCENT BAR -->
          <tr><td style="background-color:${cfg.accentColor};height:5px;font-size:1px;line-height:1px;">&nbsp;</td></tr>

          <!-- MASTHEAD -->
          <tr><td style="padding:24px 32px 20px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;">
                  <div style="font-size:26px;font-weight:900;letter-spacing:-0.5px;color:#0a0a0a;line-height:1.1;">${escapeHtml(cfg.newsletterName)}</div>
                  <div style="font-size:12px;color:#888;margin-top:3px;letter-spacing:0.3px;">
                    ${escapeHtml(cfg.cityLabel)} &middot; ${today}
                  </div>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <a href="https://www.culturealberta.com" style="text-decoration:none;font-size:11px;font-weight:700;color:#888;letter-spacing:1px;text-transform:uppercase;">
                    Culture Alberta
                  </a>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- DIVIDER -->
          <tr><td style="padding:0 32px;"><div style="border-top:2px solid #0a0a0a;"></div></td></tr>

          <!-- GREETING -->
          <tr><td style="padding:18px 32px 20px 32px;">
            <p style="margin:0;font-size:15px;line-height:1.65;color:#333;">
              ${escapeHtml(cfg.greeting)} ${cfg.emoji}<br />
              Here's your city briefing — the stories worth knowing about today, in 5 minutes or less.
            </p>
          </td></tr>

          <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e8e8e8;"></div></td></tr>

          ${hero ? heroSection(hero, cfg.accentColor) : ''}
          ${rest.length > 0 ? cityStoriesSection(rest, cfg.cityLabel, cfg.accentColor) : ''}
          ${albertaBriefSection(content.albertaArticles)}
          ${eventsSection(content.events, cfg.cityLabel, cfg.accentColor)}
          ${footerSection(city, unsubscribeUrl)}

        </table>

      </td></tr>
    </table>
  </body>
  </html>`

  return body
}

export function getSubjectLine(city: NewsletterCity): string {
  const cfg = CITY_CONFIG[city]
  const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Edmonton',
  })
  return `${cfg.newsletterName} · ${cfg.cityLabel} — ${today}`
}

export function getPreviewText(city: NewsletterCity): string {
  const cfg = CITY_CONFIG[city]
  return `${cfg.cityLabel}'s top stories today from Culture Alberta`
}
