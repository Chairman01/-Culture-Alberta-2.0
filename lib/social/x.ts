import crypto from 'crypto'
import type { SocialArticle } from './index'

// ---------------------------------------------------------------------------
// X (Twitter) — publisher format: headline as the main tweet, article link as
// the first reply (links in the tweet body get reach-throttled).
// Setup: developer.x.com → create app (free tier) → generate the four keys
// with Read & Write permissions.
// Env: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
// ---------------------------------------------------------------------------

const TWEET_URL = 'https://api.twitter.com/2/tweets'

function pctEncode(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
}

// OAuth 1.0a HMAC-SHA1 request signing (no body params for JSON requests)
function oauthHeader(method: string, url: string): string {
  const params: Record<string, string> = {
    oauth_consumer_key: process.env.X_API_KEY!,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: process.env.X_ACCESS_TOKEN!,
    oauth_version: '1.0',
  }

  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${pctEncode(k)}=${pctEncode(params[k])}`)
    .join('&')
  const baseString = [method.toUpperCase(), pctEncode(url), pctEncode(paramString)].join('&')
  const signingKey = `${pctEncode(process.env.X_API_SECRET!)}&${pctEncode(process.env.X_ACCESS_SECRET!)}`
  params.oauth_signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')

  return (
    'OAuth ' +
    Object.keys(params)
      .sort()
      .map((k) => `${pctEncode(k)}="${pctEncode(params[k])}"`)
      .join(', ')
  )
}

async function tweet(body: Record<string, unknown>): Promise<string> {
  const res = await fetch(TWEET_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: oauthHeader('POST', TWEET_URL),
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok || !json.data?.id) {
    throw new Error(`X post failed: ${res.status} ${JSON.stringify(json).slice(0, 300)}`)
  }
  return json.data.id as string
}

export async function postToX(
  article: SocialArticle,
  articleUrl: string
): Promise<string | undefined> {
  // Main tweet: headline only (no link → no throttle)
  const mainId = await tweet({ text: article.title.slice(0, 280) })

  // First reply: the article link. If the reply fails, the headline tweet
  // already exists — surface the error so it's recorded, but note the tweet.
  try {
    await tweet({ text: articleUrl, reply: { in_reply_to_tweet_id: mainId } })
  } catch (err) {
    throw new Error(`Headline tweeted (${mainId}) but link reply failed: ${String(err).slice(0, 200)}`)
  }

  return `https://x.com/i/web/status/${mainId}`
}
