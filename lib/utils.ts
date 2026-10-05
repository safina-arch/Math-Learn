import type { Assignment, AssignmentType, Submission, User } from "./types";

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function fmtCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function normalize(s: string): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Pilihan ganda dinilai otomatis — TETAPI hanya bila kunci dan jawaban sama-sama
 * terisi. Tanpa guard ini, `pgCorrect("", "")` bernilai true sehingga soal tanpa
 * kunci / jawaban kosong ikut dianggap benar.
 */
export function pgCorrect(answer: string, kunci: string | undefined): boolean {
  const a = normalize(answer);
  const k = normalize(kunci || "");
  if (!a || !k) return false;
  return a === k;
}

/**
 * Fallback penilaian otomatis untuk jawaban terbuka (uraian/essay).
 * HASILNYA selalu berupa DRAF saran untuk guru — bukan nilai akhir.
 * Aturan ketat agar jawaban salah tidak dianggap benar:
 *  - tanpa kunci/rubrik → skor 0 (tidak ada acuan → serahkan ke guru);
 *  - tanpa jawaban → skor 0;
 *  - perbandingan eksak → 100;
 *  - selain itu skor mengikuti rasio kata kunci yang benar-benar ditemukan
 *    (tanpa skor minimum buatan dan tanpa mengabaikan angka/simbol satu karakter).
 */
export function heuristicGrade(
  teks: string,
  jawaban: string,
  kunci: string | undefined,
  rubrik: string | undefined,
  bobot: number
): { skor: number; feedback: string } {
  const a = normalize(jawaban);
  const k = normalize(kunci || "");
  if (!a) return { skor: 0, feedback: "Jawaban masih kosong. Coba tulis langkah pengerjaanmu walau belum yakin." };
  if (!k && !(rubrik || "").trim()) {
    // Tidak ada kunci maupun rubrik → sistem tidak boleh menghakimi sendiri.
    return { skor: 0, feedback: "Butuh pemeriksaan guru — belum ada kunci/rubrik untuk menilai otomatis." };
  }
  if (k && a === k) return { skor: 100, feedback: "Tepat dan sesuai kunci. Pertahankan cara pengerjaanmu yang rapi." };
  if (!k) {
    // Hanya rubrik tersedia: cakupan jawaban (panjang & relevansi kata) → skor moderat, bukan "benar".
    const skor = Math.min(60, Math.round(Math.min(1, a.length / 120) * 60));
    return { skor, feedback: "Jawaban sudah tertulis — penilaian akhir menunggu guru memeriksa sesuai rubrik." };
  }
  // Tokenisasi mempertahankan angka satu karakter (mis. "4") supaya jawaban
  // berbeda angka tidak dianggap sama persis dengan kunci.
  const keyTokens = k.split(/[^a-z0-9]+/).filter(Boolean);
  const ansTokens = new Set(a.split(/[^a-z0-9]+/).filter(Boolean));
  let hit = 0;
  keyTokens.forEach((t) => {
    if (ansTokens.has(t)) hit += 1;
  });
  const recall = keyTokens.length ? hit / keyTokens.length : 0;
  // Tanpa skor minimum: jawaban yang hampir tak cocok tetap mendapat skor kecil.
  const skor = Math.max(0, Math.min(95, Math.round(recall * 90)));
  const fb =
    skor >= 75
      ? "Sebagian besar kata kunci cocok. Periksa kembali istilah yang belum muncul."
      : skor >= 45
        ? "Ada bagian yang benar. Lengkapi langkah dan samakan dengan kunci/rubrik yang diminta."
        : `Belum sesuai ${rubrik ? "rubrik" : "kunci"}. Tulis ulang langkah dari awal dan periksa tiap operasi.`;
  void teks;
  void bobot;
  return { skor, feedback: fb };
}

export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

/** Format tanggal "YYYY-MM-DD" lokal tanpa bergantung zona waktu. */
export function fmtTanggal(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  if (!y || !m || !d) return iso;
  return `${Number(d)} ${bulan[Number(m) - 1] || m} ${y}`;
}

