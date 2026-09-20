Product Requirement Document (PRD): Math-Learn
1. Ringkasan Produk & Tujuan
Math-Learn adalah platform e-learning matematika berbasis web khusus siswa SMP. Platform ini menyederhanakan proses belajar-mengajar melalui materi interaktif, penugasan, evaluasi berdurasi dengan pengawasan sistem, serta integrasi AI untuk membantu guru menilai jawaban siswa secara cepat.

2. Struktur Pengguna & Hak Akses (Roles)
2.1 Siswa
* Mengakses beranda ringkas (progres belajar, tenggat tugas, pengumuman terbaru).
* Membaca dan mengunduh materi pelajaran.
* Mengerjakan LKPD dan Latihan Soal.
* Mengerjakan Evaluasi/Ujian dengan pengawasan sistem (deteksi pindah tab).
* Melihat hasil nilai, umpan balik dari guru/AI, dan statistik nilai pribadi.
2.2 Guru
* Menambah, mengubah, dan menghapus Materi (teks, PDF, tautan video).
* Membuat LKPD, Latihan Soal, dan Evaluasi (mengatur durasi ujian, acak soal, dan pengunci tab).
* Mempublikasikan pengumuman ke seluruh kelas atau siswa tertentu.
* Mengakses lembar kerja siswa, meninjau hasil penilaian otomatis AI, mengubah nilai (manual override), dan memberikan umpan balik akhir.
* Mengekspor data rekapitulasi nilai siswa dalam format .csv dengan kolom: No | Nama | Kelas | Nilai.
2.3 Admin
* Mengelola manajemen akun (CRUD: Siswa, Guru, Admin).
* Impersonation Mode: Dapat beralih tampilan dan mengakses sistem sebagai Guru atau Siswa untuk verifikasi/bantuan teknis.
* Melihat statistik global sistem pada Dashboard Admin (total pengguna aktif, jumlah ujian berjalan, beban penyimpanan).
* Mengatur jadwal pelajaran atau kalender akademik platform.
3. Fitur Utama & Spesifikasi Fungsional
3.1 Beranda (Home Dashboard)
* Siswa: Menampilkan kartu ringkasan (Tugas Mendatang, Nilai Terakhir, Pengumuman Penting, dan Progress Bar kelengkapan materi).
* Guru: Menampilkan daftar tugas yang perlu diperiksa (pending grading), jadwal evaluasi aktif, shortcut buat materi/soal, serta daftar peringatan kecurangan siswa.
* Admin: Menampilkan metrik utama sistem, manajemen pengguna cepat, dan kalender penjadwalan.
3.2 Modul Pembelajaran & Penugasan
* Materi: Ruang baca interaktif yang mendukung format teks, integrasi embed video (seperti YouTube), dan lampiran dokumen (PDF/Image).
* LKPD (Lembar Kerja Peserta Didik): Penugasan berbasis lembar kerja eksploratif yang dapat diunduh atau dikerjakan langsung secara bertahap.
* Latihan Soal: Modul latihan tanpa batasan waktu yang ketat. Mendukung format Pilihan Ganda, Uraian Singkat, dan Essay dengan pembetulan langsung setelah selesai (instantly graded untuk pilihan ganda).
3.3 Modul Evaluasi & Keamanan (Wajib)
* Pengaturan Ujian: Penentuan durasi (timer mundur), tanggal buka/tutup ujian, dan batas toleransi kecurangan.
* Deteksi Kecurangan (Tab-Switching Detection):
    * Sistem mendeteksi peristiwa saat siswa meninggalkan tab ujian (blur event / visibility change).
    * Menampilkan peringatan pop-up mendesak kepada siswa ketika kembali ke tab.
    * Mencatat stempel waktu (timestamp) dan frekuensi pelanggaran.
    * Mengirimkan notifikasi dan laporan aktivitas kecurangan secara otomatis ke Dashboard Guru.
3.4 Sistem Notifikasi Dalam Website (Wajib)
* Push notification internal (ikon lonceng di navigasi atas).
* Kategori notifikasi:
    * Siswa: Tugas baru dipublikasikan, pengumuman baru, hasil evaluasi telah dinilai.
    * Guru: Siswa menyelesaikan evaluasi, laporan kecurangan siswa saat ujian, tugas memerlukan pengecekan manual.
    * Admin: Pendaftaran pengguna baru atau laporan kendala sistem.
3.5 AI Auto-Grading & Feedback (Wajib)
* Analisis Jawaban Essay/Uraian: Saat siswa mengumpulkan jawaban essay pada Latihan Soal atau Evaluasi, AI memproses jawaban berdasarkan kunci/rubrik yang diinput guru.
* Rekomendasi Nilai & Draf Umpan Balik: AI memberikan usulan nilai beserta umpan balik singkat (1–2 kalimat) per nomor soal.
* Privilege Guru: Umpan balik AI masuk ke draf Guru. Guru dapat langsung menyetujui, menyunting umpan balik, atau mengubah nilai sebelum diterbitkan ke Siswa.
4. Rekomendasi Teknologi (Cepat, Ringan, & Gratis)
Untuk memastikan pembuatan web terasa simpel, performa cepat, dan dapat diunggah tanpa biaya langganan, berikut kombinasi tech stack yang ideal:

4.1 Frontend & Backend Framework
* Next.js (App Router) + Tailwind CSS
    * Alasan: Memungkinkan penyatuan frontend dan backend (API Routes) dalam satu repositori. Sangat cepat, ramah SEO, dan komponen UI dapat dibangun dengan minimalis menggunakan Tailwind CSS.
    * Hosting Gratis: Vercel (sangat optimal untuk Next.js dengan kuota Hobby Tier yang cukup besar).
4.2 Database & Autentikasi
* Supabase (PostgreSQL)
    * Alasan: Menyediakan database PostgreSQL gratis (Free Tier 500 MB), sistem autentikasi bawaan yang aman, serta fitur Realtime Subscriptions yang sangat mudah digunakan untuk Fitur Notifikasidan Deteksi Kecurangan secara langsung (real-time).
    * Alternatif File Storage: Supabase Storage (gratis hingga 1 GB) untuk menyimpan file PDF atau lampiran materi dari Guru.
4.3 Integrasi AI
* Google Gemini API (gemini-1.5-flash)
    * Alasan: Model gemini-1.5-flash memiliki kecepatan respons yang sangat tinggi, sangat akurat untuk pemrosesan teks/matematika sederhana, dan memiliki Free Tier melalui Google AI Studio yang memadai untuk skala sekolah.
5. Ringkasan Arsitektur Stack
Komponen	Teknologi Terpilih	Biaya Deployment
Framework	Next.js (React) + TypeScript	Gratis (Vercel)
Styling	Tailwind CSS + shadcn/ui (opsional)	Gratis
Database & Auth	Supabase (PostgreSQL + Auth)	Gratis (Free Tier)
File Storage	Supabase Storage	Gratis (Free Tier)
AI Engine	Google Gemini API (gemini-1.5-flash)	Gratis (Free Tier)
Hosting	Vercel	Gratis
Memulai pengembangan dengan memisahkan database schema (tabel users, materials, assignments, evaluations, submissions, dan notifications) akan sangat membantu menjaga alur data tetap bersih dan mudah dikelola.
