import type { NewsletterArticle, NewsletterContent, NewsletterEvent } from './fetch-articles'

// ── City configuration ────────────────────────────────────────────────────────
export type NewsletterCity = 'edmonton' | 'calgary' | 'lethbridge' | 'medicine-hat'

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
  'medicine-hat': {
    newsletterName: 'The Hat',
    tagline: "Medicine Hat's Daily Brief",
    cityLabel: 'Medicine Hat',
    accentColor: '#b45309',
    accentColorDark: '#92400e',
    greeting: 'Good morning, Medicine Hat',
    emoji: '🎩',
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

// ── Section builders ─────────────────────────────────────────────────────────

function heroSection(article: NewsletterArticle, accentColor: string, accentColorDark: string): string {
  const imageBlock = article.imageUrl
    ? `<tr>
        <td style="padding:0;">
          <a href="${escapeHtml(article.url)}" style="display:block;line-height:0;">
            <img src="${escapeHtml(article.imageUrl)}"
              alt="${escapeHtml(article.title)}"
              width="600"
              style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
          </a>
          ${article.imageSource ? `<div style="padding:4px 10px;background-color:#f5f5f5;text-align:right;"><span style="font-size:10px;color:#999;letter-spacing:0.2px;">📷 ${escapeHtml(article.imageSource)}</span></div>` : ''}
        </td>
      </tr>`
    : ''

  return `
  <!-- HERO STORY -->
  <tr><td style="padding:0 0 8px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${imageBlock}
      <tr>
        <td style="padding:28px 32px 8px 32px;">
          <div style="display:inline-block;background-color:${accentColor};border-radius:4px;padding:4px 10px;margin-bottom:14px;">
            <span style="font-size:10px;font-weight:800;letter-spacing:2px;color:#ffffff;text-transform:uppercase;">Today's Top Story</span>
          </div>
          <h2 style="margin:0 0 14px 0;font-size:26px;font-weight:900;line-height:1.25;color:#0a0a0a;letter-spacing:-0.5px;">
            <a href="${escapeHtml(article.url)}" style="color:#0a0a0a;text-decoration:none;">${escapeHtml(article.title)}</a>
          </h2>
          <p style="margin:0 0 20px 0;font-size:16px;line-height:1.7;color:#3a3a3a;">${escapeHtml(article.excerpt)}</p>
          <a href="${escapeHtml(article.url)}"
            style="display:inline-block;background-color:${accentColor};color:#ffffff;font-size:14px;font-weight:700;padding:12px 24px;border-radius:6px;text-decoration:none;letter-spacing:0.2px;">
            Read the full story &rarr;
          </a>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:8px 32px 0 32px;"><div style="border-top:1px solid #e8e8e8;"></div></td></tr>`
}

function cityStoriesSection(articles: NewsletterArticle[], cityLabel: string, accentColor: string): string {
  if (articles.length === 0) return ''

  const stories = articles.map((a, i) => `
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${a.imageUrl ? `
            <td width="88" style="padding:18px 14px 18px 32px;vertical-align:top;">
              <a href="${escapeHtml(a.url)}" style="display:block;line-height:0;">
                <img src="${escapeHtml(a.imageUrl)}" alt="" width="88" height="66"
                  style="display:block;width:88px;height:66px;object-fit:cover;border-radius:6px;border:0;" />
              </a>
              ${a.imageSource ? `<div style="margin-top:3px;text-align:center;"><span style="font-size:9px;color:#bbb;">📷 ${escapeHtml(a.imageSource)}</span></div>` : ''}
            </td>` : `<td width="32" style="padding:18px 0 18px 32px;"></td>`}
            <td style="padding:18px 32px 18px ${a.imageUrl ? '0' : '0'};vertical-align:top;">
              <h3 style="margin:0 0 6px 0;font-size:15px;font-weight:700;line-height:1.35;color:#0a0a0a;">
                <a href="${escapeHtml(a.url)}" style="color:#0a0a0a;text-decoration:none;">${escapeHtml(a.title)}</a>
              </h3>
              <p style="margin:0 0 8px 0;font-size:13px;line-height:1.55;color:#555;">${escapeHtml(a.excerpt.substring(0, 120))}${a.excerpt.length > 120 ? '…' : ''}</p>
              <a href="${escapeHtml(a.url)}" style="font-size:12px;font-weight:700;color:${accentColor};text-decoration:none;letter-spacing:0.2px;">Read more →</a>
            </td>
          </tr>
        </table>
        ${i < articles.length - 1
          ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:0 32px;"><div style="border-top:1px solid #f2f2f2;"></div></td></tr></table>`
          : ''}
      </td>
    </tr>`).join('')

  return `
  <!-- MORE FROM CITY -->
  <tr><td style="padding:28px 32px 6px 32px;">
    <div style="font-size:10px;font-weight:800;letter-spacing:2.5px;color:${accentColor};text-transform:uppercase;">More from ${escapeHtml(cityLabel)}</div>
  </td></tr>
  ${stories}
  <tr><td style="padding:8px 32px 0 32px;"><div style="border-top:1px solid #e8e8e8;"></div></td></tr>`
}

function albertaBriefSection(articles: NewsletterArticle[]): string {
  if (articles.length === 0) return ''

  const items = articles.map(a => `
    <tr>
      <td style="padding:10px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="10" style="padding-right:12px;vertical-align:top;">
            <div style="width:8px;height:8px;border-radius:50%;background-color:#999;margin-top:6px;"></div>
          </td>
          <td>
            <a href="${escapeHtml(a.url)}"
              style="font-size:14px;font-weight:700;color:#1a1a1a;text-decoration:none;line-height:1.4;">${escapeHtml(a.title)}</a>
            <p style="margin:4px 0 0 0;font-size:12px;color:#777;line-height:1.5;">${escapeHtml(a.excerpt.substring(0, 110))}${a.excerpt.length > 110 ? '…' : ''}</p>
          </td>
        </tr></table>
      </td>
    </tr>`).join('')

  return `
  <!-- ALBERTA BRIEF -->
  <tr><td style="padding:24px 0 0 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background-color:#f5f5f5;padding:18px 32px 6px 32px;">
        <div style="font-size:10px;font-weight:800;letter-spacing:2.5px;color:#555;text-transform:uppercase;">Across Alberta</div>
      </td></tr>
      ${items}
      <tr><td style="background-color:#f5f5f5;padding:12px 0 4px 0;"></td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 32px;"><div style="border-top:1px solid #e8e8e8;"></div></td></tr>`
}

function eventsSection(events: NewsletterEvent[], cityLabel: string, accentColor: string): string {
  if (events.length === 0) return ''

  const items = events.map(e => {
    const dateParts = formatEventDate(e.eventDate).split(' ')
    const day = new Date(e.eventDate).getDate()
    return `
    <tr>
      <td style="padding:10px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="56" style="vertical-align:top;padding-right:16px;">
            <div style="background-color:${accentColor};border-radius:8px;text-align:center;padding:8px 4px;">
              <div style="font-size:9px;font-weight:800;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:1px;">${dateParts[0] ?? ''}</div>
              <div style="font-size:22px;font-weight:900;color:#fff;line-height:1.1;">${day}</div>
            </div>
          </td>
          <td style="vertical-align:top;">
            <a href="${escapeHtml(e.url)}"
              style="font-size:14px;font-weight:700;color:#0a0a0a;text-decoration:none;line-height:1.35;">${escapeHtml(e.title)}</a>
            <div style="font-size:12px;color:#888;margin-top:3px;">${escapeHtml(e.venue || e.location)}</div>
          </td>
        </tr></table>
      </td>
    </tr>`}).join('')

  return `
  <!-- EVENTS -->
  <tr><td style="padding:24px 32px 6px 32px;">
    <div style="font-size:10px;font-weight:800;letter-spacing:2.5px;color:${accentColor};text-transform:uppercase;">What's On in ${escapeHtml(cityLabel)}</div>
  </td></tr>
  ${items}
  <tr><td style="padding:16px 32px 0 32px;"><div style="border-top:1px solid #e8e8e8;"></div></td></tr>`
}

function footerSection(city: NewsletterCity, unsubscribeUrl: string): string {
  return `
  <!-- FOOTER -->
  <tr><td style="background-color:#f9f9f9;padding:28px 32px;border-top:1px solid #e8e8e8;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="text-align:center;">
          <a href="https://www.culturealberta.com" style="text-decoration:none;">
            <span style="font-size:15px;font-weight:900;color:#0a0a0a;letter-spacing:-0.3px;">Culture Alberta</span>
          </a>
          <p style="margin:8px 0 0 0;font-size:12px;color:#aaa;line-height:1.7;">
            You're receiving this because you subscribed at
            <a href="https://www.culturealberta.com" style="color:#aaa;">culturealberta.com</a>
          </p>
          <p style="margin:10px 0 0 0;font-size:12px;">
            <a href="${escapeHtml(unsubscribeUrl)}" style="color:#aaa;text-decoration:underline;">Unsubscribe</a>
            &nbsp;&middot;&nbsp;
            <a href="https://www.culturealberta.com/${city}" style="color:#aaa;text-decoration:underline;">View online</a>
            &nbsp;&middot;&nbsp;
            <a href="https://www.culturealberta.com" style="color:#aaa;text-decoration:underline;">culturealberta.com</a>
          </p>
          <p style="margin:10px 0 0 0;font-size:11px;color:#ccc;">
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

  const subject = getSubjectLine(city)

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
  <body style="margin:0;padding:0;background-color:#e8e8e8;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

    <!-- Email preview text (hidden) -->
    <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#e8e8e8;">
      ${hero ? escapeHtml(hero.title.substring(0, 90)) : `Today's top stories from ${escapeHtml(cfg.cityLabel)}`} — Culture Alberta
      &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
      style="background-color:#e8e8e8;min-width:100%;">
      <tr><td align="center" style="padding:24px 12px;">

        <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation"
          style="max-width:600px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">

          <!-- TOP ACCENT BAR -->
          <tr><td style="background:linear-gradient(90deg,${cfg.accentColor},${cfg.accentColorDark});height:6px;font-size:1px;line-height:1px;">&nbsp;</td></tr>

          <!-- MASTHEAD -->
          <tr><td style="padding:26px 32px 22px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;">
                  <div style="font-size:28px;font-weight:900;letter-spacing:-0.8px;color:#0a0a0a;line-height:1.1;">${escapeHtml(cfg.newsletterName)}</div>
                  <div style="font-size:12px;color:#999;margin-top:4px;letter-spacing:0.4px;">
                    ${escapeHtml(cfg.cityLabel)} &middot; ${today}
                  </div>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <a href="https://www.culturealberta.com" style="text-decoration:none;font-size:11px;font-weight:800;color:#999;letter-spacing:1.5px;text-transform:uppercase;">
                    Culture Alberta
                  </a>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- DIVIDER -->
          <tr><td style="padding:0 32px;"><div style="border-top:3px solid #0a0a0a;"></div></td></tr>

          <!-- GREETING -->
          <tr><td style="padding:20px 32px 22px 32px;background-color:#fafafa;border-bottom:1px solid #efefef;">
            <p style="margin:0;font-size:15px;line-height:1.7;color:#444;">
              <strong style="color:#0a0a0a;">${escapeHtml(cfg.greeting)} ${cfg.emoji}</strong><br />
              Here's what's happening in your city — the stories worth knowing, in 5 minutes or less.
            </p>
          </td></tr>

          ${hero ? heroSection(hero, cfg.accentColor, cfg.accentColorDark) : ''}
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
