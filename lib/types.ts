export type Role = "siswa" | "guru" | "admin";

export interface User {
  id: string;
  nama: string;
  email: string;
  role: Role;
  kelas: string;
  /** Nomor induk siswa — diisi manual oleh admin. */
  nisn?: string;
  /** Tempat, tanggal lahir — format "Bandung, 2011-08-12". */
  ttl?: string;
  /** URL foto profil hasil unggahan. */
  fotoProfil?: string;
}

export interface MaterialAttachment {
  url: string;
  name: string;
  size?: number;
  /** "link" = tautan eksternal (bukan file unggahan). Data lama tanpa tipe dianggap file. */
  tipe?: "file" | "link";
}

export interface Material {
  id: string;
  judul: string;
  kelas: string;
  ringkasan: string;
  konten: string;
  videoUrl?: string;
  /** Lampiran baru; fileUrl/fileName dipertahankan untuk data lama. */
  attachments?: MaterialAttachment[];
  fileUrl?: string;
  fileName?: string;
  createdBy: string;
  createdAt: string;
}

export type AssignmentType = "lkpd" | "latihan" | "evaluasi";
export type QuestionType = "pg" | "uraian" | "essay";

export interface Question {
  id: string;
  tipe: QuestionType;
  teks: string;
  opsi?: string[];
  kunci?: string;
  rubrik?: string;
  bobot: number;
  /** Foto/gambar soal yang ditambahkan guru. */
  gambar?: MaterialAttachment[];
}

export interface Assignment {
  id: string;
  tipe: AssignmentType;
  judul: string;
  deskripsi: string;
  /** Foto instruksi/gambar pendukung pada deskripsi. */
  deskripsiGambar?: MaterialAttachment[];
  kelas: string;
  durasiMenit: number | null;
  bukaAt: string | null;
  tutupAt: string | null;
  acakSoal: boolean;
  kunciTab: boolean;
  /** Dikunci admin: siswa tidak bisa mengerjakan evaluasi sampai dibuka lagi. */
  terkunci?: boolean;
  createdBy: string;
  questions: Question[];
}

export interface Submission {
  id: string;
  assignmentId: string;
  siswaId: string;
  siswaNama: string;
  kelas: string;
  jawaban: Record<string, string>;
  /** Foto jawaban yang terkait dengan setiap soal. */
  jawabanLampiran?: Record<string, MaterialAttachment[]>;
  /** Rotasi tampilan foto (derajat) per URL — dikontrol guru saat memeriksa. */
  fotoRotasi?: Record<string, number>;
  nilai: number | null;
  feedbackAi: Record<string, { skor: number; feedback: string; draft: boolean }>;
  feedbackGuru: string;
  status: "dinilai" | "menunggu" | "draf-ai";
  submittedAt: string;
  cheatCount: number;
}

export interface Announcement {
  id: string;
  judul: string;
  isi: string;
  targetKelas: string;
  createdBy: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string | "all-guru" | "all-siswa" | "all";
  kategori: string;
  judul: string;
  isi: string;
  dibaca: boolean;
  createdAt: string;
}

export interface CheatLog {
  id: string;
  evaluationId: string;
  siswaId: string;
  siswaNama: string;
  timestamp: string;
  /** "blur"/"visibility" = pelanggaran; "foto" = menambahkan foto (bukan kecurangan); "navigasi" = pindah menu/sidebar. */
  tipe: "blur" | "visibility" | "foto" | "navigasi";
  soal?: number;
  /** Menit ke-N sejak evaluasi dimulai. */
  menit?: number;
}

export interface AcademicEvent {
  id: string;
  judul: string;
  /** YYYY-MM-DD untuk agenda; kosong ("") untuk jadwal pelajaran. */
  tanggal: string;
  deskripsi: string;
  /** "agenda" (kalender akademik) atau "jadwal" (jadwal pelajaran mingguan). Data lama tanpa jenis dianggap agenda. */
  jenis?: "agenda" | "jadwal";
  /** Hanya untuk jadwal: hari (Senin–Minggu). */
  hari?: string;
  /** Hanya untuk jadwal: jam mulai–selesai (HH:MM). */
  jamMulai?: string;
  jamSelesai?: string;
  /** Kategori agenda: UTS | UAS | Libur | Hari Penting | Kegiatan. */
  kategori?: string;
  /** Hanya untuk jadwal: kelas tujuan (cth. "VIII-A"). */
  kelas?: string;
}

export interface Presence {
  userId: string;
  nama: string;
  role: Role;
  /** ISO timestamp heartbeat terakhir. */
  lastSeen: string;
}

/* ————————————————————————————————————————————————
   LKPD — sistem lembar kerja berbasis misi (data-driven, lintas materi).
   Hierarki: Topik (materi) → Submateri → Mission → Content Block.
   Perbandingan hanyalah salah satu topik awal; materi lain cukup ditambahkan
   sebagai data tanpa mengubah sistem.
   ———————————————————————————————————————————————— */

export type LkpdBlockTipe =
  | "teks"
  | "gambar"
  | "video"
  | "animasi"
  | "berkas"
  | "pertanyaan"
  | "essay"
  | "aktivitas"
  | "petunjuk"
  | "refleksi";

/**
 * Taksonomi Bloom revisi — dipakai menandai level berpikir tiap blok/soal LKPD
 * (C1 Mengingat … C6 Mencipta) supaya penyusunan aktivitas berbasis proses
 * berpikir, bukan sekadar soal pilihan ganda.
 */
