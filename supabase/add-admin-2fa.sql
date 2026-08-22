-- Two-factor authentication for admin accounts.
--
-- Safe to run at any time, before or after the code deploy: purely additive,
-- and every column defaults to "2FA off", so nothing changes for anyone until
-- they deliberately turn it on from /admin/security.
--
-- Why
-- ---
-- A password alone was the whole of admin access, and admin access means
-- publishing, deleting and sending to ~1,700 people. Rate limiting slows
-- guessing; it does nothing about a password that leaks some other way -- reused
-- on another site, typed on a shared machine, or phished. A second factor is
-- what makes a stolen password insufficient on its own.
--
-- Writers are deliberately not covered. They cannot publish, delete or send, and
-- a daily login step for them is friction without much to protect.

BEGIN;

ALTER TABLE public.admin_users
  -- Base32 TOTP secret. Present but with totp_enabled = false means enrolment
  -- was started and never confirmed, which must not gate a login.
  ADD COLUMN IF NOT EXISTS totp_secret       text,
  ADD COLUMN IF NOT EXISTS totp_enabled      boolean NOT NULL DEFAULT false,
  -- bcrypt hashes of single-use recovery codes, never the codes themselves.
  -- Without these, one lost phone locks someone out of their own site for good.
  ADD COLUMN IF NOT EXISTS totp_backup_codes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS totp_enabled_at   timestamptz;

COMMIT;

-- ── Note on the owner account ───────────────────────────────────────────────
-- The owner signs in from ADMIN_USERNAME / ADMIN_PASSWORD and has no row here,
-- so their secret lives in the ADMIN_TOTP_SECRET environment variable instead.
-- Generate it at /admin/security and paste it into Vercel.
--
-- That is also the recovery path: losing the phone means deleting
-- ADMIN_TOTP_SECRET from Vercel, which is why the owner account needs no backup
-- codes. Anyone who can do that already controls the deployment.
