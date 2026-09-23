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
  /** "blur"/"visibility" = pelanggaran; "foto" = menambahkan foto (bukan kecurangan). */
  tipe: "blur" | "visibility" | "foto";
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
