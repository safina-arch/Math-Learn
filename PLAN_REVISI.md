# Plan Revisi Math-Learn — Status Eksekusi

Tanggal: 23–24 Sep 2026 · Proyek: `mathlearn/` (Next.js 14 + Supabase + localStorage fallback)
**Status: Gelombang 1 SELESAI & LIVE · Gelombang 2 (10 revisi) SELESAI — build lokal lulus, menunggu deploy**

Legenda: ✅ selesai & terverifikasi · ⏳ menunggu kredensial (Supabase & Vercel token)

---

## Gelombang 2 — 10 revisi lanjutan (24 Sep 2026) ✅ (build lulus, 26 route)

| # | Revisi | Implementasi |
|---|---|---|
| 1 | Jadwal (mapel/hari/jam) + kalender akademik (UTS/UAS/hari penting), bisa diedit admin, tampil ke siswa & guru | `AcademicEvent` diperluas (`jenis`, `hari`, `jamMulai/jamSelesai`, `kategori`) di `lib/types.ts`; resource `events` lama tetap dipakai (tanpa migrasi SQL); halaman baru **`/jadwal`** (`app/jadwal/page.tsx`) — tabel jadwal per hari + daftar agenda; form tambah/ubah/hapus khusus admin; menu **Jadwal** di nav siswa/guru/admin (`components/shell.tsx`); kartu "Jadwal hari ini" + "Kalender akademik" di dashboard siswa & guru; `/admin` kartu kalender → tautan "Kelola jadwal & kalender"; seed `SEED_EVENTS` (6 jadwal + 4 agenda contoh) |
| 2 | Hilangkan "Rata-rata" di nilai siswa | Kartu Rata-rata + `Progress` dihapus dari `app/nilai/page.tsx` |
| 3 | Siswa hanya lihat skor terakhir yang sudah diperiksa guru | `/nilai` (siswa) hanya tampilkan kiriman `status === "dinilai"` terbaru + kartu "Menunggu pemeriksaan"; dashboard siswa "Skor terakhir" juga difilter yang sudah diperiksa |
| 4 | Status tugas 3 tingkat (belum mengerjakan / belum diperiksa / sudah diperiksa) di guru & admin | Helper `statusTugas` + `STATUS_TUGAS_META` + `statusRingkasan` di `lib/utils.ts`; badge per baris di `/periksa`, `/nilai` (admin), dashboard guru, modal `components/submission-status.tsx` (+ ringkasan hitungan 3 status); 3 kartu Stat ringkasan di `/periksa` |
| 5 | Hapus "Umpan balik terakhir" dari dashboard siswa | Kartu dihapus di `app/dashboard/page.tsx` |
| 6 | Teks soal bisa multiline (Enter) saat menambah soal/LKPD/latihan/evaluasi | `input` → `textarea min-h-[68px]` di `components/task-modal.tsx` |
| 7 | Sembunyikan "Pelanggaran pindah tab:" dari siswa saat evaluasi (tetap tampil guru/admin); peringatan sistem tetap ada | Baris counter dibungkus `user?.role !== "siswa"` di `app/evaluasi/[id]/page.tsx`; modal "Peringatan sistem" + hitungan tetap untuk semua role |
| 8 | Foto siswa saat evaluasi ditandai "menambahkan foto", bukan kecurangan | `photoGrace` (15 dtk) menahan deteksi blur/visibility saat dialog file terbuka (`onActivity` di `components/answer-upload.tsx`); penambahan foto dicatat sebagai `CheatLog.tipe = "foto"` + notifikasi "menambahkan foto" ke guru (bukan laporan kecurangan); `cheatCount` submission tidak ikut naik |
| 9 | Nilai maksimal 100 | Clamp di publish `/periksa` (nilai akhir + skor AI per soal), input nilai & persentase AI dibatasi 0–100 saat diketik; API AI sudah clamp; submit tugas/evaluasi sudah clamp |
| 10 | Laporan kecurangan: daftar nama peserta + tombol detail (jenis, menit kejadian, nomor soal) | `/periksa` dikelompokkan per siswa (avatar + jumlah kejadian + tombol "Lihat detail") → modal tabel: jenis (`cheatLabel`, foto = biru), menit ke-…, nomor soal, evaluasi, waktu; `menit` dihitung dari `startedAt` (disimpan di `CheatLog.menit` + `meta.menit` di `/api/cheat-log`); dashboard guru menampilkan label human-readable + menit |

