-- Stop a pageview from counting as a content change.
--
-- Symptom: Bing's SEO best-practice report kept flagging the newest articles
-- under "sitemaps ... include all relevant URLs published (added or updated)",
-- even though every flagged URL was demonstrably present in sitemap.xml at the
-- time the report was read.
--
-- Cause: every article URL in the sitemap carried a <lastmod> inside the last
-- 48 hours -- 399 stamped 2026-08-31, 150 on 09-01, 204 on 09-02, out of 753
-- article URLs, with not one older. sitemap.xml takes <lastmod> from
-- articles.updated_at, and the generic set_updated_at() trigger fired on ANY
-- update to the row. Two counters write to that row constantly:
--
--   * increment_view_count() -- once per article page load
--   * the IndexNow sweeper's indexnow_submitted_at stamp
--
-- So updated_at meant "last time somebody loaded this page", the sitemap told
-- crawlers the entire site had changed within two days, and nothing in it
-- identified which URLs were genuinely new.
--
-- Fix: compare the row against its previous state with the counter columns
-- masked out. If nothing a reader would see changed, updated_at is left where
-- it was. The generic set_updated_at() is untouched and still serves the other
-- tables that use it.
--
-- Revert with:
--   DROP TRIGGER set_updated_at_articles ON public.articles;
--   CREATE TRIGGER set_updated_at_articles BEFORE UPDATE ON public.articles
--     FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION public.set_updated_at_articles()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  -- updated_at itself is masked so a caller passing an explicit value cannot
  -- make the row look changed; search_tsv is derived, never authored.
  ignored text[] := ARRAY['updated_at', 'view_count', 'indexnow_submitted_at', 'search_tsv'];
BEGIN
  IF to_jsonb(new) - ignored = to_jsonb(old) - ignored THEN
    new.updated_at = old.updated_at;
    RETURN new;
  END IF;

  new.updated_at = now();
  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS set_updated_at_articles ON public.articles;

CREATE TRIGGER set_updated_at_articles
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_articles();
