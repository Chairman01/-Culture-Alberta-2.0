-- Adds a 'started' state to the job application tracker.
--
-- Until now, clicking "Apply" recorded the job as 'applied' immediately. That
-- overstates what we actually know: the click opens the employer's form in a
-- new tab and we never learn whether it was submitted, so anyone who bailed on
-- a long Workday application was still counted as having applied. The tracker
-- was answering "did you click apply" while presenting itself as "did you
-- apply".
--
-- 'started' is what a click genuinely proves. The posting page asks for
-- confirmation on the next visit and only then promotes the row to 'applied'.
--
-- Additive and reversible: existing rows keep their status, and the five
-- original values remain legal.

alter table public.saved_jobs
  drop constraint if exists saved_jobs_status_check;

alter table public.saved_jobs
  add constraint saved_jobs_status_check
  check (status = any (array[
    'saved'::text,
    'started'::text,
    'applied'::text,
    'interviewing'::text,
    'offer'::text,
    'rejected'::text
  ]));
