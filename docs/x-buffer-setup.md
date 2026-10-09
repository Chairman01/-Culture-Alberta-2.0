# Posting to X through Buffer

Every published article goes to @Culturealberta on X as the branded card image
(`/api/pin/<slug>.png`) with three point-form bullets written by Claude. Half
the articles carry the link in the post and half in a reply, so GA4 can show
which brings more readers. It runs in the same `lib/social` pipeline as Bluesky
and Threads: dedupe, the hourly retry sweeper and the `social_posts` log all
apply (platform `x_buffer`).

Why Buffer: X's own API charges $0.20 for any post or reply containing a link,
about $28/month at our volume. Buffer Essentials is about $5–6/month with API
access. Research: `reports/X autoposting for Culture Alberta.md` (2026-10-09).

## Setup

1. Sign up at buffer.com and choose **Essentials** with one channel.
2. Connect **X** and sign in as @Culturealberta.
3. Buffer → Settings → API (`https://publish.buffer.com/settings/api`): create
   an API key.
4. In Vercel (Production) add `BUFFER_API_KEY` with that key, then redeploy.
5. Signed in as admin, open `/api/x/status`. Copy the `id` under `xChannels`
   into Vercel as `BUFFER_X_CHANNEL_ID`, then redeploy. The status page should
   say "Ready".

Do **not** add `X_API_KEY` and friends: the direct X poster is a fallback and
is switched off whenever Buffer is configured.

## Checking before and after

- `/api/x/preview` (admin) shows the exact X post for any recent article,
  including which link placement it gets and whether Claude wrote the bullets.
  It posts nothing, but it does call Claude.
- `/api/x/status` shows config, channels and the last ten posts.
- `select * from social_posts where platform = 'x_buffer' order by created_at desc`

Only articles published after setup are posted; the archive is never
backfilled.

## The link-placement test

Each article is assigned to `link_post` or `link_reply` by a hash of its id.
Links carry `utm_source=x&utm_medium=social&utm_campaign=autopost` and
`utm_content=link_post|link_reply`. After about six weeks (~95 posts per arm),
compare GA4 engaged sessions per post for the two `utm_content` values. Then set
`X_LINK_MODE=post` or `X_LINK_MODE=reply` in Vercel to keep the winner.

## If something fails

- `Buffer API 401`: the key is wrong or revoked. Create a new one.
- `Buffer refused the post: …`: Buffer's own message, often an X-side problem
  such as a locked account.
- `Card image unavailable`: the card route failed for that article.
- Bullets say "excerpt (fallback)" in the preview: Claude was unavailable or
  declined; the post still goes out with bullets cut from the excerpt.
