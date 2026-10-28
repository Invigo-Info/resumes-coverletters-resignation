-- 0001_supabase_hardening
--
-- Close the one risk Supabase has that a plain Postgres host (Neon, RDS) does
-- not: every table in the `public` schema is automatically published through
-- Supabase's auto-generated REST API (PostgREST), reachable with the project's
-- `anon` key. That key is publishable by design - it ships in client code and
-- is visible to anyone. A table in `public` with Row Level Security disabled is
-- therefore world-readable to anyone who knows the project URL.
--
-- All six tables here hold personal data: account rows with password hashes,
-- resume and letter contents, subscription state, saved jobs. None of it may be
-- reachable that way.
--
-- This app NEVER uses the Supabase client, the anon key, or PostgREST. It
-- connects directly over DATABASE_URL as the project's `postgres` role, which
-- owns these tables. A table owner bypasses RLS (there is no FORCE ROW LEVEL
-- SECURITY here), so enabling RLS with ZERO policies denies PostgREST while
-- leaving this application's access completely unchanged. That is exactly the
-- intent: deny the door we do not use, keep the one we do.
--
-- IF THIS LOCKS THE APP OUT (every query starts returning no rows), it means
-- the connection role is neither the table owner nor BYPASSRLS. Roll back with:
--     alter table public.users disable row level security;   -- and each table
-- then investigate which role DATABASE_URL actually authenticates as.
--
-- Portable: the RLS statements run on any Postgres. The grant revocations are
-- wrapped in existence checks so this migration is a safe no-op on a host that
-- has no `anon` / `authenticated` roles.

-- 1. Deny PostgREST by enabling RLS with no policies attached.
alter table public.users              enable row level security;
alter table public.documents          enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.saved_jobs         enable row level security;
alter table public.tailoring_sessions enable row level security;
alter table public.dismissed_jobs     enable row level security;

-- 2. Belt and braces: remove the table grants Supabase gives the public-facing
--    roles by default, so the tables are unreachable even if RLS were later
--    disabled by accident from the dashboard. Guarded so non-Supabase hosts are
--    unaffected.
--    Note on default privileges: ALTER DEFAULT PRIVILEGES only affects grants
--    made BY the role running it. Supabase's defaults may have been set by
--    supabase_admin, in which case that part is a no-op and future tables in
--    public could still be granted to anon. RLS (step 1) is the protection that
--    matters; treat this step as hardening, and enable RLS on any table added
--    later. The verification query in scripts/db-migrate.mjs reports any public
--    table left without RLS.
do $$
declare
  t text;
  r text;
begin
  for r in select unnest(array['anon', 'authenticated']) loop
    if exists (select 1 from pg_roles where rolname = r) then
      for t in select unnest(array[
        'users', 'documents', 'subscriptions',
        'saved_jobs', 'tailoring_sessions', 'dismissed_jobs'
      ]) loop
        execute format('revoke all on table public.%I from %I', t, r);
      end loop;
      -- Wrapped: default privileges may have been granted by another role
      -- (supabase_admin), in which case this cannot revoke them. That must not
      -- abort the migration - step 1 is the protection that counts.
      begin
        execute format(
          'alter default privileges in schema public revoke all on tables from %I', r
        );
      exception when others then
        raise notice 'default privileges unchanged for %: %', r, sqlerrm;
      end;
    end if;
  end loop;
end
$$;
