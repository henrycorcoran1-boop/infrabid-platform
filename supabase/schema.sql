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