Verifikasi: `npm.cmd run build` ✅ lulus (lint + type check, 26 route, termasuk `/jadwal`). Belum di-push (menunggu verifikasi akhir → deploy).

---

## Fase 0 — Fondasi: Supabase & upload file ✅ (SELESAI 23 Sep 2026)

| Item | Status |
|---|---|
| `supabase/migration-revisi.sql` (key `users`/`presence` di app_state, tabel `presence`, bucket `materi`) | ✅ dijalankan user di SQL Editor (terverifikasi: tabel presence & bucket ada) |
| `app/api/upload/route.ts` — error eksplisit di production, fallback lokal hanya untuk dev, infer MIME dari ekstensi | ✅ (terverifikasi: production tanpa Supabase → pesan jelas; dev → local fallback jalan) |
| `.env.local` (lokal) + env Vercel (3 kunci Supabase) | ✅ 3 env var diisi via Vercel API (URL, anon plain; service-role sensitive) |
| Migrasi 4 PDF `public/uploads/` ke bucket `materi` | ✅ 4 file terupload; public URL tes 200 (1 MB) |
| Redeploy kode terbaru ke Vercel | ✅ push GitHub `safina-arch/Math-Learn` main → auto-build READY → live di math-learn-sand.vercel.app; deploy terakhir `2aef13f` (termasuk fix redirect 307 tanpa `Location`) |

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

**Lokal:**
- `npm run build` ✅ (lint + type check, 25 route).
- Route: `/lkpd` 200, `/latihan` 200, `/tugas` 307→`/lkpd`, `/kelola` 307→`/materi`, `/api/sync` 200, `/api/presence` 200.
- Upload: production tanpa Supabase → error jelas (bukan "Gagal mengunggah file." generik); dev lokal → `storage=local` + `/api/files/...` 200.

**Production (https://math-learn-sand.vercel.app, deployment sha `2f5e11d`)** — E2E 23 Sep 2026:
- ✅ Kode baru live (buildId `9avrc3LS6WxEHvvhk13lV`, berbeda dari buildId lama).
- ✅ `GET /api/sync` → `configured:true` (Supabase env aktif); `POST /api/sync` tulis OK.
- ✅ `POST /api/upload` → `storage:supabase` + public URL `…/storage/v1/object/public/materi/…` → buka 200. **Bug foto siswa & file lintas device RESOLVED.**
- ✅ `POST/GET /api/presence` heartbeat & daftar user aktif OK (row E2E dibersihkan).
- ✅ `/lkpd` 200, `/latihan` 200; `/` 200; `/tugas` 307 + `Location: /lkpd` → follow 200; `/kelola` 307 + `Location: /materi` → follow 200; `/tugas/abc` tetap 200 (detail tidak ikut redirect).
- 🐞 **Bug redirect ditemukan & diperbaiki (deploy `2aef13f`):** `redirect()` di halaman yang diprender statis ternyata menyimpan status 307 **tanpa header `Location`** (terverifikasi dari `.next/server/app/tugas.meta` + reproduksi lokal `next start`) → browser menampilkan shell `__next_error__` alih-alih pindah halaman. Perbaikan: `redirects()` di `next.config.mjs` (level platform, sebelum render) + `export const dynamic = "force-dynamic"` di `app/tugas/page.tsx` & `app/kelola/page.tsx` sebagai fallback.

## Status akhir: SELURUH PLAN SELESAI & LIVE

Tidak ada langkah tersisa. Perubahan berikutnya: edit kode → `git push origin main` → Vercel auto-build (env sudah tersimpan di project Vercel). Kredensial tersimpan di `.env.local` (ter-ignore git).
