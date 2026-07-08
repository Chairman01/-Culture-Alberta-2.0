import type { SocialArticle } from './index'

// ---------------------------------------------------------------------------
// Reddit — link post to your own subreddit (r/CultureAlberta). Link posts show
// the article's preview image and the whole post clicks through to the site.
// Setup: reddit.com/prefs/apps → create app → type "script" → gives client id
// (under the app name) and secret. Use the account that moderates the sub.
// Env: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME,
//      REDDIT_PASSWORD, REDDIT_SUBREDDIT (defaults to CultureAlberta)
// ---------------------------------------------------------------------------

const USER_AGENT = 'web:com.culturealberta.autopost:v1.0 (by /u/CultureAlberta)'

async function getAccessToken(): Promise<string> {
  const basic = Buffer.from(
    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username: process.env.REDDIT_USERNAME!,
      password: process.env.REDDIT_PASSWORD!,
    }),
  })
  const json = await res.json()
  if (!json.access_token) {
    throw new Error(`Reddit auth failed: ${JSON.stringify(json).slice(0, 300)}`)
  }
  return json.access_token as string
}

export async function postToReddit(
  article: SocialArticle,
  articleUrl: string
): Promise<string | undefined> {
  const token = await getAccessToken()
  const subreddit = process.env.REDDIT_SUBREDDIT || 'CultureAlberta'

  const res = await fetch('https://oauth.reddit.com/api/submit', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      api_type: 'json',
      kind: 'link',
      sr: subreddit,
      title: article.title.slice(0, 300),
      url: articleUrl,
      resubmit: 'false',
    }),
  })
  const json = await res.json()
  const errors = json?.json?.errors
  if (!res.ok || (Array.isArray(errors) && errors.length > 0)) {
    throw new Error(`Reddit post failed: ${JSON.stringify(errors || json).slice(0, 300)}`)
  }
  return json?.json?.data?.url as string | undefined
}
