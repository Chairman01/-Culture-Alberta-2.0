import type { SocialArticle } from './index'

// ---------------------------------------------------------------------------
// Telegram — posts to a public channel via the free Bot API.
// Setup: create a bot with @BotFather, add it as an admin of the channel.
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID (e.g. @culturealberta)
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function postToTelegram(
  article: SocialArticle,
  articleUrl: string
): Promise<string | undefined> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHANNEL_ID

  const text = `<b>${escapeHtml(article.title)}</b>\n\n${articleUrl}`

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      // keep the link preview (Telegram renders the article's OG image/card)
      link_preview_options: { is_disabled: false, url: articleUrl, prefer_large_media: true },
    }),
  })
  const json = await res.json()
  if (!json.ok) throw new Error(`Telegram post failed: ${JSON.stringify(json).slice(0, 300)}`)

  const messageId = json.result?.message_id
  const channel = String(chatId).replace(/^@/, '')
  return messageId ? `https://t.me/${channel}/${messageId}` : undefined
}
