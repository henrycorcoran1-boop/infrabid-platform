-- ============================================================================
-- Egis Ireland Project Radar — schema
--
-- A shared reference register of live roads and urban transport schemes on the
-- island of Ireland, the evidence behind each one, and a daily harvest of new
-- mentions that feeds the 07:00 email.
--
-- Read model: any signed-in user reads the register. Nothing here is written
-- from the browser — the register and the feed are maintained by the
-- egis-harvest / egis-digest edge functions running with the service role.
-- The one exception is a user's own digest subscription, which they own.
--
-- Apply with the Supabase MCP (apply_migration) or paste into
-- Project -> SQL Editor -> New query. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------- register --

create table if not exists public.egis_projects (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  name           text not null,
  client         text,
  mode           text not null default 'Other',
  county         text,
  region         text,
  status         text,
  scheme_phase   text,
  egis_role      text,
  egis_entity    text,
  partners       text,
  value_eur      numeric,
  value_note     text,
  key_dates      text,
  why_it_matters text,
  -- How this scheme relates to Egis. 'confirmed' means a retrievable source
  -- explicitly places Egis on it; 'market_map' means the scheme is live but
  -- Egis involvement is not evidenced; 'opportunity' means it is not yet
  -- procured. The dashboard never blurs these three.
  involvement    text not null default 'market_map'
                 check (involvement in ('confirmed','market_map','opportunity')),
  confidence     text not null default 'LOW'
                 check (confidence in ('HIGH','MEDIUM','LOW')),
  verbatim_quote text,
  sort_rank      int  not null default 100,
  is_live        boolean not null default true,
  first_seen     date not null default current_date,
  last_verified  date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.egis_projects is
  'Live Irish/NI roads and urban transport schemes. involvement separates Egis-confirmed work from the wider market map and the forward pipeline — never conflate them.';
comment on column public.egis_projects.involvement is
  'confirmed = a source explicitly names Egis on this scheme. market_map = live scheme, Egis involvement unproven. opportunity = not yet procured.';
comment on column public.egis_projects.value_eur is
  'Normalised to EUR. What the figure refers to (scheme capex vs consultancy fee) is in value_note — the two are not comparable.';

create index if not exists egis_projects_involvement_idx on public.egis_projects (involvement);
create index if not exists egis_projects_mode_idx        on public.egis_projects (mode);
create index if not exists egis_projects_live_idx        on public.egis_projects (is_live);

-- ---------------------------------------------------------------- evidence --

-- One row per citation. A project with no rows here is an assertion, not a
-- finding, and the dashboard marks it as such.
create table if not exists public.egis_project_sources (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.egis_projects(id) on delete cascade,
  url          text not null,
  title        text,
  publisher    text,
  source_type  text not null default 'News',
  published_on date,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (project_id, url)
);

comment on table public.egis_project_sources is
  'The evidence behind each register entry: TED and eTenders notices, scheme websites, planning records, press. Deep links only.';

create index if not exists egis_project_sources_project_idx on public.egis_project_sources (project_id);

-- -------------------------------------------------------------- daily feed --

-- What the harvester found. The digest emails the rows where mentions_egis is
-- true and emailed_at is still null, then stamps them.
create table if not exists public.egis_feed_items (
  id            uuid primary key default gen_random_uuid(),
  fingerprint   text unique not null,
  title         text not null,
  url           text not null,
  summary       text,
  publisher     text,
  source_type   text not null default 'News',
  published_on  date,
  mentions_egis boolean not null default false,
  project_id    uuid references public.egis_projects(id) on delete set null,
  matched_terms text[] not null default '{}',
  discovered_at timestamptz not null default now(),
  emailed_at    timestamptz
);

comment on table public.egis_feed_items is
  'Harvested mentions, deduped on fingerprint so a story syndicated across outlets is emailed once.';
comment on column public.egis_feed_items.emailed_at is
  'Stamped when a digest includes the item. The unsent queue is where this is null — that is what makes the job idempotent if it runs twice.';

create index if not exists egis_feed_unsent_idx on public.egis_feed_items (mentions_egis, emailed_at)
  where emailed_at is null;
create index if not exists egis_feed_published_idx on public.egis_feed_items (published_on desc);

-- ----------------------------------------------------------- subscriptions --

create table if not exists public.egis_watch_subscriptions (
  user_id                 uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  email                   text not null,
  active                  boolean not null default true,
  include_egis_mentions   boolean not null default true,
  include_procurement     boolean not null default false,
  include_status_changes  boolean not null default false,
  include_competitors     boolean not null default false,
  send_hour_dublin        int not null default 7 check (send_hour_dublin between 0 and 23),
  last_sent_at            timestamptz,
  created_at              timestamptz not null default now()
);

comment on table public.egis_watch_subscriptions is
  'Who gets the Egis radar email and what they want in it. Hour is Dublin local — the job runs on both sides of the DST boundary and sends on the one that matches.';

-- -------------------------------------------------------------- run ledger --

create table if not exists public.egis_digest_runs (
  id            uuid primary key default gen_random_uuid(),
  ran_at        timestamptz not null default now(),
  kind          text not null default 'digest',
  items_found   int not null default 0,
  emails_sent   int not null default 0,
  detail        jsonb not null default '{}'::jsonb
);

comment on table public.egis_digest_runs is
  'One row per harvest or digest run. Answers "did the 7am job actually go out, and what did it find" without reading function logs.';

-- --------------------------------------------------------------------- RLS --

alter table public.egis_projects            enable row level security;
alter table public.egis_project_sources     enable row level security;
alter table public.egis_feed_items          enable row level security;
alter table public.egis_watch_subscriptions enable row level security;
alter table public.egis_digest_runs         enable row level security;

-- The register is shared reading for signed-in users. Writes are service-role
-- only, which bypasses RLS — so the absence of a write policy is the control,
-- not an oversight.
drop policy if exists "Signed-in users read the register" on public.egis_projects;
create policy "Signed-in users read the register"
  on public.egis_projects for select
  to authenticated
  using (true);

drop policy if exists "Signed-in users read the evidence" on public.egis_project_sources;
create policy "Signed-in users read the evidence"
  on public.egis_project_sources for select
  to authenticated
  using (true);

drop policy if exists "Signed-in users read the feed" on public.egis_feed_items;
create policy "Signed-in users read the feed"
  on public.egis_feed_items for select
  to authenticated
  using (true);

drop policy if exists "Signed-in users read run history" on public.egis_digest_runs;
create policy "Signed-in users read run history"
  on public.egis_digest_runs for select
  to authenticated
  using (true);

drop policy if exists "Users read their own subscription" on public.egis_watch_subscriptions;
create policy "Users read their own subscription"
  on public.egis_watch_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users create their own subscription" on public.egis_watch_subscriptions;
create policy "Users create their own subscription"
  on public.egis_watch_subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update their own subscription" on public.egis_watch_subscriptions;
create policy "Users update their own subscription"
  on public.egis_watch_subscriptions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete their own subscription" on public.egis_watch_subscriptions;
create policy "Users delete their own subscription"
  on public.egis_watch_subscriptions for delete
  to authenticated
  using (auth.uid() = user_id);

-- ------------------------------------------------------------- updated_at --

create or replace function public.egis_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists egis_projects_touch on public.egis_projects;
create trigger egis_projects_touch
  before update on public.egis_projects
  for each row execute function public.egis_touch_updated_at();
