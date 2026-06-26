import 'server-only'
import { Resend } from 'resend'
import { getServiceClient } from '@/lib/supabase-admin'

const FROM = 'Culture Alberta <news@culturemedia.ca>'
const SITE_URL = 'https://www.culturealberta.com'

interface SendReplyEmailArgs {
    recipientUserId: string
    actorName: string
    excerpt: string
    articleId: string
}

/**
 * Best-effort email to a comment's author when someone replies. Honours the
 * recipient's `reply_emails` preference (defaults to on) and silently no-ops
 * if they have no email on file (e.g. some social logins) or email isn't set up.
 */
export async function sendReplyEmail({ recipientUserId, actorName, excerpt, articleId }: SendReplyEmailArgs): Promise<void> {
    if (!process.env.RESEND_API_KEY) return

    const admin = getServiceClient()

    const { data: userData, error } = await admin.auth.admin.getUserById(recipientUserId)
    const recipient = userData?.user
    if (error || !recipient?.email) return

    const meta = (recipient.user_metadata ?? {}) as { reply_emails?: boolean }
    if (meta.reply_emails === false) return // opted out

    const { data: article } = await admin
        .from('articles')
        .select('slug, title')
        .eq('id', articleId)
        .maybeSingle()

    const url = `${SITE_URL}/articles/${article?.slug || articleId}#comments`
    const title = article?.title || 'your article'
    const safeActor = (actorName || 'Someone').replace(/[<>]/g, '')
    const safeExcerpt = (excerpt || '').replace(/[<>]/g, '')

    const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
          <h2 style="font-size:18px;margin:0 0 12px">${safeActor} replied to your comment</h2>
          <p style="margin:0 0 8px">on <strong>${title}</strong>:</p>
          <blockquote style="margin:0 0 16px;padding:12px 16px;background:#f3f4f6;border-radius:8px;color:#374151">${safeExcerpt}</blockquote>
          <p style="margin:0 0 20px">
            <a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px">View the reply</a>
          </p>
          <p style="font-size:12px;color:#9ca3af;margin:0">
            You’re receiving this because you commented on Culture Alberta.
            Turn these off anytime in <a href="${SITE_URL}/account" style="color:#6b7280">your account</a>.
          </p>
        </div>`

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
        from: FROM,
        to: recipient.email,
        subject: `${safeActor} replied to your comment`,
        html,
    })
}
