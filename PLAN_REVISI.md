# Plan Revisi Math-Learn — Status Eksekusi

Tanggal: 23 Sep – 5 Okt 2026 · Proyek: `mathlearn/` (Next.js 14 + Supabase + localStorage fallback)
**Status: Gelombang 1–10 SELESAI · Sistem LKPD scalable (Learning Journey) LIVE · Gelombang 9 (nilai LKPD) & Gelombang 10 (cek kerja siswa) LIVE**

Legenda: ✅ selesai & terverifikasi · ⏳ menunggu kredensial (Supabase & Vercel token)

---

## Gelombang 10 — Cek isi kerja siswa LKPD sebelum verifikasi (5 Okt 2026) ✅ build lulus (27 route) · LIVE

| # | Revisi | Implementasi |
|---|---|---|
| 1 | Guru & admin bisa **cek hasil pekerjaan siswa** seperti pada latihan soal & evaluasi — **tidak langsung verifikasi** | Tombol aksi tiap baris di tabel penilaian diganti **👁 Periksa** (tombol Verifikasi/Batalkan langsung di baris dihapus) → membuka modal baru `components/lkpd/cek.tsx` (`CekKerjaLkpd`) yang menampilkan **isi kerja per mission**: badge *Selesai ✓ / Belum dikerjakan*, blok **refleksi** (teks jawaban siswa atau "Belum dijawab"), blok **pertanyaan** (semua opsi; pilihan siswa ditandai *benar ✓* / *belum tepat ✗*, opsi kunci ditandai, umpan balik untuk siswa ditampilkan bila salah), blok **aktivitas** (seret-slot → kartu yang dipindahkan beserta hasilnya + sisa; cocokkan → pasangan tersimpan ✓ + yang belum; isi-tabel → seluruh isi sel dengan penilaian hijau/merah + catatan apakah siswa sudah menekan "Periksa jawaban"), blok materi ringkas (teks bisa dibuka, media ditandai). Ringkasan atas: materi › sub bab, kelas, nilai, x/y mission & persen, status verifikasi, waktu terakhir dikerjakan. Panel bawah: **✓ Verifikasi nilai** / **Batalkan verifikasi** / Tutup → verifikasi kini terjadi **setelah pekerjaan dibuka**. Data diambil ulang dari store lewat `KunciCek` (bukan salinan baris) sehingga status/nilai selalu terkini setelah verifikasi |

Catatan: langkah **④ Verifikasi semua** (batch, permintaan Gelombang 9) tetap tersedia di papan langkah; verifikasi per baris hanya lewat modal cek. Tombol "Belum mulai" (tanpa nilai) tetap bisa dibuka untuk memastikan siswa memang belum mengerjakan.

Verifikasi: `npm.cmd run build` ✅ (lint + type, 27 route) → push `2bc7310` → Vercel deploy `dpl_4dpWLJ…` **READY** → string chunk produksi `/_next/static/chunks/190-25ab1f0f6253aa95.js`: `Cek kerja LKPD` ✓, `pilihan siswa` ✓, `Belum dipindahkan` ✓, `Belum terpasang` ✓, `Siswa belum menekan` ✓, `Belum ada sel yang diisi` ✓, `Umpan balik untuk siswa` ✓, `Verifikasi nilai` ✓, `keputusanmu` ✓, `Siswa belum mengerjakan sub bab ini` ✓, `bukan sekali klik dari tabel` ✓.

---

## Gelombang 9 — Nilai LKPD: sinkron nyata + nilai per sub-bab + panel penilaian guru (4 Okt 2026) ✅ build lulus (27 route) · LIVE

