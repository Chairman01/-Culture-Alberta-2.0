# Pinterest auto-pinning

Every published article that passes the Pinterest filter becomes one Pin: the
1000x1500 card from `/api/pin/<slug>`, the headline as the title, a
keyword-led description, and the article URL as the link (see "How a Pin is
written" below). It runs
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

`SOCIAL_AUTOPOST=true` is already set. **Redeploy after changing any of these.**
Vercel bakes env vars into each deployment, so a new value is invisible until
the next deploy (Deployments, then Redeploy on the latest one).

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

Scopes requested: `boards:read`, `boards:write`, `pins:read`, `pins:write`.
Creating a Pin needs all four; without `boards:write` Pinterest refuses with
"Missing: ['boards:write']". A token keeps the scopes it was issued with, so
after any change to this list, reconnect.

## 4. Choose the boards

Open `/api/pinterest/status` (admin). It lists every board with its id.

- Set `PINTEREST_BOARD_ID` in Vercel to the board that should take everything
  that has no city board, e.g. **Alberta News and Things to Do**.
- Optionally create one board per city whose name **starts with the city**, as
  the article category spells it. Pinterest ranks keyword-rich board names, so
  prefer **Edmonton News and Things to Do** over plain **Edmonton**; both
  match. Cities in use: Edmonton, Calgary, Lethbridge, Red Deer, Grande
  Prairie. No code change is needed when a city is added.
- Because any board starting with a city name matches, don't start an
  unrelated board's name with a city ("Edmonton Recipes") or stories will be
  routed to it.
- Give every board a description of a couple of sentences naming the place
  and topics in plain words. Pinterest reads it.

Once `PINTEREST_BOARD_ID` is set the status page reports "Ready".

## 5. Trial vs Standard access

A new Pinterest app starts on **Trial** access. Trial Pins are sandboxed: they
exist, the API returns an id, but only the app owner can see them and they
send no traffic. Apply for **Standard** access from the app page. Pinterest
asks for a short screen recording of the OAuth flow, which is the
`/api/pinterest/connect` to `/api/pinterest/callback` round trip from step 3.
**Leave `PINTEREST_BOARD_ID` unset until Standard access is granted.** On Trial
access every Pin fails; after five attempts the sweeper gives up and those
articles would never be pinned. With the board id unset the poster stays off.

## How a Pin is written

Pinterest ranks on words, not hashtags: hashtags stopped being clickable in
2020, and its search reads the title, description, board name and image.
`buildPin()` in `lib/social/pinterest.ts` therefore writes:

| Field | Content |
| --- | --- |
| Title | The headline (100 max; about 50 show in the feed) |
| Description | The excerpt first, since the opening words carry most weight, then "More <City> news, events and things to do from Culture Alberta." and at most two hashtags, the city and #Alberta. Capped at 500 characters. |
| Alt text | The headline plus what the image is |
| Link | The article |

Categories that are site sections rather than places (Local, National,
Culture) are described as Alberta.

## Testing without posting

Open `/api/pinterest/preview` signed in as admin. It lists the 30 newest
articles with Pin or Skip and the reason, and each opens to the exact card,
title, description, alt text, link and board the real Pin would use. It never
calls Pinterest's create-Pin endpoint.

## Pinning recent articles by hand

Open `/api/pinterest/backfill` signed in as admin. It lists the 30 newest
articles with Pin or Skip, lets you pick the default board, and pins them when
you press the button, oldest first. City and Canada boards still apply.
Successful Pins are recorded so the automatic poster never repeats them;
failures are not recorded, and two failures in a row stop the run.

Boards in use (2026-10-08): Alberta News and Things to Do (default),
Edmonton, Calgary, Red Deer and Lethbridge News and Things to Do, and Canada
News and Trending Stories, which takes the National category.

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
