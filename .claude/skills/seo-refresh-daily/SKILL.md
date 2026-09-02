---
name: seo-refresh-daily
description: The daily SEO refresh loop — report how the last change performed, then do exactly one item from the seo_backlog and queue it for approval. Runs after daily-article-review in the Alberta daily update, or on demand.
---

# Daily SEO refresh loop

One job a day, in this order: **say how the last change is going, then make the
next one.** Never more than one backlog item per run — a day where six pages
change is a day where nothing can be attributed to anything.

Supabase MCP (`execute_sql`, project `itdmwpbsnviassgqfhxk`) is how you read and
write everything below.

---

## The hard rules

These are not style preferences. Breaking any one of them costs traffic or
trust.

1. **Never change `title` on a ranking article. Change `seo_title`.**
   `app/api/admin/articles/[id]/route.ts:171` derives the slug from the title
   whenever a caller doesn't pass `slug` explicitly — so editing the headline of
   the rebate article silently moves its URL. A redirect gets written, but the
   page still restarts its ranking history at position zero. `seo_title` is the
   `<title>` tag override built for exactly this (`lib/seo/title.ts`); it never
   touches the slug. Update it with SQL and the page picks it up within 30
   minutes (`revalidate = 1800`).
   The only exception is an article whose headline is *wrong*, and even then you
   pass the existing `slug` through unchanged.
2. **`seo_title` must be ≤ 60 characters.** Longer and Google truncates it and
   Bing flags it. `MAX_TITLE_LENGTH` in `lib/seo/title.ts` is the source of
   truth. Count the characters — do not estimate.
3. **Nothing goes live without the user's yes.** New articles are inserted as
   `status = 'draft'`. Refreshes are written to `seo_refreshes` as `'queued'`
   and applied only after approval. This is a standing rule.
4. **Never call a send, publish, or newsletter endpoint** — not even with HEAD.
5. **Editorial values hold.** No festivals or concerts, nothing haram (alcohol,
   casinos, nightlife, adults-only). If a backlog item drifts into that — a
   "best restaurants" piece is the likely one — cover the food, skip the bar
   programme.
6. **Verify every fact in a new article** against a primary source (the City,
   the Province, the registry) before writing it. Dates and dollar figures in
   the backlog's `rationale` are the user's notes, not verified facts.

---

## Step 1 — Is the measurement working?

```sql
select
  (select count(*) from seo_query_daily where day >= current_date - 3) as fresh_rows,
  (select max(day)::text from seo_query_daily) as latest_day,
  (select count(distinct source) from seo_query_daily where day >= current_date - 7) as sources;
```

`sources` should be 2 (`gsc` and `bing`). If `fresh_rows` is 0, the collector is
not running — say so in one line at the top of the report and carry on with the
work half. **A blind run still ships value**; it just cannot grade itself.
Common causes, in order: the cron isn't deployed, `GOOGLE_ANALYTICS_CREDENTIALS`
or `BING_WEBMASTER_API_KEY` isn't set in Vercel, or the key was revoked (check
`seo_alerts` for a collector error).

## Step 2 — How is the last change going?

```sql
select r.id, r.slug, r.kind, r.status, r.verdict,
       (r.applied_at at time zone 'America/Edmonton')::date as applied,
       greatest(0, 14 - (current_date - (r.applied_at at time zone 'America/Edmonton')::date)) as days_until_verdict,
       r.proposal->>'summary' as change
from seo_refreshes r
where r.status in ('queued', 'applied', 'measured')
order by r.updated_at desc
limit 10;
```

Report each one in a line of plain English:

- **`measured`** — the verdict is in. Lead with it: *"The rebate retitle is in:
  clicks +38% (412 → 570), position −0.4. It worked."*
- **`applied`** — still settling. *"Costco retitle applied Sept 4, verdict in 9
  days."* Do not guess at it early; 14 days is the settling time for a reason.
- **`queued`** — waiting on the user. Say so plainly; this is a blocker, and if
  two or more are queued, stop proposing new ones and ask them to clear the
  queue first.

## Step 3 — Act on the verdict

- **`worse`** → propose reverting. The old `seo_title` is in
  `proposal->'before'`. A refresh that lost clicks answered a different question
  than the searcher asked; say which question it should have answered instead.
