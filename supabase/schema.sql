-- InfraBid — Dashboard tenders table.
-- Run this once in your Supabase project's SQL Editor (Project → SQL Editor → New query).

create table if not exists public.tenders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  client text not null,
  value numeric not null default 0,
  deadline date,
  status text not null default 'Draft' check (status in ('Draft','Submitted','Won','Lost')),
  created_at timestamptz not null default now()
);

alter table public.tenders enable row level security;

create policy "Users can view their own tenders"
  on public.tenders for select
  using (auth.uid() = user_id);

create policy "Users can insert their own tenders"
  on public.tenders for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tenders"
  on public.tenders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own tenders"
  on public.tenders for delete
  using (auth.uid() = user_id);

-- InfraBid — Valuation Suite saved results.

create table if not exists public.valuations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  inputs jsonb not null,
  total numeric not null default 0,
  margin numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.valuations enable row level security;

create policy "Users can view their own valuations"
  on public.valuations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own valuations"
  on public.valuations for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own valuations"
  on public.valuations for delete
  using (auth.uid() = user_id);

-- InfraBid — AI Takeoff saved measurement schedules.
-- Note: only the extracted measurements (label/type/quantity) are stored —
-- the source PDF/image itself is never uploaded, matching the takeoff tool's
-- "nothing is uploaded" guarantee.

create table if not exists public.takeoffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  schedule jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.takeoffs enable row level security;

create policy "Users can view their own takeoffs"
  on public.takeoffs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own takeoffs"
  on public.takeoffs for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own takeoffs"
  on public.takeoffs for delete
  using (auth.uid() = user_id);