| # | Revisi | Implementasi |
|---|---|---|
| 1 | Nilai hasil LKPD siswa belum muncul pada guru & admin | **Akar masalah ditemukan & dibuktikan**: constraint DB `app_state_key_check` hanya mengizinkan 9 key lama → POST `lkpdTopics`/`lkpdProgress` selalu **HTTP 500** (`new row … violates check constraint "app_state_key_check"`), sehingga antrean tulis ulang, bootstrap, dan merge dari Gelombang 8 percuma — tulisannya memang ditolak Postgres. Perbaikan di `app/api/sync/route.ts` (tanpa perlu SQL): dua key LKPD disimpan sebagai objek di dalam key **`presence`** (key yang diizinkan & tidak dipakai klien mana pun), dipecah lagi + digabung saat GET (`gabungTopik`/`gabungProgres`), progres di-union per `siswaId+submateriId` (tulisan klien tidak saling menimpa). Galat sinkron kini tampil di UI (`syncError` → banner amber di panel penilaian). Opsional: `supabase/migration-lkpd.sql` bila ingin key LKPD berdiri sendiri |
| 2 | Nilai tak perlu menunggu pengerjaan 1 materi penuh | `tandaiMissionLkpd()` → **nilai = persentase mission selesai, dihitung tiap mission ditandai** (0–100) + verifikasi ikut di-reset bila nilai berubah; helper baru `nilaiSubtopic()` (`lib/lkpd.ts`) jadi satu-satunya sumber → `barisHasil`, strip "Nilai sub-bab" `/lkpd/[topik]`, dan kartu nilai siswa langsung menampilkan nilai parsial (fallback persen untuk data lama yang belum punya `nilai`) |
| 3 | Tiap sub-bab penilaian sendiri, format diorganisir guru: nilai siswa → LKPD → materi → sub bab → verifikasi | `HasilLkpdGuru` dirombak jadi **papan langkah 4 tahap**: ① chip *Nilai siswa* **LKPD**, ② select **Materi**, ③ select **Sub bab** (opsinya mengikuti materi, reset saat materi diganti), ④ tombol **✓ Verifikasi semua (n)** — memakai aksi baru `verifikasiLkpdBatch()` (1 tulisan progres + 1 tulisan notifikasi gabungan, bukan N tulisan). Pada sub-bab tertentu ditampilkan **seluruh daftar siswa** (termasuk yang "Belum mulai") + ringkasan: rata-rata, "n dari X siswa dinilai", jumlah menunggu verifikasi |
| 4 | Guru tidak menemukan menu penilaian LKPD | Sidebar guru (`components/shell.tsx`) menambah entri **Nilai siswa** (`/nilai`); halaman `/nilai` dulu menampilkan tampilan siswa untuk guru → kini **guru & admin memakai panel penilaian yang sama**; chip **LKPD** di `/nilai` & `/periksa` kini menampilkan papan penilaian LKPD di atas (tabel kiriman disembunyikan bila tidak ada tugas LKPD) dan hitungan chip ikut memakai jumlah data journey |

Verifikasi: `npm.cmd run build` ✅ (lint + type, 27 route) → push `b757d9e` → Vercel READY → 11 route 200 (`/`, `/dashboard`, `/materi`, `/lkpd`, `/lkpd/perbandingan`, `/lkpd/perbandingan/pb-dasar`, `/nilai`, `/periksa`, `/latihan`, `/evaluasi`, `/laporan`) → **uji langsung di produksi**: POST `lkpdTopics` (role guru) & `lkpdProgress` (role siswa) **500 → 200** ✓, GET mengembalikan kedua key ✓, data uji dibersihkan ✓ → **data siswa asli masuk** (`u-siswa-2631` · `pb-dasar` · 5 mission · nilai 100 · `2026-10-04`) ✓ → string di chunk produksi: `Penilaian LKPD` ✓, `Verifikasi semua` ✓, `Sinkronisasi bermasalah` ✓, `Tidak ada yang menunggu` ✓, `Semua materi`/`Semua sub bab` ✓, `mission pertama selesai` ✓, `nilai terisi sejak mission pertama` ✓, `Hasil sedang menunggu diverifikasi oleh guru` ✓, kemunculan `Nilai siswa` (nav admin + nav guru) ✓.

---

## Gelombang 8 — 5 revisi (4 Okt 2026) ✅ build lulus (27 route) · LIVE

