-- Math-Learn · Migrasi key LKPD (jalankan SETELAH migration-revisi.sql)
-- Masalah: constraint app_state hanya mengizinkan 9 key lama, sehingga POST
-- lkpdTopics / lkpdProgress selalu ditolak Postgres (500 "violates check constraint
-- app_state_key_check") → nilai LKPD tidak pernah sampai ke guru & admin.
--
-- Catatan: rilis berjalan sudah menyiasatinya di server (app/api/sync/route.ts)
-- dengan menyimpan dua key LKPD di dalam key `presence`. Migrasi ini opsional —
-- jalankan bila ingin key LKPD berdiri sendiri di tabel app_state.

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
  check (key in ('materials','assignments','submissions','announcements','notifications',
                 'cheatLogs','events','users','presence','lkpdTopics','lkpdProgress'));
