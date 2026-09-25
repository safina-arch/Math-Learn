# Plan Revisi Math-Learn — Status Eksekusi

Tanggal: 23–25 Sep 2026 · Proyek: `mathlearn/` (Next.js 14 + Supabase + localStorage fallback)
**Status: Gelombang 1–4 SELESAI & LIVE · Gelombang 5 SELESAI & LIVE (commit `0b3e75d`, deploy `dpl_CUWg4k1oY9gfZcb4qikiTdFJjAGc` READY, verifikasi produksi PASS)**

Legenda: ✅ selesai & terverifikasi · ⏳ menunggu kredensial (Supabase & Vercel token)

---

## Gelombang 5 — 8 revisi (25 Sep 2026) ✅ LIVE (commit `0b3e75d`, deploy `dpl_CUWg4k1oY9gfZcb4qikiTdFJjAGc` READY, verifikasi produksi PASS)

| # | Revisi | Implementasi |
|---|---|---|
| 1 | Tidak tampilkan "Belum mengerjakan" di hasil siswa (guru & admin) | Stat **Belum mengerjakan** dihapus dari `/periksa` (grid jadi 2 statistik: Belum diperiksa & Sudah diperiksa); badge per baris hanya "Belum diperiksa"/"Sudah diperiksa" |
| 2 | Penyortiran hasil siswa: bedakan LKPD/latihan/evaluasi + urut alfabet nama | Urutan primer = jenis tugas (Latihan → LKPD → Evaluasi) selalu dijaga di `/periksa` & AdminGrades `/nilai` — kelompok header per jenis selalu tampil (berhitung "n kiriman/n data") meski user mengklik sorting; sekunder = kolom yang diklik, **default alfabet nama siswa** (A–Z); kolom "Jenis" jadi statis (bukan tombol sort) |
| 3 | Sidebar "Laporan kecurangan" setelah hasil siswa; laporan dihapus dari hasil siswa | Halaman baru **`/laporan`** (Guard guru & admin) berisi daftar peserta + modal detail (jenis, menit kejadian, soal, evaluasi, waktu) — dipindah dari `/periksa`; nav guru: setelah **Hasil siswa**, nav admin: setelah **Nilai siswa**; blok "Laporan kecurangan" + badge "Nx tab" dihapus dari `/periksa` |
| 4 | "Tandai dibaca" notifikasi belum berfungsi | Akar masalah: `markAllRead` hanya mencocokkan `userId === user.id`/"all", padahal siaran memakai `all-siswa`/`all-guru` — sekarang semua notifikasi yang terlihat user ikut ditandai terbaca (badge lonceng ikut hilang) |
| 5 | Menu export XLSX di hasil siswa | Komponen `components/export-menu.tsx`: tombol **Ekspor hasil ▾** membuka panel pilihan jenis tugas + tombol **Unduh CSV** / **Unduh XLSX**; dipasang di `/periksa` (guru & admin) dan `/nilai` (admin) |
| 6 | Hilangkan tulisan "Evaluasi berstatus Terkunci bisa juga dikunci manual oleh admin kapan saja." | Dihapus dari kartu aturan ujian `/evaluasi` |
| 7 | Export CSV & XLSX berfungsi, data sesuai hasil siswa, bisa pilih jenis tugas | Modul baru `lib/export.ts` (SheetJS `xlsx@0.18.5`): `dataHasilSiswa()` menghasilkan kolom **No, Nama Siswa, Kelas, Jenis Tugas, Tugas/Evaluasi, Status, Nilai, Dikumpulkan** dengan urutan sama persis seperti halaman (per jenis lalu alfabet); filter Semua/Latihan/LKPD/Evaluasi; CSV UTF-8 BOM + quoting aman; XLSX dengan lebar kolom rapi; nama file `hasil-siswa-{jenis}.csv/.xlsx`; tombol "Ekspor CSV" lama (yang menampilkan data dummy) diganti menu ini |
| 8 | Siswa: hilangkan "Unduh CSV saya" | Tombol `right` di PageHeader `/nilai` versi siswa dihapus |

---

## Gelombang 4 — 8 revisi (25 Sep 2026) ✅ LIVE (commit `2fa1b53`, deploy `dpl_G1DMzhU1aYRKnMQh5n7t3UCgVN58` READY, verifikasi produksi PASS)

