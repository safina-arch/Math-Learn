# Math-Learn — Deploy ke Vercel (gratis)

Stack: Next.js 14 App Router + Tailwind + Supabase + Gemini (`gemini-1.5-flash`).

## 1. Coba lokal
```bash
npm install
npm run dev
# buka http://localhost:3000
```
Login menggunakan username/kode dan password yang diberikan sekolah.
Tanpa `.env`, aplikasi memakai data lokal (localStorage) + AI heuristik.

## 2. Supabase untuk produksi
1. Buat project di supabase.com → salin **Project URL** + **anon key** (+ **service_role** opsional).
2. Buka SQL Editor → jalankan `supabase/schema.sql`.
3. Jalankan juga `supabase/migration-revisi.sql` (key `users`/`presence` di `app_state`, tabel kehadiran, bucket `materi` public).
4. Buat 3 user di Authentication, lalu insert ke `profiles` dengan id yang sama:
```sql
insert into profiles (id, nama, email, role, kelas) values
 ('<uuid-siswa>','Aisyah Putri','siswa@demo.id','siswa','VIII-A'),
 ('<uuid-guru>','Ibu Ratna','guru@demo.id','guru','VIII'),
 ('<uuid-admin>','Admin','admin@demo.id','admin','-');
```
5. (Opsional) Aktifkan Storage bucket `materi` untuk file PDF guru.

## 3. Gemini AI (opsional)
1. Ambil key di Google AI Studio.
2. Isi `GEMINI_API_KEY`. Tanpa key, `/api/ai/grade` otomatis memakai heuristik lokal.

## 4. Deploy Vercel```bash
git init && git add -A && git commit -m "mathlearn ready"
# push ke GitHub, lalu di vercel.com → Add New Project → Import
```
Env di Vercel → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (opsional)
- `GEMINI_API_KEY` (opsional)

Build command default `npm run build`. Region `sin1` sudah diset di `vercel.json`.

## 5. Penyimpanan file (PDF/gambar materi)

| Mode | Soal & materi (teks) | File PDF/gambar |
|---|---|---|
| Lokal/demo (`npm run dev`, tanpa env) | Browser `localStorage` | Folder **`public/uploads/`** di laptop, disajikan via `/api/files/...` (maks 10 MB, PDF/PNG/JPG/WebP) |
| Produksi + Supabase | Tabel Postgres | Bucket Storage `materi` (otomatis bila env Supabase diisi; buat bucket `materi` public di dashboard Supabase) |

Catatan:
- di Vercel, file lokal tidak persisten (filesystem read-only/ephemeral) — **upload akan menolak dengan pesan jelas** jika env Supabase belum diisi. Untuk produksi wajib isi env Supabase + jalankan `supabase/migration-revisi.sql`.
- Menu lama berubah: **Tugas → LKPD (`/lkpd`) + Latihan (`/latihan`)**, menu **Kelola dihapus** (kelolaan ada di tiap halaman Materi/LKPD/Latihan/Evaluasi untuk guru & admin).

## 6. Checklist PRD
- [x] Dashboard siswa/guru/admin + progres + tenggat + pengumuman
- [x] Materi teks/video/PDF + unduhan
- [x] LKPD + Latihan (PG auto-graded, uraian/essay draf AI)
- [x] Evaluasi: timer, jadwal, acak soal, kunci tab, visibility/blur detect + timestamp + laporan guru
- [x] Notifikasi lonceng internal + kategori per peran
- [x] AI grading Gemini + fallback, guru approve/edit/override
- [x] Ekspor CSV `No | Nama | Kelas | Nilai`
- [x] Admin CRUD + impersonasi + statistik + kalender
- [x] Responsif (sidebar desktop, bottom-nav mobile) + SEO meta