| # | Revisi | Implementasi |
|---|---|---|
| 1 | Bersihkan seluruh history notifikasi dari awal sampai detik ini | Aksi `bersihkanNotifikasi()` di `lib/store.tsx` (isi `notifications = []` + tulis array kosong ke server → perangkat lain ikut bersih pada GET 5 detik berikutnya) + tombol **🗑 Bersihkan** (khusus guru/admin, ada `confirm`) di panel lonceng `components/shell.tsx`; **history produksi sudah di-wipe** (POST `/api/sync` `notifications: []` → terverifikasi `jumlah=0`) |
| 2 | Tulisan "Video pembelajaran" pada materi disesuaikan dengan tipe file yang diunggah guru/admin | Helper `labelMediaMateri(url, pendek?)` di `lib/utils.ts` — YouTube → "Video pembelajaran · YouTube", Google Drive → "Pratinjau Google Drive", mp4/webm/mov → "Video pembelajaran", pdf → "Dokumen PDF", gambar → "Gambar materi", ppt/doc/xls/csv → "Berkas materi", selain itu "Tautan media" — dipakai di judul slot `app/materi/[id]` + badge kartu `app/materi` (versi pendek); label input `material-modal.tsx` → "URL media (YouTube / Google Drive / tautan file, opsional)" |
| 3 | Nilai hasil pengerjaan siswa belum sinkron dengan data guru & admin | Akar masalah: row **`lkpdTopics` & `lkpdProgress` tidak pernah tersimpan** di `app_state` (server cuma punya 8 key) dan POST yang gagal-jaringan tidak pernah diulang → (a) **antrean tulis ulang** `antreanTulis` + `tulisGagal()` dipanggil tiap siklus 5 detik (gagal permanen 400/403 tidak diulang; guard referensi payload agar tulisan lebih baru tidak terhapus); (b) **bootstrap** — bila server belum punya row LKPD, klien guru/admin unggah katalog & klien dengan data lokal unggah progres; (c) **merge saat GET** `gabungProgress()` (kunci `siswaId+submateriId`, `updatedAt` terbaru menang) → server ∪ lokal lalu ditulis balik bila berbeda. ⚠️ *Lanjutannya di **Gelombang 9 #1**: ternyata penyebab utama row tidak pernah terbentuk adalah constraint DB `app_state_key_check` yang menolak key `lkpd*` (HTTP 500)* |
| 4 | Penilaian LKPD per sub-bab (submateri), bukan per materi saja | Kartu submateri di `/lkpd/[topik]` kini punya strip **"Nilai sub-bab"**: siswa → nilai sendiri + badge *Menunggu verifikasi / Terverifikasi ✓*; guru/admin → **rata-rata nilai sub-bab**, "n dari X siswa dinilai", + badge jumlah yang menunggu verifikasi (tabel `HasilLkpdGuru` tetap per siswa × submateri) |
| 5 | Pop-up "hasil sedang menunggu diverifikasi guru" setelah siswa mengerjakan lkpd/latihan/evaluasi | LKPD journey (`/lkpd/[topik]/[sub]`): kartu perayaan inline diganti **Modal** 🎉 "LKPD selesai!" berisi nilai + panel amber **"⏳ Hasil sedang menunggu diverifikasi oleh guru"** + tombol *Lihat nilai & status* / *Pilih submateri lain*; latihan (`/tugas/[id]`) & evaluasi (`/evaluasi/[id]`) sudah memakai pop-up amber sejak Gelombang 7 |

Verifikasi: `npm.cmd run build` ✅ (lint + type, 27 route) → push → Vercel READY (deploy `dpl_54WMK1RE4cyCPJnYv5Adx5nm3hNa` sha `9a558cc`, lanjutan `dpl_8owy8hckLNR1NKpjikbTBcKW4um6` sha `252e8f9`) → 9 route 200 (`/`, `/materi`, `/lkpd`, `/lkpd/perbandingan`, `/lkpd/perbandingan/pb-dasar`, `/nilai`, `/periksa`, `/latihan`, `/evaluasi`) → string produksi di chunk JS: `Bersihkan SELURUH history notifikasi` ✓, `Pratinjau Google Drive` ✓, `Video pembelajaran \xb7 YouTube` ✓, `Tautan media` ✓, `Nilai sub-bab` ✓, `Hasil sedang menunggu diverifikasi oleh guru` ✓, `URL media (YouTube / Google Drive / tautan file, opsional)` ✓ → `GET /api/sync` `notifications` = 0 item (wipe bersih).

Catatan: uji interaktif (klik tombol bersihkan, pop-up selesai LKPD, strip nilai sub-bab) belum bisa dijalankan otomatis karena browser desktop belum terhubung ke sesi — verifikasi di atas berbasis build + route + string produksi.

---

## Gelombang 7 — 10 revisi LKPD & alur nilai (1 Okt 2026) ✅ build lulus (27 route)