/** Label jenis kecurangan — "foto" adalah kegiatan menambahkan foto, bukan pelanggaran. */
export function cheatLabel(tipe: string): string {
  if (tipe === "foto") return "Menambahkan foto";
  if (tipe === "navigasi") return "Pindah menu sidebar";
  if (tipe === "visibility") return "Pindah laman";
  return "Keluar fokus";
}

export function cheatTone(tipe: string): "red" | "blue" {
  return tipe === "foto" ? "blue" : "red";
}

/**
 * Status tugas dari kacamata guru/admin — berbasis APAKA GURU SUDAH MEMERIKSA,
 * bukan sekadar ada nilai. Kiriman yang nilainya masih draf AI (belum diterbitkan
 * guru) tetap "Belum diperiksa".
 */
export type StatusTugas = "belum" | "belum-diperiksa" | "sudah";
export const STATUS_TUGAS_META: Record<StatusTugas, { label: string; tone: "gray" | "amber" | "green" }> = {
  belum: { label: "Belum mengerjakan", tone: "gray" },
  "belum-diperiksa": { label: "Belum diperiksa", tone: "amber" },
  sudah: { label: "Sudah diperiksa", tone: "green" },
};
export function statusTugas(sub?: { status: string; feedbackAi?: Record<string, { draft: boolean }> } | null): StatusTugas {
  if (!sub) return "belum";
  if (sub.status !== "dinilai") return "belum-diperiksa";
  const drafTersisa = Object.values(sub.feedbackAi || {}).some((f) => f && f.draft);
  return drafTersisa ? "belum-diperiksa" : "sudah";
}

/**
 * Ubah tautan YouTube apa pun (watch / youtu.be / shorts / embed) menjadi
 * URL embed resmi — agar video langsung terhubung & bisa diputar di halaman.
 */
export function youtubeEmbed(url: string): string {
  const u = (url || "").trim();
  if (!u) return "";
  if (/youtube\.com\/embed\//.test(u)) return u;
  const id = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/);
  if (id) return `https://www.youtube.com/embed/${id[1]}`;
  return u;
}

/** Deteksi tautan Google Drive (docs.google.com / drive.google.com). */
export function isDriveUrl(url: string): boolean {
  return /(?:drive\.google\.com|docs\.google\.com)/i.test(url || "");
}

/**
 * Normalisasi tautan Google Drive ke bentuk preview-embed.
 * `…/file/d/ID/view?usp=sharing` → `…/file/d/ID/preview`.
 * Catatan: preview hanya tampil bila izin Drive mengizinkan "siapa pun yang punya tautan".
 */
export function drivePreviewUrl(url: string): string {
  const u = (url || "").trim();
  const id = u.match(/\/d\/([A-Za-z0-9_-]{20,})/);
  if (id) return `https://drive.google.com/file/d/${id[1]}/preview`;
  const uc = u.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  if (uc) return `https://drive.google.com/file/d/${uc[1]}/preview`;
  return u.replace(/\/view(\?.*)?$/, "/preview");
}

/** Nama tampilan media: dipakai untuk label tombol "buka di tab baru". */
export function domainLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "tautan";
  }
}

/**
 * Judul slot media pada halaman materi — menyesuaikan tipe file/tautan yang
 * diunggah guru/admin (YouTube, Google Drive, video, PDF, gambar, berkas, tautan)
 * sehingga tulisannya tidak selalu "Video pembelajaran".
 * `pendek` = versi ringkas untuk badge daftar materi.
 */
