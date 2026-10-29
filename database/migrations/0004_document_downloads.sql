-- Server-side download ledger: the free-tier export allowance.
--
-- The allowance (3 distinct documents per kind) was counted entirely in
-- localStorage, under the key `resume-co:downloads`. Clearing site data reset
-- the counter, so the free tier was effectively unlimited and the paywall
-- generated no pressure to subscribe at all. The premium flag lived in
-- localStorage too, under `resume-co:paywall`.
--
-- One row per (account, kind, document). The allowance is the number of
-- DISTINCT documents of a kind, not the number of downloads, because
-- re-downloading something you already exported has always been free - a user
-- who fixes a typo and downloads again should not be charged a second slot.
-- `count` therefore records repeats for support and analytics without affecting
-- the decision.
create table if not exists document_downloads (
  email       text   not null,
  kind        text   not null,              -- resume | coverLetter | resignationLetter
  document_id text   not null,
  first_at    bigint not null,              -- epoch ms of the first export
  last_at     bigint not null,              -- epoch ms of the most recent
  count       integer not null default 1,   -- total exports of this document
  primary key (email, kind, document_id),
  constraint document_downloads_kind_check
    check (kind in ('resume', 'coverLetter', 'resignationLetter'))
);

-- The allowance query is "how many distinct documents of this kind has this
-- account exported", which this index serves directly.
create index if not exists document_downloads_email_kind_idx
  on document_downloads (email, kind);

-- Same treatment every other public table gets: on Supabase a `public` table
-- with no RLS is readable by anyone holding the publishable anon key, and this
-- one would expose which documents each account has exported. Zero policies =
-- no access for anon/authenticated; our server connects as the table owner and
-- bypasses RLS. See 0001_supabase_hardening.sql for the full reasoning.
alter table public.document_downloads enable row level security;

do $$
declare r text;
begin
  for r in select unnest(array['anon', 'authenticated']) loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public.document_downloads from %I', r);
    end if;
  end loop;
end
$$;
