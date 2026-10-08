# Pinterest auto-pinning

Every published article that passes the Pinterest filter becomes one Pin: the
1000x1500 card from `/api/pin/<slug>`, the headline as the title, the excerpt
plus hashtags as the description, and the article URL as the link. It runs
inside the same `lib/social` pipeline as Bluesky and Threads, so dedupe, the
hourly retry sweeper and the `social_posts` log all apply.

Nothing fires until the three env vars below exist **and** the account has
been connected once through OAuth.

## 1. Create the Pinterest app

1. Sign in to Pinterest as the Culture Alberta **business** account.
2. Go to <https://developers.pinterest.com/apps/> and create an app.
3. Under the app's settings add this redirect URI exactly:

   ```
   https://www.culturealberta.com/api/pinterest/callback
   ```

4. Copy the **App ID** and **App secret**.

Do not use the "Generate token" button on the app page. That token is
read-only and cannot create a Pin. The site does its own OAuth in step 3.

## 2. Add the env vars in Vercel (Production)

| Variable | Value |
| --- | --- |
| `PINTEREST_APP_ID` | the App ID from step 1 |
| `PINTEREST_APP_SECRET` | the App secret from step 1 |
| `PINTEREST_BOARD_ID` | set in step 4, after connecting |

`SOCIAL_AUTOPOST=true` is already set. Env vars are read on the next request,
no redeploy needed.

## 3. Connect the account (once)

Sign in at `/admin/login`, then open:

```
https://www.culturealberta.com/api/pinterest/connect
```

Approve the consent screen. Pinterest sends you back to the callback, which
stores the access token (30 days) and refresh token (60 days) in
`social_tokens`. The weekly cron `/api/cron/refresh-pinterest-token` renews
the access token before it lapses. If the refresh token ever expires, just
repeat this step. Each renewal returns a fresh refresh token, so as long as the
weekly cron keeps running the chain never lapses.

Scopes requested: `boards:read`, `pins:read`, `pins:write`. Nothing more.

## 4. Choose the boards

Open `/api/pinterest/status` (admin). It lists every board with its id.

- Set `PINTEREST_BOARD_ID` in Vercel to the board that should take everything
  that has no city board. "Alberta" is the natural choice.
- Optionally create one board per city, named **exactly** after the article
  category: `Edmonton`, `Calgary`, `Lethbridge`, `Red Deer`, `Grande Prairie`.
  Matching is by name, case-insensitive, so no code change is needed when a
  city is added. A board called "Edmonton Eats" does not match.

Once `PINTEREST_BOARD_ID` is set the status page reports "Ready".

## 5. Trial vs Standard access

A new Pinterest app starts on **Trial** access. Trial Pins are sandboxed: they
exist, the API returns an id, but only the app owner can see them and they
send no traffic. Apply for **Standard** access from the app page. Pinterest
asks for a short screen recording of the OAuth flow, which is the
`/api/pinterest/connect` to `/api/pinterest/callback` round trip from step 3.
Until Standard access is granted, treat `social_posts` rows for `pinterest`
as a dry run.

## What gets pinned

Pinterest readers search for things to do, places to go and ways to save, and
its ranking buries grim content. `isPinnable()` in `lib/social/pinterest.ts`
therefore skips any article whose title or tags mention crime, missing people,
deaths, crashes, court or fraud. Those articles still go to Bluesky and
Threads as before. Edit the `NOT_FOR_PINTEREST` list to tune this.

Articles published before the account went live are never backfilled; the
sweeper only ever refills a platform that had already posted something.

## Checking on it

- `/api/pinterest/status` shows tokens, boards, config and the last ten rows.
- `select * from social_posts where platform = 'pinterest' order by created_at desc`
  shows every attempt with its Pin URL or error.
- A `401` error means the token is gone: redo step 3.
- A `403` usually means Trial access or a token without `pins:write`.
