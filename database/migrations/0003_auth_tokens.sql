-- Account recovery and email verification.
--
-- Until now there was no password reset at all: a user who forgot their
-- password was permanently locked out of their own resumes, with no path back
-- except contacting support, which does not exist. That is the single most
-- common account operation on any site and its absence is a hard launch blocker.
--
-- One table serves both password reset and email verification, because they are
-- the same object - a single-use, expiring, email-bound secret - differing only
-- in what consuming it authorises.
--
-- The column is token_HASH, deliberately. The token itself is never stored. A
-- reset token is a password equivalent: anyone holding one can take the account.
-- Storing them in plaintext means a leaked backup, a log line, or read access to
-- this table hands over working reset links for every pending request. We store
-- sha256(token) and compare hashes, so the database never holds anything that
-- can be replayed. sha256 with no salt or stretching is correct here (unlike for
-- passwords): the input is 32 bytes of CSPRNG output, so there is no dictionary
-- to attack, and the lookup must stay a single indexed read.
create table if not exists auth_tokens (
  token_hash text primary key,              -- sha256 hex of the emailed token
  email      text not null,
  purpose    text not null,                 -- password_reset | email_verify
  expires_at bigint not null,               -- epoch ms
  used_at    bigint,                        -- epoch ms; null = unused
  created_at bigint not null,
  constraint auth_tokens_purpose_check
    check (purpose in ('password_reset', 'email_verify'))
);

-- Supports "invalidate every outstanding token for this email", which a
-- completed reset must do, and the per-email request throttle.
create index if not exists auth_tokens_email_purpose_idx
  on auth_tokens (email, purpose);

-- Supports pruning expired rows.
create index if not exists auth_tokens_expires_idx
  on auth_tokens (expires_at);

-- When the address was confirmed to be real and reachable; null = unverified.
-- Nullable and NOT enforced at sign-in on purpose: every account that already
-- exists predates verification, so gating login on it would lock out the whole
-- current user base.
alter table users
  add column if not exists email_verified_at bigint;

-- Same treatment every other public table gets. This one matters more than
-- most: PostgREST exposure of a table of reset tokens would be an account
-- takeover for every user with a pending reset. Zero policies = no access for
-- anon/authenticated; our server connects as the table owner and bypasses RLS.
-- See 0001_supabase_hardening.sql for the full reasoning.
alter table public.auth_tokens enable row level security;

do $$
declare r text;
begin
  for r in select unnest(array['anon', 'authenticated']) loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public.auth_tokens from %I', r);
    end if;
  end loop;
end
$$;
