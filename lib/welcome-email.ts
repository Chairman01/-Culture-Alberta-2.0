import 'server-only'
import { Resend } from 'resend'

const FROM = 'Culture Alberta <news@culturemedia.ca>'
const SITE_URL = 'https://www.culturealberta.com'

interface WelcomeArgs {
    email: string
    name?: string | null
    city?: string | null
}

/**
 * Branded "welcome / thanks for signing up" email, sent once when a reader
 * creates a Culture Alberta account (email or social). Best-effort: no-ops if
 * Resend isn't configured.
 */
export async function sendWelcomeEmail({ email, name, city }: WelcomeArgs): Promise<void> {
    if (!process.env.RESEND_API_KEY) return

    const firstName = (name || '').trim().split(/\s+/)[0]
    const greeting = firstName ? `Welcome to Culture Alberta, ${firstName}!` : 'Welcome to Culture Alberta!'
    const cityLine = city
        ? `We’ll keep you in the loop on what’s happening in <strong>${city}</strong> and right across Alberta`
        : `We’ll keep you in the loop on what’s happening in your city and right across Alberta`

    const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;font-family:Arial,Helvetica,sans-serif">
      <tr><td align="center">
        <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06)">
          <tr><td style="background:#0f172a;padding:24px;text-align:center">
            <span style="display:inline-block;font-size:13px;font-weight:800;letter-spacing:2px;color:#ffffff;line-height:1.1">CULTURE</span><br/>
            <span style="display:inline-block;font-size:22px;font-weight:800;letter-spacing:1px;color:#ffffff;line-height:1.1">ALBERTA</span>
          </td></tr>

          <tr><td style="padding:36px 40px 8px;color:#1f2937">
            <h1 style="font-size:22px;margin:0 0 14px">${greeting} 🎉</h1>
            <p style="font-size:15px;line-height:1.6;color:#4b5563;margin:0 0 14px">
              Thanks for signing up. You’re now part of a community that stays in the know about the
              culture, food, events, and stories that matter to Albertans.
            </p>
            <p style="font-size:15px;line-height:1.6;color:#4b5563;margin:0 0 22px">
              ${cityLine} — and connected with people who care about the same things you do.
            </p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px">
              <tr><td style="font-size:14px;color:#374151;padding:6px 0">💬&nbsp;&nbsp;Join the conversation in the comments</td></tr>
              <tr><td style="font-size:14px;color:#374151;padding:6px 0">🔖&nbsp;&nbsp;Save articles to read later</td></tr>
              <tr><td style="font-size:14px;color:#374151;padding:6px 0">🔔&nbsp;&nbsp;Get notified when someone replies to you</td></tr>
              <tr><td style="font-size:14px;color:#374151;padding:6px 0">📍&nbsp;&nbsp;Stories tuned to where you live</td></tr>
            </table>

            <a href="${SITE_URL}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 30px;border-radius:10px">
              Start exploring Culture Alberta →
            </a>
          </td></tr>

          <tr><td style="padding:28px 40px 32px">
            <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0">
              Glad to have you here. — The Culture Alberta team
            </p>
          </td></tr>

          <tr><td style="background:#f9fafb;padding:18px;text-align:center;border-top:1px solid #eef0f2">
            <p style="font-size:12px;color:#9ca3af;margin:0">
              You’re receiving this because you created a Culture Alberta account.
            </p>
            <p style="font-size:12px;color:#c4c8cf;margin:6px 0 0">© Culture Alberta · Alberta, Canada</p>
          </td></tr>
        </table>
      </td></tr>
    </table>`

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
        from: FROM,
        to: email,
        subject: 'Welcome to Culture Alberta 👋',
        html,
    })
}
