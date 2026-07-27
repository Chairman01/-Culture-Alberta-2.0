---
name: daily-article-review
description: Review the articles published yesterday and judge whether they were the right RPM bets — utility/evergreen content vs low-RPM breaking news — and fold in Mediavine numbers the user pastes. Use as the FIRST item in the Alberta daily update, or run on demand.
---

# Daily article review (RPM / ROI)

Open the daily update with this. Goal: tell the user, in plain language, whether
yesterday's publishing was time well spent — did they build **high-RPM utility
content** (the 3–6x earners) or did time go to **low-RPM breaking news** (a one-day
traffic spike that barely monetizes)? See [[content-product-strategy]].

## Step 1 — Pull yesterday's articles

Run this via the Supabase MCP (`execute_sql`, project `itdmwpbsnviassgqfhxk`).
"Yesterday" is in Alberta time. If it returns nothing (early morning, timezone
edge), widen to `interval '2 days'` and say so.

```sql
select
  a.title,
  a.type,
  a.category,
  (a.created_at at time zone 'America/Edmonton')::date as published,
  a.slug
from articles a
where a.status = 'published'
  and (a.created_at at time zone 'America/Edmonton')::date
      = (now() at time zone 'America/Edmonton')::date - 1
order by a.created_at;
```

> Note: the in-house analytics tables (`analytics_content_views`, etc.) stopped
> writing on 2026-07-02, so do NOT try to pull views/sessions from them — the
> numbers are stale. Real performance comes from Mediavine (Step 3). This is
> flagged to fix separately; until then, treat views/sessions as user-supplied.

## Step 2 — Classify each by RPM potential

Judge from the title + category. Bucket every article:

- 🟢 **High RPM (evergreen/utility)** — the money content. Signals: guides,
  how-to, "everything you need to know", "who qualifies / how to apply", rebates,
  benefits, money, taxes, cost of living, "moving to X", best-of / rankings,
  food & drink guides, store openings ("is opening", Costco/Walmart), jobs &
  hiring, list posts. Categories: Money, Retail, Guide, Food & Drink,
  Best of Alberta.
- 🟡 **Mid RPM** — shareable news features and human-interest that pull traffic
  but don't compound (seasonal pieces, referendum/politics explainers, oddities).
- 🔴 **Low RPM (breaking / one-day)** — crime, death, murder, assault, charged,
  police, missing person, crash/collision, court, weather warnings, single-event
  news. Big spike, fast decay, low ad RPM, often brand-unsafe for advertisers.

Present a compact table: Title · Type · 🟢/🟡/🔴 · one-line reason.
Then a summary line: e.g. "1 of 5 was high-RPM utility; 3 were low-RPM breaking."

## Step 3 — Fold in Mediavine numbers (user pastes)

Ask the user to paste yesterday's Mediavine figures — per article if they have
it, otherwise the day's totals: **RPM, sessions/pageviews, earnings**. Don't
block on it; if they skip, give the verdict on classification alone and note the
numbers would sharpen it.

When numbers are given, compute what matters: earnings per article, RPM vs the
site average, and whether the 🔴 pieces actually earned despite the traffic.

## Step 4 — The verdict

Two or three sentences, direct and specific. Cover:

1. **Was the mix right?** Flag if most of the day went to 🔴 low-hanging breaking
   news while little/no 🟢 utility content shipped.
2. **What earned?** If Mediavine numbers are in, name the best and worst earner
   and the lesson.
3. **Today's move.** One concrete suggestion — usually "ship at least one
   evergreen utility piece" with a topic hook if an obvious gap exists (e.g. no
   Money/benefits piece in days).

Keep the standing rules in mind ([[editorial-content-values]]): never suggest
promoting festivals/concerts or anything haram. Be honest, not flattering — the
point is to catch wasted effort, not to reassure.