| # | Revisi | Implementasi |
|---|---|---|
| 1 | Fitur sorting pada hasil kerja siswa di admin & guru | Header kolom bisa diklik (Siswa, Jenis, Tugas, Kelas, Skor/Nilai, Dikumpulkan) dengan panah ▲/▼ + tombol reset di AdminGrades `/nilai` dan `/periksa`; klik berulang membalik arah; kelompok header per jenis disembunyikan saat sorting manual aktif |
| 2 | Warning bila ada kolom belum diisi saat membuat jadwal/pengumuman (kecuali opsional) | `/pengumuman` (guru & admin) & form pertemuan/agenda `/jadwal` (admin): tombol simpan selalu aktif, saat kolom wajib kosong muncul peringatan merah `role="alert"` berisi daftar kolom yang belum diisi + input kosong ditandai border merah; pesan menyebut kolom opsional boleh dikosongkan |
| 3 | Opsi membuat jadwal sesuai pilihan hari & jam | Form pertemuan `/jadwal`: toggle **"📅 Tanggal tertentu"** vs **"🔁 Hari & jam (berulang)"**; mode hari memakai select `HARI` (Senin–Minggu) + jam mulai/selesai, disimpan tanpa `tanggal` (jadwal mingguan) dan tampil di timeline sebagai "Setiap {hari}" |
| 4 | Agar refresh tidak mengeluarkan akun | Akar masalah: race — efek `Guard` redirect ke `/login` sebelum store selesai load sesi dari localStorage. Ditambahkan flag `ready` di `lib/store.tsx`; `Guard` (`components/shell.tsx`) & `/dashboard` hanya redirect **setelah** `ready === true`; halaman "Memuat…" selama hydrate |
| 5 | Auto buka & kunci evaluasi pada jam yang ditentukan | Helper `jendelaEvaluasi()` + `JENDELA_META` di `lib/utils.ts` (kunci-manual / belum-buka / buka / lewat-waktu) berbasis `bukaAt`/`tutupAt`; input **Dibuka otomatis pada** & **Dikunci otomatis pada** (`datetime-local`) di TaskModal; badge status otomatis + tick 30 detik di `/evaluasi` list; layar awal `/evaluasi/[id]` (BELUM DIBUKA / DITUTUP / TERKUNCI) & tick 30 detik; validasi tutup > buka; dashboard mengecualikan evaluasi terkunci/lewat waktu |
| 6 | Waktu jangan minus | Input durasi evaluasi `min=1 max=600` + clamp (negatif/nol → 1, kosong → default saat blur); input bobot `min=0 max=100` + clamp; skor AI/nilai akhir di `/periksa` sudah `Math.min(100, Math.max(0, …))` |
| 7 | Bobot nilai latsol, LKPD, evaluasi maksimal 100 | Indikator **Total bobot: X/100** di TaskModal: hijau normal, amber bila < 100 ("nilai maksimal hanya X"), merah bila > 100 (simpan diblokir); tombol "Distribusikan rata 100"; bila bobot masih 0 semua, dibagi rata otomatis saat simpan; `blankQ()` bobot awal 0 |
| 8 | Semua type file materi tidak usah pratinjau; nama file bisa dicustom | `app/materi/[id]`: seluruh blok pratinjau (PDF/gambar/video/tautan) dihapus → hanya daftar kartu lampiran (ikon, nama, deskripsi, tombol Buka/Buka tautan); `material-modal.tsx`: nama tiap lampiran berupa input yang bisa diedit (nama tampilan inilah yang dilihat siswa) + link "Buka ↗" |

---

## Gelombang 3 — 12 revisi (24 Sep 2026) ✅ LIVE (commit `8b48218`, deploy `dpl_6URGQnipH26KBEcm94Gabfm2rJX3` READY, verifikasi produksi PASS)

