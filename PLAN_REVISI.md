# Plan Revisi Math-Learn — Status Eksekusi

Tanggal: 23 Sep 2026 · Proyek: `mathlearn/` (Next.js 14 + Supabase + localStorage fallback)

Legenda: ✅ selesai & ter-build · ⏳ menunggu kredensial (Supabase & Vercel token)

---

## Fase 0 — Fondasi: Supabase & upload file ✅/⏳

| Item | Status |
|---|---|
| `supabase/migration-revisi.sql` (key `users`/`presence` di app_state, tabel `presence`, bucket `materi`) | ✅ |
| `app/api/upload/route.ts` — error eksplisit di production, fallback lokal hanya untuk dev, infer MIME dari ekstensi | ✅ (terverifikasi: production tanpa Supabase → pesan jelas; dev → local fallback jalan) |
| `.env.local` + env Vercel (3 kunci Supabase) | ⏳ butuh kunci dari user |
| Jalankan SQL migrasi + migrasi 4 PDF `public/uploads/` ke bucket | ⏳ butuh kunci / connection string |
| Redeploy kode terbaru ke Vercel (deployment lama masih versi lama — `/api/sync` 404 di sana) | ⏳ butuh Vercel token |

## Fase 1 — Sidebar terpisah + hapus "Kelola" ✅

- `components/shell.tsx` NAV: siswa = Beranda, Materi, **LKPD**, **Latihan**, **Evaluasi**, Nilai, Pengumuman; guru = … + Hasil siswa (menu **Kelola dihapus**); admin = … + Admin + Nilai siswa (Kelola dihapus). Bottom-nav mobile jadi scrollable (tidak ada menu terpotong).
- Route baru `/lkpd` & `/latihan` (komponen `components/assignment-list.tsx`); `/tugas` → redirect `/lkpd`; detail tetap `/tugas/[id]`.
- Modal diekstrak: `components/task-modal.tsx` + `components/material-modal.tsx`.
- Kelola tersebar: `/materi` (+ Materi, Ubah/Hapus), `/lkpd` (+ LKPD), `/latihan` (+ Latihan), `/evaluasi` (+ Evaluasi) — semua utk guru/admin; `/kelola` → redirect `/materi`; semua link `/kelola` diganti.

## Fase 2 — Foto & penilaian ✅

- **Foto guru**: field `Question.gambar` & `Assignment.deskripsiGambar` (`lib/types.ts`), upload via `components/question-image-upload.tsx` di TaskModal, dirender di `/tugas/[id]`, `/evaluasi/[id]` (pre-start + soal), `/periksa`.
- **Rotasi foto siswa oleh guru**: `Submission.fotoRotasi` (derajat per URL) + tombol ⟲/⟳ di modal periksa — tersimpan & disinkronkan.
- **Foto jawaban siswa**: komponen sudah ada; akar error (Vercel read-only tanpa Supabase) diperbaiki di Fase 0 — upload sekarang berhasil ke Supabase Storage saat env diisi.
- **Kode nama soal di /nilai**: "Soal N" (+ potongan teks) menggantikan `q-muaw3fdz-…`; tabel nilai admin menampilkan NISN/email, bukan raw id.

## Fase 3 — Konfirmasi & sapaan ✅

- Dialog **"Yakin mengumpulkan?"** (Modal) di `/tugas/[id]` (termasuk catatan "ditimpa" saat kumpulkan ulang) & tombol Kumpulkan manual `/evaluasi/[id]`. Timer auto-submit evaluasi TIDAK dibungkus konfirmasi.
- Seed `lib/seed.ts` sesuai CSV: nama lengkap 38 user (Agies Dwi Wendari … Yeni Oktaviana, guru **Ani** & **Dennis**, Admin); sapaan dashboard **"Halo, {nama lengkap}"** utk siswa, guru, dan admin.

## Fase 4 — Data pribadi & manajemen admin terpisah ✅

- `User` + `nisn`, `ttl` (Tempat+Tanggal), `fotoProfil` (NISN/TTL kosong di seed — diisi manual admin).
- `/admin`: tab **Siswa | Guru | Akun admin** terpisah, form via `components/user-modal.tsx` (Nama, Email, Password, Kelas, NISN, TTL, foto profil), tombol Ubah/Masuk sebagai/Hapus per baris.
- Login diperbaiki: cek `accounts` (bukan hanya seed) + user disinkron via `app_state` key `users` → akun buatan admin bisa login di device lain.

## Fase 5 — Monitoring ✅

- **User aktif**: heartbeat `/api/presence` tiap 15 dtk (hapus saat tab ditutup) → kartu "Pengguna aktif sekarang (n)" di `/admin` (aktif = last_seen < 60 dtk, dot hijau, role, umur heartbeat). Butuh Supabase untuk lintas device.
- **Status submit**: `components/submission-status.tsx` — badge "x/y mengumpulkan" + modal daftar per siswa (Sudah/Belum, waktu, nilai, NISN) di kartu `/lkpd`, `/latihan`, `/evaluasi` untuk guru/admin, tombol ke `/periksa`.

## Verifikasi

- `npm run build` ✅ (lint + type check, 25 route).
- Route: `/lkpd` 200, `/latihan` 200, `/tugas` 307→`/lkpd`, `/kelola` 307→`/materi`, `/api/sync` 200, `/api/presence` 200.
- Upload: production tanpa Supabase → error jelas (bukan "Gagal mengunggah file." generik); dev lokal → `storage=local` + `/api/files/...` 200.

## Sisa langkah eksternal (butuh dari pemilik akun)

1. Buat project Supabase → salin **Project URL**, **anon key**, **service_role** → tempel ke agent.
2. Jalankan `supabase/schema.sql` (bila belum) + `supabase/migration-revisi.sql` di SQL Editor — atau kirim connection string (Session pooler) agar bisa dijalankan otomatis.
3. Buat **Vercel token** (vercel.com → Account Settings → Tokens) → tempel ke agent.
4. Agent: isi env `.env.local` + env Vercel, migrasi 4 PDF ke bucket, `vercel --prod` deploy, tes upload end-to-end di https://math-learn-sand.vercel.app/.
