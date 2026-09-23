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

export function pgCorrect(answer: string, kunci: string | undefined): boolean {
  return normalize(answer) === normalize(kunci || "");
}

/** Fallback AI heuristic: nilai 0-100 per soal + feedback 1-2 kalimat. */
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
  if (k && a === k) return { skor: 100, feedback: "Tepat dan sesuai kunci. Pertahankan cara pengerjaanmu yang rapi." };
  const keyTokens = new Set(k.split(/[^a-z0-9]+/).filter((t) => t.length > 1));
  const ansTokens = new Set(a.split(/[^a-z0-9]+/).filter((t) => t.length > 1));
  let hit = 0;
  keyTokens.forEach((t) => {
    if (ansTokens.has(t)) hit += 1;
  });
  const recall = keyTokens.size ? hit / keyTokens.size : 0;
  const lengthBonus = Math.min(1, a.length / 60) * 0.15;
  const raw = Math.round(Math.min(95, recall * 90 + lengthBonus * 100));
  const skor = Math.max(10, raw);
  const fb =
    skor >= 75
      ? "Sudah mendekati kunci. Periksa kembali hitungan akhirmu agar sempurna."
      : skor >= 45
        ? "Ada bagian yang benar. Lengkapi langkah dan samakan dengan rubrik yang diminta."
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
  if (tipe === "visibility") return "Pindah laman";
  return "Keluar fokus";
}

export function cheatTone(tipe: string): "red" | "blue" {
  return tipe === "foto" ? "blue" : "red";
}

/** Status tugas siswa dari kacamata guru & admin. */
export type StatusTugas = "belum" | "belum-diperiksa" | "sudah";
export const STATUS_TUGAS_META: Record<StatusTugas, { label: string; tone: "gray" | "amber" | "green" }> = {
  belum: { label: "Belum mengerjakan", tone: "gray" },
  "belum-diperiksa": { label: "Belum diperiksa", tone: "amber" },
  sudah: { label: "Sudah diperiksa", tone: "green" },
};
export function statusTugas(sub?: { status: string } | null): StatusTugas {
  if (!sub) return "belum";
  return sub.status === "dinilai" ? "sudah" : "belum-diperiksa";
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
      if (s.status === "dinilai") sudah += 1;
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
