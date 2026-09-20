-- Math-Learn · Supabase schema (PostgreSQL)
-- Jalankan di Supabase SQL Editor. Mode demo lokal tetap jalan tanpa ini.

create extension if not exists "uuid-ossp";

-- profiles terhubung ke auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  email text not null,
  role text not null check (role in ('siswa','guru','admin')),
  kelas text not null default 'VIII-A',
  created_at timestamptz default now()
);

create table if not exists materials (
  id uuid primary key default uuid_generate_v4(),
  judul text not null,
  kelas text not null default 'VIII-A',
  ringkasan text default '',
  konten text default '',
  video_url text,
  file_url text,
  file_name text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists assignments (
  id uuid primary key default uuid_generate_v4(),
  tipe text not null check (tipe in ('lkpd','latihan','evaluasi')),
  judul text not null,
  deskripsi text default '',
  kelas text not null default 'VIII-A',
  durasi_menit int,
  buka_at timestamptz,
  tutup_at timestamptz,
  acak_soal boolean default false,
  kunci_tab boolean default false,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists questions (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  tipe text not null check (tipe in ('pg','uraian','essay')),
  teks text not null,
  opsi jsonb default '[]',
  kunci text default '',
  rubrik text default '',
  bobot int not null default 25
);

create table if not exists submissions (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  siswa_id uuid not null references profiles(id) on delete cascade,
  jawaban jsonb default '{}',
  nilai int,
  feedback_ai jsonb default '{}',
  feedback_guru text default '',
  status text not null default 'menunggu' check (status in ('menunggu','draf-ai','dinilai')),
  cheat_count int default 0,
  submitted_at timestamptz default now()
);

create table if not exists cheat_logs (
  id uuid primary key default uuid_generate_v4(),
  evaluation_id uuid references assignments(id) on delete cascade,
  siswa_id uuid references profiles(id) on delete cascade,
  siswa_nama text,
  tipe text default 'visibility',
  meta jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists announcements (
  id uuid primary key default uuid_generate_v4(),
  judul text not null,
  isi text default '',
  target_kelas text default 'VIII-A',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  broadcast text default 'none' check (broadcast in ('none','all','all-siswa','all-guru')),
  kategori text default 'info',
  judul text not null,
  isi text default '',
  dibaca boolean default false,
  created_at timestamptz default now()
);

create table if not exists academic_events (
  id uuid primary key default uuid_generate_v4(),
  judul text not null,
  tanggal date not null,
  deskripsi text default ''
);

-- Realtime untuk notifikasi + laporan kecurangan
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table cheat_logs;
alter publication supabase_realtime add table submissions;

-- RLS minimal (aktifkan + kebijakan baca publik demo; perketat untuk produksi)
alter table profiles enable row level security;
alter table materials enable row level security;
alter table assignments enable row level security;
alter table questions enable row level security;
alter table submissions enable row level security;
alter table cheat_logs enable row level security;
alter table announcements enable row level security;
alter table notifications enable row level security;
alter table academic_events enable row level security;

create policy "read_all_demo" on materials for select using (true);
create policy "read_all_demo" on assignments for select using (true);
create policy "read_all_demo" on questions for select using (true);
create policy "read_all_demo" on announcements for select using (true);
create policy "read_all_demo" on academic_events for select using (true);