export function labelMediaMateri(url?: string | null, pendek = false): string {
  const u = (url || "").trim().toLowerCase();
  if (!u) return pendek ? "Tautan" : "Tautan media";
  if (/youtu\.be|youtube\.com/.test(u)) return pendek ? "YouTube" : "Video pembelajaran · YouTube";
  if (isDriveUrl(u)) return pendek ? "Google Drive" : "Pratinjau Google Drive";
  const path = u.split("?")[0];
  if (/\.(mp4|webm|mov|m4v|mkv|avi)$/.test(path)) return pendek ? "Video" : "Video pembelajaran";
  if (/\.pdf$/.test(path)) return pendek ? "PDF" : "Dokumen PDF";
  if (/\.(png|jpe?g|webp|gif|avif)$/.test(path)) return pendek ? "Gambar" : "Gambar materi";
  if (/\.(pptx?|docx?|xlsx?|csv|txt|zip|rar)$/.test(path)) return pendek ? "Berkas" : "Berkas materi";
  return pendek ? "Tautan" : "Tautan media";
}

/** Status ketersediaan evaluasi: dikunci manual, belum waktunya, terbuka, atau sudah lewat. */
export type JendelaEvaluasi = "kunci-manual" | "belum-buka" | "buka" | "lewat-waktu";
export const JENDELA_META: Record<JendelaEvaluasi, { label: string; tone: "gray" | "amber" | "green" | "red" }> = {
  "kunci-manual": { label: "Terkunci", tone: "gray" },
  "belum-buka": { label: "Belum dibuka", tone: "amber" },
  buka: { label: "Terbuka", tone: "green" },
  "lewat-waktu": { label: "Ditutup otomatis", tone: "red" },
};
/**
 * Evaluasi otomatis terbuka saat `bukaAt` tiba dan otomatis terkunci setelah `tutupAt`,
 * tanpa perlu klik manual. Kunci manual admin tetap berlaku di atas jadwal ini.
 */
export function jendelaEvaluasi(a: { bukaAt?: string | null; tutupAt?: string | null; terkunci?: boolean }): JendelaEvaluasi {
  if (a.terkunci) return "kunci-manual";
  const now = Date.now();
  if (a.bukaAt && Date.parse(a.bukaAt) > now) return "belum-buka";
  if (a.tutupAt && Date.parse(a.tutupAt) <= now) return "lewat-waktu";
  return "buka";
}

/** Ringkasan tiga status tugas di seluruh tugas: belum mengerjakan / belum diperiksa / sudah diperiksa. */
export function statusRingkasan(assignments: Assignment[], submissions: Submission[], users: User[]) {
  let belum = 0;
  let blm = 0;
  let sudah = 0;
  for (const a of assignments) {
    const subs = submissions.filter((s) => s.assignmentId === a.id);
    const ids = new Set(subs.map((s) => s.siswaId));
    const roster = users.filter((u) => u.role === "siswa" && u.kelas === a.kelas);
    belum += Math.max(0, Math.max(roster.length, ids.size) - ids.size);
    for (const s of subs) {
      // Konsisten dengan tampilan siswa: draf AI yang belum diterbitkan = belum diperiksa.
      if (statusTugas(s) === "sudah") sudah += 1;
      else blm += 1;
    }
  }
  return { belum, blm, sudah };
}

/** Tanggal hari ini (YYYY-MM-DD) — zone waktu lokal, untuk mencocokkan jadwal pertemuan. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Label & warna badge jenis tugas — dipakai "Hasil siswa" (guru) & nilai (admin). */
export const TIPE_LABEL: Record<AssignmentType, string> = { lkpd: "LKPD", latihan: "Latihan", evaluasi: "Evaluasi" };
export const TIPE_TONE: Record<AssignmentType, "purple" | "blue" | "red"> = { lkpd: "purple", latihan: "blue", evaluasi: "red" };
export const TIPEURUT: Record<AssignmentType, number> = { lkpd: 0, latihan: 1, evaluasi: 2 };

/** Kategori kalender akademik + warna badge-nya. */
export const KATEGORI_AGENDA = ["UTS", "UAS", "Libur", "Hari Penting", "Kegiatan"] as const;
export function kategoriTone(k?: string): "red" | "purple" | "green" | "amber" | "blue" {
  if (k === "UTS") return "red";
  if (k === "UAS") return "purple";
  if (k === "Libur") return "green";
  if (k === "Hari Penting") return "amber";
  return "blue";
}