| # | Revisi | Implementasi |
|---|---|---|
| 1 | Mission wajib berurutan | `/lkpd/[topik]/[sub]`: `batas` = jumlah mission awal yang berurutan selesai; timeline beranda 🔒 terkunci bila i > batas, tombol "Sebelumnya" tetap boleh (bolak-balik di tahap yang sudah terbuka) |
| 2 | Jawaban tidak hilang saat bolak-balik | Refleksi **auto-save** tiap ketikan; ❓ pertanyaan simpan pilihan; 🧩 aktivitas simpan state (`diArea`/`pasang`/`val`+`dicek`) sebagai JSON di `LkpdProgress.jawaban` — tersimpan sampai siswa mengubahnya |
| 3 | Guru/admin akses penuh | **Bug fix**: backdrop menu `+ Add Content` (`fixed inset-0 z-10`) dirender saat menu tertutup → menelan semua klik halaman kelola (penyebab "tidak bisa mengubah isi"). Kini backdrop hanya saat menu terbuka · tombol **Hapus materi** kini juga untuk guru · `persistShared` diperkuat (retry + jendela `pendingUntil` agar edit tidak tertimpa GET in-flight) |
| 4 | Hapus keterangan "Tugas LKPD" | Section daftar tugas di `/lkpd` dihapus — cukup Learning Journey Hub saja (route `/tugas/[id]` & `/latihan` tetap utuh) |
| 5 | Notifikasi tersebar | Materi baru → `all-siswa` · submateri baru → `all-siswa` · siswa tuntas LKPD → `all-guru` · nilai LKPD diverifikasi → notifikasi ke siswa tersebut |
| 6 | Link YouTube terhubung | `youtubeEmbed()` (watch/youtu.be/shorts/embed → `youtube.com/embed/ID`) dipakai di blok 🎥 video LKPD & `m.videoUrl` halaman materi |
| 7 | Link Drive tidak bisa preview | `isDriveUrl()` + `drivePreviewUrl()` (`…/file/d/ID/view` → `…/preview`) + tombol "Buka di Google Drive (tab baru)" sebagai fallback izin · blok 🖼️ gambar Drive juga dibuka di tab baru |
| 8 | Nilai LKPD muncul di guru & admin | `LkpdProgress.nilai` (0–100, terisi saat semua mission tuntas) + `verifikasi` · komponen `components/lkpd/hasil.tsx` → tabel **"📊 Nilai LKPD (Learning Journey)"** di `/periksa` (guru/admin) & `/nilai` (admin), lengkap tombol **Verifikasi / Batalkan** |
| 9 | Drag pekerja belum jalan | `onDragStart` kini `setData("text/plain")` + `effectAllowed` (Firefox/Chrome wajib), `onDrop` membaca `getData`, sorot area saat drag, fallback **klik kartu** dipertegas dengan hint "Seret / klik" |
| 10 | Popup pasca-kerjakan + status nilai | Pop-up usai kumpulkan tugas (`/tugas/[id]`) & evaluasi (`/evaluasi/[id]`) kini memakai panel amber **"⏳ Nilai sedang menunggu untuk diverifikasi oleh guru"**; halaman `/nilai` siswa menambah **📋 Riwayat kiriman** (badge *Menunggu verifikasi guru* vs *Sudah fiks ✓*) + kartu **📊 Nilai LKPD** per siswa; perayaan selesai LKPD menampilkan nilai + status menunggu verifikasi |

---

## Fitur: Sistem LKPD scalable (1 Okt 2026)

LKPD kini fitur **global berbasis materi** (bukan halaman khusus Perbandingan). Hierarki data: `LKPD → Topik/Materi → Submateri → Mission → Content Block` — semuanya data-driven, guru/admin menambah materi baru tanpa mengubah sistem.

