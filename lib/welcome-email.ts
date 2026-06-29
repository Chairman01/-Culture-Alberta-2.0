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
 * Branded "welcome" email sent once when a reader creates an account. Clean
 * black-and-white house style (black header + wordmark, black CTA). Best-effort:
 * no-ops without RESEND_API_KEY.
 */
export async function sendWelcomeEmail({ email, name, city }: WelcomeArgs): Promise<void> {
    if (!process.env.RESEND_API_KEY) return

    const firstName = (name || '').trim().split(/\s+/)[0]
    const heading = firstName ? `Welcome, ${firstName}.` : 'Welcome to Culture Alberta.'
    const cityLine = city
        ? `We’ll keep you in the loop on what’s happening in <strong>${city}</strong> and right across Alberta`
        : `We’ll keep you in the loop on what’s happening in your city and right across Alberta`

    const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
      <tr><td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
          <tr><td style="background:#000000;padding:26px;text-align:center">
            <span style="display:inline-block;font-size:12px;font-weight:800;letter-spacing:3px;color:#ffffff;line-height:1.1">CULTURE</span><br/>
            <span style="display:inline-block;font-size:22px;font-weight:800;letter-spacing:1px;color:#ffffff;line-height:1.1">ALBERTA</span>
          </td></tr>

          <tr><td style="padding:40px 44px;color:#18181b">
            <h1 style="font-size:22px;font-weight:700;margin:0 0 16px">${heading}</h1>
            <p style="font-size:15px;line-height:1.65;color:#52525b;margin:0 0 16px">
              Thanks for joining Culture Alberta. You’re now part of a community that stays in the
              know about the culture, food, events, and stories that matter to Albertans.
            </p>
            <p style="font-size:15px;line-height:1.65;color:#52525b;margin:0 0 28px">
              ${cityLine}.
            </p>

            <a href="${SITE_URL}" style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 30px;border-radius:8px">
              Start exploring &rarr;
            </a>

            <p style="font-size:14px;color:#52525b;margin:30px 0 8px">Once you’re in, you can:</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="font-size:14px;color:#3f3f46;line-height:1.5;padding:4px 0">&bull;&nbsp;&nbsp;Join the conversation in the comments</td></tr>
              <tr><td style="font-size:14px;color:#3f3f46;line-height:1.5;padding:4px 0">&bull;&nbsp;&nbsp;Save articles to read later</td></tr>
              <tr><td style="font-size:14px;color:#3f3f46;line-height:1.5;padding:4px 0">&bull;&nbsp;&nbsp;Get notified when someone replies to you</td></tr>
              <tr><td style="font-size:14px;color:#3f3f46;line-height:1.5;padding:4px 0">&bull;&nbsp;&nbsp;See stories tuned to where you live</td></tr>
            </table>
          </td></tr>

          <tr><td style="background:#fafafa;padding:22px;text-align:center;border-top:1px solid #eeeeee">
            <p style="font-size:12px;color:#a1a1aa;margin:0">You’re receiving this because you created a Culture Alberta account.</p>
            <p style="font-size:12px;color:#c4c4cc;margin:6px 0 0">© Culture Alberta · Alberta, Canada</p>
          </td></tr>
        </table>
      </td></tr>
    </table>`

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
        from: FROM,
        to: email,
        subject: 'Welcome to Culture Alberta',
        html,
    })
}
