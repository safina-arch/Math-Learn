"use client";

import Link from "next/link";

const FEATURES = [
  { t: "Materi interaktif", d: "Teks terstruktur, embed video, dan lampiran PDF dalam satu halaman baca yang rapi." },
  { t: "LKPD & Latihan", d: "Lembar kerja eksploratif dan latihan terarah. Pilihan ganda dikoreksi otomatis." },
  { t: "Evaluasi aman", d: "Timer mundur, jadwal buka-tutup, dan deteksi pindah tab dengan laporan ke guru." },
  { t: "AI auto-grading", d: "Draf nilai + umpan balik 1–2 kalimat per soal. Guru tetap memegang keputusan akhir." },
  { t: "Notifikasi internal", d: "Tugas baru, pengumuman, hasil dinilai, dan laporan kecurangan masuk ke lonceng." },
  { t: "Rekap CSV", d: "Ekspor No | Nama | Kelas | Nilai dalam satu klik untuk arsip sekolah." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-line">
        <div className="mx-auto max-w-[1100px] px-4 h-[60px] flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold">M</span>
          <span className="font-bold tracking-tight">Math-Learn</span>
          <span className="badge bg-wash text-ink-soft border-line ml-1 hidden sm:inline-flex">Matematika SMP</span>
          <div className="ml-auto flex gap-2">
            <Link href="/login" className="btn-ghost text-[13.5px]">Masuk</Link>
            <Link href="/register" className="btn-primary text-[13.5px]">Daftar gratis</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-4">
        <section className="py-12 sm:py-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div>
            <p className="badge bg-primary-50 text-primary border-primary-100 mb-4">Untuk siswa, guru, dan admin SMP</p>
            <h1 className="text-[30px] sm:text-[44px] leading-[1.08] font-bold tracking-tight">
              Belajar matematika yang rapi, tenang, dan terukur.
            </h1>
            <p className="muted mt-4 max-w-[520px] !text-[15px]">
              Satu ruang untuk materi, LKPD, latihan soal, dan evaluasi berdurasi dengan pengawasan tab.
              Guru dibantu AI untuk menilai essay — keputusan akhir tetap di tangan guru.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/login" className="btn-primary !px-5 !py-2.5">Masuk ke aplikasi</Link>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-line px-4 py-3 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E5E5E8]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#E5E5E8]" />
              <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
              <span className="ml-2 text-[12.5px] text-ink-muted">Beranda siswa — ringkasan hari ini</span>
            </div>
            <div className="p-4 space-y-3 bg-wash/50">
              <div className="card card-pad">
                <p className="text-[12.5px] text-ink-muted font-medium">PROGRES MATERI</p>
                <p className="text-[20px] font-bold mt-0.5">2 dari 3 selesai</p>
                <div className="mt-2 h-1.5 rounded-full bg-wash border border-line overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: "66%" }} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="card card-pad"><p className="text-[12.5px] text-ink-muted">Tugas mendatang</p><p className="font-bold text-[18px]">2</p></div>
                <div className="card card-pad"><p className="text-[12.5px] text-ink-muted">Nilai terakhir</p><p className="font-bold text-[18px]">88</p></div>
              </div>
              <div className="card card-pad flex gap-3 items-start">
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary font-bold text-[13px]">!</span>
                <div><p className="text-[13.5px] font-semibold">Evaluasi dibuka sampai 15 Okt</p><p className="text-[12.5px] text-ink-muted">45 menit · jangan pindah tab saat mengerjakan.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-4">
          <h2 className="text-[20px] font-bold tracking-tight">Semua kebutuhan kelas dalam satu tempat</h2>
          <p className="muted mt-1">Tanpa menu berlapis. Setiap peran hanya melihat yang relevan.</p>
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map((f) => (
              <div key={f.t} className="card card-pad">
                <p className="text-[14.5px] font-semibold">{f.t}</p>
                <p className="muted mt-1">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-10">
          <div className="card card-pad sm:p-8 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-[19px] font-bold tracking-tight">Siap dipakai hari ini, siap dipublish ke Vercel.</h2>
              <p className="muted mt-1">Jalankan dengan Supabase untuk produksi, atau mode demo lokal untuk mencoba semua peran tanpa setup.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/login" className="btn-ghost">Lihat demo</Link>
              <Link href="/register" className="btn-primary">Buat akun</Link>
            </div>
          </div>
          <p className="text-center text-[12.5px] text-ink-faint mt-8">Math-Learn · Next.js + Supabase + Gemini · Font: Plus Jakarta Sans (padanan Google Sans)</p>
        </section>
      </main>
    </div>
  );
}
