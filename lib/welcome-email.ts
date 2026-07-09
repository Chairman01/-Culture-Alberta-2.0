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
    const subject = firstName ? `Welcome to Culture Alberta, ${firstName}` : 'Welcome to Culture Alberta'

    // A soft, highlighted callout that reflects the city they chose at signup —
    // reinforces the "we tune this to you" promise. Omitted if we don't have one.
    const cityBlock = city
        ? `<tr><td style="padding:4px 44px 4px">
             <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #dbeafe;border-radius:12px">
               <tr><td style="padding:14px 18px;font-size:14px;line-height:1.55;color:#1e3a5f">
                 <span style="font-size:16px">📍</span>&nbsp;&nbsp;You're set to <strong>${city}</strong>. We'll tune the stories, food, and events we show you to ${city} and the rest of Alberta.
               </td></tr>
             </table>
           </td></tr>`
        : ''

    const feature = (emoji: string, text: string) =>
        `<tr>
           <td width="34" valign="top" style="font-size:18px;line-height:1.5;padding:6px 0">${emoji}</td>
           <td style="font-size:14px;color:#3f3f46;line-height:1.5;padding:6px 0">${text}</td>
         </tr>`

    const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
          <tr><td style="background:#000000;padding:26px;text-align:center">
            <span style="display:inline-block;font-size:12px;font-weight:800;letter-spacing:3px;color:#ffffff;line-height:1.1">CULTURE</span><br/>
            <span style="display:inline-block;font-size:22px;font-weight:800;letter-spacing:1px;color:#ffffff;line-height:1.1">ALBERTA</span>
          </td></tr>

          <tr><td style="padding:32px 44px 10px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="150" valign="middle" style="padding-right:26px">
                  <img src="${SITE_URL}/images/alberta-collage.png" alt="A collage of Alberta in the shape of the province" width="150" style="width:150px;height:auto;border-radius:10px;filter:drop-shadow(0 8px 20px rgba(15,23,42,0.18))" />
                </td>
                <td valign="middle" style="color:#18181b">
                  <h1 style="font-size:22px;font-weight:700;margin:0 0 12px">${heading}</h1>
                  <p style="font-size:14px;line-height:1.65;color:#52525b;margin:0">
                    Thanks for joining Culture Alberta. You’re now part of a community that stays in the
                    know about the culture, food, events, and stories that matter to Albertans.
                  </p>
                </td>
              </tr>
            </table>
          </td></tr>

          ${cityBlock}

          <tr><td style="padding:20px 44px 4px">
            <a href="${SITE_URL}" style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 32px;border-radius:8px">
              Start exploring &rarr;
            </a>
          </td></tr>

          <tr><td style="padding:24px 44px 8px">
            <p style="font-size:14px;font-weight:600;color:#18181b;margin:0 0 6px">Here’s what you can do with your account:</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${feature('💬', 'Join the conversation in the comments')}
              ${feature('🔖', 'Save articles to read later')}
              ${feature('🔔', 'Get notified when someone replies to you')}
              ${feature('📍', 'See stories tuned to where you live')}
            </table>
          </td></tr>

          <tr><td style="padding:8px 44px 36px">
            <p style="font-size:14px;line-height:1.6;color:#52525b;margin:0">
              Curious what’s on this week?
              <a href="${SITE_URL}/events" style="color:#2563eb;text-decoration:none;font-weight:600">Browse Alberta events &rarr;</a>
            </p>
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
        subject,
        html,
    })
}
