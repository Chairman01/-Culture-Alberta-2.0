# Supabase SQL - Which Scripts Do You Need?

You have many SQL files in `.claude/` and elsewhere. **You only need one.**

## For Comments

**Run once:** `supabase/COMMENTS-SETUP.sql` in the Supabase SQL Editor.

That file creates the `comments` table, indexes, RLS policies, and permissions. It replaces all the older scripts like:
- `create-comments-table.sql`
- `fix-comments-rls-*.sql`
- `SIMPLE-DISABLE-RLS.sql`
- `RESET-COMMENTS-RLS.sql`
- etc.

## If Comments Still Don't Work

1. **Supabase Auth** – Make sure Auth is enabled in your project (it usually is).
2. **Email confirmations** – If you have "Confirm email" on, users must verify their email before they can sign in.
3. **RLS** – The setup script enables RLS. If you previously disabled it with `SIMPLE-DISABLE-RLS.sql`, re-run `COMMENTS-SETUP.sql` to restore correct policies.

## Other SQL Files

- **Articles / Events / Analytics** – Use any scripts from your project that create those tables. They're separate from comments.
- **`.claude/` SQL files** – These are old iterations. You can archive or delete them; `COMMENTS-SETUP.sql` supersedes the comment-related ones.