- **`improved`** → name the mechanism in one sentence (deadline in the title,
  open-status phrasing, name front-loaded) and apply the same move to the next
  item where it fits.
- **`flat`** → the title wasn't the constraint. Do not retitle it again. Look at
  intent instead: the page may be answering a question nobody asked.

## Step 4 — Take exactly one backlog item

```sql
select id, rank, kind, label, target_slug, cluster, rationale, evidence
from seo_backlog
where status = 'todo'
order by rank
limit 1;
```

### If `kind = 'refresh'`

1. Read the article: `select id, slug, title, seo_title, content from articles
   where slug = '<target_slug>'`.
2. Look at what it actually ranks for, so the retitle answers the real query:
   ```sql
   select query, source, sum(impressions) as impressions, sum(clicks) as clicks,
          round((sum(position * impressions) / nullif(sum(impressions), 0))::numeric, 2) as position
   from seo_query_daily
   where page = '/articles/<slug>' and query <> '' and day >= current_date - 28
   group by query, source order by impressions desc limit 15;
   ```
   No rows means no data yet — fall back to the `evidence` column, and say the
   proposal is based on the user's figures rather than collected data.
3. Write a `seo_title` of 60 characters or fewer that answers the dominant
   query's actual question. The pattern that earns: **the answer, then the
   qualifier.** "Alberta Energy Rebate: Sept 30 Deadline, Verified Account
   Needed" beats "Alberta Energy Rebate Portal Not Working? The Bank Fix…"
   because the first one answers before the click.
4. Note any cross-links worth adding (the `/tools` checker, the cluster hub) and
   any body edit the deadline makes necessary. Keep body edits small and
   factual.
5. Take the baseline and queue it — see Step 5.

### If `kind = 'new'`

1. Verify the facts against primary sources first. If a central fact cannot be
   verified, do not write the article: mark the item `status = 'todo'` still,
   report what you couldn't confirm, and take the next item instead.
2. Write it to the house standard, with a `seo_title` ≤ 60 characters.
3. Insert it as **`status = 'draft'`**, then record it in `seo_refreshes` with
   `kind = 'new'` (its baseline is null — a new page has no before).

## Step 5 — Queue it, don't ship it

Take the 28-day baseline *before* anything changes, or the comparison is
worthless:

```sql
-- Baseline for the 28 days before today, per source.
select source,
       sum(clicks) as clicks, sum(impressions) as impressions,
       round((sum(position * impressions) / nullif(sum(impressions), 0))::numeric, 2) as position,
       count(distinct day) as days
from seo_query_daily
where page = '/articles/<slug>' and query = '' and day between current_date - 28 and current_date
group by source;
```

Shape that into the `baseline` JSON the measurement code expects
(`lib/seo-vitals/refresh.ts` → `Snapshot`: `{window:{from,to}, gsc:{clicks,
impressions, position, ctr, days}, bing:{…}, queries:[…]}`), then:

```sql
insert into seo_refreshes (backlog_id, slug, kind, status, proposal, baseline)
values (<backlog_id>, '<slug>', 'refresh', 'queued',
        $j${"summary":"…one line…","before":{"seo_title":null,"title":"…"},
            "after":{"seo_title":"…"},"links":["/tools/…"],"why":"…"}$j$::jsonb,
        $j${…baseline…}$j$::jsonb);

update seo_backlog set status = 'queued', updated_at = now() where id = <backlog_id>;
```

Then present it to the user for approval — old title, new title, the query it
now answers, and the one-line reason. Nothing else.

## Step 6 — Only after the user approves

```sql
update articles set seo_title = '<new>' where slug = '<slug>';
update seo_refreshes set status = 'applied', applied_at = now(), updated_at = now() where id = <id>;
update seo_backlog set status = 'done', updated_at = now() where id = <backlog_id>;
```

The cron settles the verdict on its own 14 days later. Nothing more to do.

If the user says no: `status = 'rejected'` on the refresh, and put the backlog
item back to `'todo'` so it can be attempted differently another day.

---

## The report

Short. Four parts, in this order:

1. **Verdict line** — how the last change is going, or that measurement is blind.
2. **In flight** — one line each for applied and queued.
3. **Today's item** — what you did, and the old → new title.
4. **Your call** — the one thing you need from the user (approve / reject).

No preamble, no restating the backlog. If nothing needed doing — the queue is
full and no verdict landed — say that in one sentence and stop.