| # | Revisi | Implementasi |
|---|---|---|
| 1 | Jadwal punya sidebar sendiri; format list tiap pertemuan (materi, jam, tanggal, kelas), dikustom admin; guru & siswa read-only | `app/jadwal/page.tsx` ditulis ulang: timeline pertemuan bernomor (Pertemuan 1..n) dengan kartu tanggal (hari/bulan), badge kelas, jam, status Hari ini/Selesai/Mendatang, filter kelas chips, form admin (materi, tanggal, jam, kelas, catatan); data legacy tanpa tanggal tetap tampil di akhir; menu **Jadwal** sudah ada di nav ketiga role; teks kartu `/admin` disesuaikan ("per pertemuan"); dashboard: "Jadwal hari ini" cocok `tanggal === todayIso()` (fallback nama hari utk data lama) + kartu "Pertemuan berikutnya" bila kosong (`todayIso()` di `lib/utils.ts`, `AcademicEvent.kelas` di `lib/types.ts`, seed `SEED_EVENTS` 5 pertemuan ber-tanggal) |
| 2 | Siswa bisa kirim foto pakai kamera (aplikasi akses kamera) | `components/answer-upload.tsx` ditulis ulang: tombol **📷 Kamera** membuka modal getUserMedia (`facingMode: environment`) → pratinjau langsung → canvas → blob JPEG → `/api/upload`; fallback pesan bila kamera tak diizinkan; tombol **+ Foto** tetap; `onActivity` dipanggil saat kamera dibuka (grace pelanggaran evaluasi) |
| 3 | Tampilan soal multiline (yang dienter guru) harus sama persis di siswa | `whitespace-pre-wrap` pada render `{q.teks}` & `{a.deskripsi}` di `/tugas/[id]`, `/evaluasi/[id]` (pre-start & soal), modal periksa `/periksa` |
| 4 | Guru tidak perlu fitur mengikuti evaluasi | Guard `/evaluasi/[id]` → `allow={["siswa"]}`; kartu evaluasi di `/evaluasi` hanya navigasi untuk siswa (guru/admin lihat status + aksi kelola tanpa tombol ikut) |
| 5 | Hasil siswa (guru & admin) lebih terorganisir per jenis tugas — minimalis, jelas, bagus | Chips filter `Semua/Latihan/LKPD/Evaluasi` (dengan hitungan) + badge jenis (`TIPE_LABEL`/`TIPE_TONE`) + kelompok header per jenis + sort `TIPEURUT` lalu `submittedAt` desc di `/periksa` dan AdminGrades `/nilai` |
| 6 | Siswa hanya bisa mengerjakan evaluasi satu kali | Layar "SUDAH DIKERJAKAN" (menutup start bila sudah ada submission) di `/evaluasi/[id]`; timer resume via localStorage `mathlearn-exam:{aId}:{userId}` (refresh tidak mereset timer, dihapus saat submit); teks aturan jadi "Satu kesempatan — evaluasi hanya bisa dikerjakan satu kali" |
| 7 | Kecurangan tidak ditampilkan di dashboard guru & admin, cukup di hasil siswa (/periksa) | Stat "Peringatan kecurangan" & kartu cheat di GuruDash dihapus (diganti "Materi dipublikasikan" + "Pengumuman terkirim"); teks cheat di antrean kiriman diganti judul tugas; badge cheat di `/evaluasi` list & `/nilai` siswa dihapus; laporan kecurangan tetap di `/periksa` |
| 8 | Fitur "Simpan & keluar" pada latihan & LKPD harus fungsional | Draft localStorage `mathlearn-draft:{aId}:{userId}` di `/tugas/[id]`: dipulihkan saat buka halaman (badge "Draf dipulihkan"), autosave tiap perubahan, disimpan eksplisit saat klik Simpan & keluar, dihapus setelah submit |
| 9 | Evaluasi bisa dikunci admin | `Assignment.terkunci?`; tombol **Kunci evaluasi / Buka kunci** (khusus admin) di kartu `/evaluasi`; badge "Terkunci"; layar terkunci untuk siswa (start diblokir); evaluasi terkunci dikeluarkan dari "Tugas mendatang" dashboard; flag dipertahankan saat edit (`task-modal.tsx`) |
| 10 | File/link yang ditautkan pada materi bisa ditampilkan preview-nya | `app/materi/[id]`: pratinjau per jenis — PDF → iframe, gambar → `<img>`, video → `<video>`, tautan → iframe `embedUrl()` (YouTube watch/youtu.be → `/embed/`); input **+ Tambah tautan** di `material-modal.tsx` (`MaterialAttachment.tipe = "link"`, badge LINK biru di daftar & `/materi`) |
| 11 | Perbaiki tulisan pratinjau di materi, sesuaikan dengan file yang ditautkan | Label dinamis `KIND_LABEL` ("Pratinjau PDF/Gambar/Video/Tautan") + nama file di header; ikon kartu per jenis (PDF merah, IMG hijau, VID ungu, LINK biru, FILE amber) + deskripsi sesuai jenis; badge daftar materi hitung "n file · n tautan" (bukan "PDF" buta) |
| 12 | Cukup satu pratinjau pada satu materi, kecuali beda tipe file/link (maksimal dua) | Slot pratinjau = indeks pertama non-tautan + indeks pertama tautan saja (`fileIdx`/`linkIdx` di `materi/[id]`); lampiran lain hanya kartu daftar |

---

## Gelombang 2 — 10 revisi lanjutan (24 Sep 2026) ✅ LIVE (commit `947f086`, deploy `dpl_F9VTg1ChHcezNjZdfaqJMdJddaCz` READY, E2E produksi PASS)

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

Verifikasi: `npm.cmd run build` ✅ lulus (lint + type check, 26 route) → commit `947f086` → push → Vercel READY → E2E produksi PASS (24 Sep 2026).

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
