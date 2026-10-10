# TikTok auto-posting

Every published article that isn't crime or tragedy becomes a TikTok photo
carousel on @culturealberta._:

1. Cover: the article's main photo, full-screen, with the headline
2. One slide per key fact (written by Claude), each on the article's next photo
3. "Full story: link in bio"

Slides are rendered by `/api/tiktok-slide/<slug>/<slide>.jpg` (1080x1920 JPEG,
smart-cropped so the subject stays in frame). Posting runs in the same
`lib/social` pipeline as the other platforms (platform `tiktok`): dedupe, the
hourly retry sweeper and the `social_posts` log all apply. Only articles
published after setup are posted.

Research: `reports/TikTok autoposting with music.md` (2026-10-09).

## Sound

Pick a sound in the article editor's **TikTok sound** box (admins only):
search or browse this week's trending sounds, press **Play** to preview,
**Use** to pick it for this article, or **Set default** to use it for every
article without its own pick. The order is: the article's pick, then the
default, then TikTok's recommended music (turn that last fallback off with
`TIKTOK_AUTO_MUSIC=off`).

Sounds are from TikTok's Commercial Music Library, cleared for business use.
No API can attach songs from TikTok's general trending chart.

## Setup (PostFast)

1. Sign up at postfa.st and connect the TikTok account (Accounts page).
2. PostFast → Settings → API: create a key. Add it to Vercel (Production) as
   `POSTFAST_API_KEY` and redeploy.
3. Signed in as admin, open `/api/admin/tiktok/status`. Copy the TikTok
   account's `id` into Vercel as `POSTFAST_TIKTOK_ACCOUNT_ID` and redeploy.
4. `SLIDE_SIGNING_SECRET` is optional; without it the slides are signed with
   `CRON_SECRET`, which is already set.
5. Open `/api/tiktok/preview` to see the exact carousel, caption and music for
   any recent article. It posts nothing.

If a sound list fails with `requiresBusinessApi`, reconnect the TikTok account
once from PostFast's Accounts page.

## Switching provider

`TIKTOK_PROVIDER=buffer` posts through Buffer instead (needs `BUFFER_API_KEY`
and `BUFFER_TIKTOK_CHANNEL_ID`), but Buffer can't add music.

## Notes

- PostFast can't publish "now"; posts are scheduled about 90 seconds ahead.
- Carousels take 2–10 images on PostFast; ours are 5.
- TikTok caps API posts at about 15 per account per day; we post about 3.
