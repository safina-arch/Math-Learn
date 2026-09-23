-- Jalankan sekali di Supabase SQL Editor untuk sinkronisasi lintas perangkat.
create table if not exists public.app_state (
  key text primary key check (key in ('materials','assignments','submissions','announcements','notifications','cheatLogs','events')),
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Tidak ada policy publik: tabel hanya diakses API server dengan service role.
-- Bucket public dibutuhkan agar lampiran dapat dibuka siswa melalui public URL.
insert into storage.buckets (id, name, public)
values ('materi', 'materi', true)
on conflict (id) do update set public = true;
