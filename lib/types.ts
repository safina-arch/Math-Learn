export type Role = "siswa" | "guru" | "admin";

export interface User {
  id: string;
  nama: string;
  email: string;
  role: Role;
  kelas: string;
}

export interface MaterialAttachment {
  url: string;
  name: string;
  size?: number;
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
}

export interface Assignment {
  id: string;
  tipe: AssignmentType;
  judul: string;
  deskripsi: string;
  kelas: string;
  durasiMenit: number | null;
  bukaAt: string | null;
  tutupAt: string | null;
  acakSoal: boolean;
  kunciTab: boolean;
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
  tipe: "blur" | "visibility";
  soal?: number;
}

export interface AcademicEvent {
  id: string;
  judul: string;
  tanggal: string;
  deskripsi: string;
}
