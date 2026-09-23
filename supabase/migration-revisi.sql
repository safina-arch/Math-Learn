-- Math-Learn · Migrasi revisi (jalankan SETELAH schema.sql & sync-migration.sql)
-- Isi: key baru di app_state (users), tabel presence untuk "pengguna aktif", bucket materi.

-- 1) Tambah key baru di app_state: users + presence
do $$
declare c text;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'app_state'::regclass and contype = 'c';
  if c is not null then
    execute format('alter table app_state drop constraint %I', c);
  end if;
end $$;

alter table app_state
  add constraint app_state_key_check
  check (key in ('materials','assignments','submissions','announcements','notifications','cheatLogs','events','users','presence'));

-- 2) Kehadiran user (untuk daftar "pengguna aktif sekarang" di halaman admin)
create table if not exists presence (
  user_id  text primary key,
  nama     text not null default '',
  role     text not null default '',
  last_seen timestamptz not null default now()
);

alter table presence enable row level security;
drop policy if exists "read_all_demo" on presence;
create policy "read_all_demo" on presence for select using (true);

-- 3) Bucket penyimpanan file (public) — idempotent
insert into storage.buckets (id, name, public)
values ('materi', 'materi', true)
on conflict (id) do update set public = true;