| Area | Implementasi |
|---|---|
| Route baru | `/lkpd` (Learning Journey Hub), `/lkpd/[topik]` (daftar submateri), `/lkpd/[topik]/[sub]` (perjalanan misi), `/lkpd/[topik]/[sub]/kelola` (editor guru/admin, Guard `guru+admin`) |
| Tipe & helper | `lib/types.ts` (LkpdTopic/Subtopic/Mission/Block/Progress), `lib/lkpd.ts` (5 tahap default `LKPD_TAHAP`, kalkulasi progres per submateri & topik, CTA Mulai/Lanjutkan/Lihat) |
| Store | `lkpdTopics` + `lkpdProgress` di `lib/store.tsx` (localStorage + sinkron Supabase), aksi `upsertLkpdTopic`, `deleteLkpdTopic` (cascade progres), `tandaiMissionLkpd`, `simpanJawabanLkpd`; resource baru di `/api/sync` (`lkpdTopics` teacher-only) |
| Konten awal | `lib/lkpd-seed.ts` — topik ⚖️ Perbandingan (3 submateri × 5 mission, konten nyata tiap tahap) |
| Mission interaktif | `components/lkpd/activities.tsx` — **seret-slot** (drag 👷 pekerja → pola 4×12=48), **cocokkan**, **isi-tabel** (manipulasi angka + feedback per sel) |
| Content block | `components/lkpd/blocks.tsx` — 📝 teks, 🖼️ gambar, 🎥 video, 🎞️ animasi, 📎 berkas, ❓ pertanyaan (feedback edukatif + petunjuk progresif), 🧩 aktivitas, 💡 hint (bertahap), 💬 refleksi (tersimpan per siswa) |
| Progress | Per submateri (✓/○ per mission → %) → rata-rata ke topik → tampil sebagai progress & status (Belum dimulai/Sedang dipelajari/Selesai) + tombol Mulai/Lanjutkan/Lihat di hub |
| Kelola guru/admin | `components/lkpd/block-editor.tsx` + halaman kelola: tambah/ubah/hapus/urut mission (default 5 tahap, misi tambahan boleh), editor per blok termasuk aktivitas & pertanyaan, **👁 Preview** mode siswa sebelum **💾 Save** / ↩ Batal |
| Navigasi | Sidebar 📚 LKPD tetap sama untuk 3 role; halaman `/lkpd` khusus Learning Journey (section "Tugas LKPD" dihapus pada Gelombang 7) |
| Role | Siswa hanya membaca/mengerjakan (mission berurutan, tanpa tombol kelola) · Guru & Admin akses penuh: kelola materi/submateri/mission/konten + hapus materi + verifikasi nilai |

---

## Gelombang 6 — 4 revisi (30 Sep 2026) ✅ LIVE (commit `7629559`, deploy `dpl_Fc9eg96TuMbQE3zKo6J94ZmJoJ7w` READY, verifikasi produksi PASS)

| # | Revisi | Implementasi |
|---|---|---|
| 1 | Hasil siswa & laporan kecurangan dikaitkan dengan tugasnya — menghapus evaluasi/lkpd/latihan ikut menghapus hasil & laporannya | `deleteAssignment` di `lib/store.tsx` kini cascade: ikut menghapus `submissions` (assignmentId) dan `cheatLogs` (evaluationId) + persist ketiganya; **efek sanitasi saat data termuat** membuang kiriman/laporan yatim sisa penghapusan lama (guard `assignments.length > 0` agar tak salah bersih saat sinkronisasi); tabel & ekspor `/periksa`, `/nilai`, `lib/export.ts` juga memfilter kiriman yang masih punya tugas (chip/empty-state ikut terhitung dari data terkait) |
| 2 | Admin: hilangkan tulisan "heartbeat" di bagian user yang aktif | Stat "Aktif sekarang" di `/admin`: `sub` "heartbeat < 60 detik" → **"terhubung < 60 detik lalu"** (satu-satunya kemunculan di UI) |
| 3 | Peringatan kecurangan juga saat siswa pindah sidebar | Tipe baru `CheatLog.tipe: "navigasi"` (`lib/types.ts`), label **"Pindah menu sidebar"** (`cheatLabel`, tone merah), validasi API `/api/cheat-log`; di `/evaluasi/[id]` effect cleanup saat komponen unmount mencatat pelanggaran navigasi **hanya jika pengerjaan masih berjalan** (`startedAt > 0 && !doneRef`) — submit sukses tidak ikut tercatat; nomor soal dari ref mirror agar tidak basi; syarat pengawasan diseragamkan `a.tipe === "evaluasi"` (kunciTab selalu true untuk evaluasi) |
| 4 | Kolom "Tugas / evaluasi" di hasil nilai masih ngawur (termasuk LKPD) | Akar masalah: kiriman yatim menampilkan **ID mentah** (`s.assignmentId`) dan tipe jatuh ke fallback "latihan" (LKPD bisa salah label). Sekarang baris tanpa tugas **tidak ditampilkan** (filter relasi di tabel, chip, empty-state, dan ekspor), fallback judul jadi **"Tugas sudah dihapus"**, dan pembersihan data yatim di store memastikan tugas ↔ hasil selalu konsisten |

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
