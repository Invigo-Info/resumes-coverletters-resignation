-- Resumewriter.ai database schema (Neon / Vercel Postgres).
-- Mirrors the shapes previously stored in .data/users.json and
-- .data/documents.json so the file-store -> Postgres switch is a drop-in.
-- Apply once: `node scripts/db-setup.mjs` (or paste into the Neon SQL console).

create table if not exists users (
  id            text primary key,
  email         text unique not null,      -- stored normalized (trimmed + lowercased)
  name          text not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

create table if not exists documents (
  id          text not null,               -- client-owned document id
  -- Keyed by the owner's email, matching the file store. Intentionally NOT a
  -- foreign key to users(email): Google / OAuth accounts authenticate without a
  -- stored users row, yet legitimately own documents, so a FK would block them
  -- from saving. Ownership is enforced at the app layer (queries scope by the
  -- session email).
  email       text not null,
  type        text not null check (type in ('resumes','coverLetters','resignationLetters','interviewPrep')),
  title       text not null,
  template_id text,
  data        jsonb not null,              -- the client-owned document blob, stored as-is
  updated_at  bigint not null,             -- epoch milliseconds (matches StoredDocument.updatedAt)
  primary key (email, type, id)
);

create index if not exists documents_email_updated_idx
  on documents (email, updated_at desc);

-- Server-side entitlement (the source of truth for "premium"), driven by the
-- Stripe webhook. Keyed by the account email; no FK (OAuth users, same as documents).
create table if not exists subscriptions (
  email                  text primary key,
  stripe_customer_id     text,
  stripe_subscription_id text,
  status                 text not null default 'inactive',  -- active|trialing|past_due|canceled|inactive
  plan                   text,
  current_period_end     bigint,                            -- epoch ms
  updated_at             bigint not null
);

create index if not exists subscriptions_customer_idx
  on subscriptions (stripe_customer_id);

-- Saved jobs, so a user's saved postings follow their account across devices
-- (previously localStorage-only). Keyed by the owner's email + the job id; the
-- full posting is stored as-is so the Saved tab survives role switches and
-- regeneration. No FK, same reasoning as documents/subscriptions (OAuth users).
create table if not exists saved_jobs (
  email    text not null,
  job_id   text not null,               -- JobPosting.id
  job      jsonb not null,              -- the full JobPosting snapshot, stored as-is
  saved_at bigint not null,             -- epoch milliseconds
  primary key (email, job_id)
);

create index if not exists saved_jobs_email_saved_idx
  on saved_jobs (email, saved_at desc);

-- Durable "Tailor your resume" sessions, so a user's tailoring progress (chosen
-- keywords, applied/skipped suggestions, live scores) survives payment redirects,
-- share popups, reloads, and follows the account across devices. The full session
-- is stored as one jsonb snapshot, keyed by owner email + session id. No FK, same
-- OAuth reasoning as the other tables.
create table if not exists tailoring_sessions (
  email      text not null,
  id         text not null,              -- session id (tailor_<jobId>)
  resume_id  text not null,
  job_id     text not null,
  session    jsonb not null,             -- full TailoringSession snapshot, stored as-is
  updated_at bigint not null,            -- epoch milliseconds
  primary key (email, id)
);

create index if not exists tailoring_sessions_email_updated_idx
  on tailoring_sessions (email, updated_at desc);

-- Dismissed ("Not interested") jobs, so the hidden-from-Recommended list + the
-- reason follow the account (the companion to saved_jobs). Keyed by owner email
-- + job id; no full posting is stored (dismissal only needs the id). No FK, same
-- OAuth reasoning as the other tables.
create table if not exists dismissed_jobs (
  email        text not null,
  job_id       text not null,
  reason       text,
  dismissed_at bigint not null,
  primary key (email, job_id)
);

create index if not exists dismissed_jobs_email_idx
  on dismissed_jobs (email);

-- Drop the old foreign key if a previous run created the table with it (the FK
-- broke OAuth users, who have no users row). Safe no-op on a fresh database.
alter table documents drop constraint if exists documents_email_fkey;

-- Widen the document type check to include saved interview-prep sheets. Runs on
-- existing databases where `create table if not exists` above did not (the table
-- already existed with the old 3-value constraint).
alter table documents drop constraint if exists documents_type_check;
alter table documents add constraint documents_type_check
  check (type in ('resumes','coverLetters','resignationLetters','interviewPrep'));
