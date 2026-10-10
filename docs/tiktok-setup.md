# TikTok auto-posting

Every published article that isn't crime or tragedy becomes a TikTok photo
carousel for @culturealberta._:

1. Cover: the article's main photo, full-screen, with the headline
2. One slide per key fact (written by Claude), each on the article's next photo
3. "Full story: link in bio"

Slides are rendered by `/api/tiktok-slide/<slug>/<slide>.jpg` (1080x1920 JPEG,
smart-cropped so the subject stays in frame). Posting runs in the same
`lib/social` pipeline as the other platforms (platform `tiktok`): dedupe, the
hourly retry sweeper and the `social_posts` log all apply. Only articles
published after setup are posted.

Research: `reports/TikTok autoposting with music.md` (2026-10-09).

## Default: finish each post in the TikTok app (free)

No posting API can attach songs from TikTok's main trending chart, so by
default each carousel comes to your phone ready to post, and you add the
sound in TikTok yourself:

- **Buffer (reminder mode)**: the Buffer app notifies you, saves the slides
  to your phone and copies the caption. Open TikTok, select the slides, paste
  the caption, add a sound, post. Same free Buffer account as X.
- **Zernio (draft mode)**: the carousel lands in TikTok's own drafts inbox
  with the slides already in order. Add a sound and post. Free for 2 accounts.
  TikTok allows 5 pending drafts per 24 hours, so clear them daily.

`TIKTOK_PUBLISH_MODE=auto` makes either publish directly instead (Buffer
silently; Zernio with TikTok's recommended music).

## Optional: pick the sound on the website (PostFast, paid)

With PostFast the editor's **TikTok sound** box lists this week's trending
Commercial Music Library sounds: play a preview, **Use** one for the article,
or **Set default** for every article. The site then publishes directly with
that sound. Order: the article's pick, the default, then TikTok's recommended
music (`TIKTOK_AUTO_MUSIC=off` to skip that). With Buffer or Zernio the box
just says the sound is added in TikTok.

## Which service

`TIKTOK_PROVIDER=buffer|zernio|postfast`. When unset, the first one with its
settings in Vercel is used, in that order.

| Service | Vercel settings |
| --- | --- |
| Buffer | `BUFFER_API_KEY`, `BUFFER_TIKTOK_CHANNEL_ID` |
| Zernio | `ZERNIO_API_KEY`, `ZERNIO_TIKTOK_ACCOUNT_ID` |
| PostFast | `POSTFAST_API_KEY`, `POSTFAST_TIKTOK_ACCOUNT_ID` |

Open `/api/admin/tiktok/status` (admin) for the TikTok account ids each
service reports and what to set next. Open `/api/tiktok/preview` to see any
recent article's exact carousel and caption; it posts nothing. Redeploy after
changing Vercel settings.

`SLIDE_SIGNING_SECRET` is optional; without it slides are signed with
`CRON_SECRET`, which is already set.

## Notes

- PostFast can't publish "now"; its posts are scheduled about 90 seconds ahead.
- TikTok caps API posts at about 15 per account per day; we send about 3.
- Buffer's free plan holds at most 10 waiting posts. Finish reminders as they
  arrive so they don't pile up.
