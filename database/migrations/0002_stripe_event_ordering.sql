-- Stripe webhook correctness: at-most-once processing, and immunity to
-- out-of-order delivery.
--
-- Two separate problems, two separate mechanisms.
--
-- 1. DUPLICATE delivery. Stripe retries a webhook until it gets a 2xx, and it
--    explicitly documents that an event may be delivered more than once even
--    after a success. Every handler here must therefore be safe to run twice.
--    Most are naturally idempotent (they set a status), but the receipt email
--    is NOT - a retry sends the customer a second receipt for one payment.
--    `processed_events` records each event id the moment it is accepted, so a
--    replay is recognised and dropped.
--
-- 2. OUT-OF-ORDER delivery. Stripe does not guarantee ordering. A
--    `customer.subscription.updated` (status active) generated BEFORE a
--    `customer.subscription.deleted` can arrive AFTER it, and the late write
--    silently resurrects a cancelled subscription - the customer keeps premium
--    they cancelled and stopped paying for. `subscriptions.last_event_at`
--    records the Stripe event's own `created` time, so a handler can refuse to
--    apply an event older than the one already applied.
create table if not exists processed_events (
  id           text primary key,        -- Stripe event id (evt_...)
  type         text not null,
  processed_at bigint not null          -- epoch ms, when we accepted it
);

-- Retention housekeeping: the table only needs to cover Stripe's retry window
-- (up to ~3 days), but it is tiny, so rows are pruned opportunistically by the
-- webhook rather than by a scheduled job we would have to operate.
create index if not exists processed_events_processed_at_idx
  on processed_events (processed_at);

-- Epoch ms of the Stripe event whose state is currently stored. Nullable: rows
-- written before this migration have no known event time, and are treated as
-- "older than anything", so the next event always applies.
alter table subscriptions
  add column if not exists last_event_at bigint;

-- Same treatment every other public table gets: Supabase exposes `public`
-- through PostgREST with the publishable anon key, so a table with no RLS is
-- readable by anyone holding a key that ships in the browser. Zero policies =
-- no access for anon/authenticated; our server connects as the table owner,
-- which bypasses RLS. See 0001_supabase_hardening.sql for the full reasoning.
alter table public.processed_events enable row level security;

do $$
declare r text;
begin
  for r in select unnest(array['anon', 'authenticated']) loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public.processed_events from %I', r);
    end if;
  end loop;
end
$$;