export type LkpdBloom = "C1" | "C2" | "C3" | "C4" | "C5" | "C6";

export const BLOOM_LABEL: Record<LkpdBloom, string> = {
  C1: "C1 · Mengingat",
  C2: "C2 · Memahami",
  C3: "C3 · Menerapkan",
  C4: "C4 · Menganalisis",
  C5: "C5 · Mengevaluasi",
  C6: "C6 · Mencipta",
};

export interface LkpdOpsi {
  teks: string;
  benar: boolean;
  /** Feedback edukatif saat opsi dipilih — bukan sekadar "benar/salah". */
  feedback: string;
}

export interface LkpdPertanyaan {
  teks: string;
  opsi: LkpdOpsi[];
  /** Petunjuk progresif — muncul satu per satu saat siswa meminta bantuan. */
  petunjuk?: string[];
  feedbackBenar?: string;
}

/** Aktivitas interaktif Mission 3 (mengumpulkan informasi) & 4 (menalar). */
export type LkpdAktivitasTipe = "seret-slot" | "cocokkan" | "isi-tabel";

export interface LkpdAktivitas {
  tipe: LkpdAktivitasTipe;
  instruksi: string;
  /** seret-slot: kartu yang diseret ke area → memunculkan hasil (menemukan pola). */
  area?: string;
  kartu?: { id: string; label: string; hasil: string; feedback?: string }[];
  /** Ditampilkan setelah seluruh kartu ditempatkan. */
  temuan?: string;
  /** cocokkan: pasangkan kolom kiri dengan kolom kanan. */
  kiri?: { id: string; label: string }[];
  kanan?: { id: string; label: string }[];
  pasangan?: Record<string, string>;
  feedbackSalah?: string;
  /** isi-tabel: siswa mengisi sel kosong (kunci) — menemukan pola lewat angka. */
  kolom?: string[];
  baris?: { sel: LkpdSel[] }[];
}

/** Sel tabel: `teks` = terisi (fakta), `kunci` = diisi siswa lalu diperiksa. */
export interface LkpdSel {
  teks?: string;
  kunci?: string;
  feedbackBenar?: string;
  feedbackSalah?: string;
}

export interface LkpdBlock {
  id: string;
  tipe: LkpdBlockTipe;
  judul?: string;
  teks?: string;
  /** URL media (opsional — kosong = placeholder ramah-prototype). */
  url?: string;
  namaBerkas?: string;
  pertanyaan?: LkpdPertanyaan;
  aktivitas?: LkpdAktivitas;
  /** Level Taksonomi Bloom revisi untuk blok ini (opsional, tampil sebagai penanda). */
  bloom?: LkpdBloom;
  /** Rubrik penilaian untuk blok terbuka (essay/refleksi) — panduan guru menilai. */
  rubrik?: string;
}

export interface LkpdMission {
  id: string;
  judul: string;
  /** Ikon emoji tahapan (👀 ❓ 🔎 🧠 💬). */
  ikon?: string;
  deskripsi?: string;
  blok: LkpdBlock[];
}

export interface LkpdSubtopic {
  id: string;
  judul: string;
  deskripsi?: string;
  missions: LkpdMission[];
}

export interface LkpdTopic {
  id: string;
  judul: string;
  deskripsi: string;
  /** Emoji ikon kartu (mis. ⚖️ 📐 🧮). */
  ikon: string;
  /** URL thumbnail opsional. */
  thumbnail?: string;
  /**
   * Kunci/pembahasan boleh tampil ke siswa HANYA bila guru/admin mengaktifkan ini
   * (default mati: siswa tidak langsung melihat jawaban benar).
   */
  kunciTerbuka?: boolean;
  subtopics: LkpdSubtopic[];
}

/** Progres pengerjaan LKPD per siswa per submateri (persist ke localStorage + sinkron). */
export interface LkpdProgress {
  siswaId: string;
  subtopicId: string;
  /** Id mission yang sudah ditandai selesai. */
  missions: string[];
  /** Jawaban per blockId (refleksi/essay = teks; aktivitas/pertanyaan = JSON) — bertahan saat siswa bolak-balik. */
  jawaban: Record<string, string>;
  /** Foto jawaban per kunci (missionId) — jawaban tulisan tangan/proses pengerjaan siswa. */
  lampiran?: Record<string, MaterialAttachment[]>;
  /** Nilai hasil pengerjaan (0–100) — dihitung dari benar/salah jawaban terukur. */
  nilai?: number;
  /** Nilai buatan guru (hasil pemeriksaan) — menang atas nilai hitungan sistem. */
  nilaiGuru?: number;
  /**
   * Sudah disubmit/difinalisasi siswa → LKPD terkunci: tidak bisa dikerjakan ulang
   * dan jawaban tidak bisa diubah lagi. Data pengerjaan pertama tetap tersimpan.
   */
  dikumpulkan?: boolean;
  /** Komentar/feedback guru atas hasil pemeriksaan — dilihat siswa. */
  feedbackGuru?: string;
  /** Waktu guru menyelesaikan pemeriksaan (kosong bila belum). */
  diperiksaPada?: string;
  /** Ada jawaban terbuka (essay/refleksi) yang belum bisa dinilai otomatis → menunggu guru. */
  menungguPemeriksaan?: boolean;
  /** Tandai verifikasi guru/admin atas nilai LKPD (= sudah diperiksa). */
  verifikasi?: boolean;
  updatedAt: string;
}
