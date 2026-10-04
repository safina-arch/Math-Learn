import type { LkpdMission, LkpdProgress, LkpdSubtopic, LkpdTopic } from "./types";
import { uid } from "./utils";

/** Lima tahap pembelajaran default — dipakai sebagai template mission baru. */
export const LKPD_TAHAP = [
  { key: "mengamati", judul: "Mengamati", ikon: "👀", desc: "Mengamati fenomena sebelum definisi atau rumus diberikan." },
  { key: "menanya", judul: "Menanya", ikon: "❓", desc: "Membangun pertanyaan dari apa yang diamati." },
  { key: "mengumpulkan", judul: "Mengumpulkan Informasi", ikon: "🔎", desc: "Mengumpulkan data lewat aktivitas interaktif." },
  { key: "menalar", judul: "Menalar", ikon: "🧠", desc: "Menganalisis dan menemukan pola — konsep formal menyusul." },
  { key: "mengomunikasikan", judul: "Mengomunikasikan & Mengevaluasi", ikon: "💬", desc: "Menjelaskan strategi, mengevaluasi, dan refleksi." },
] as const;

/** Mission baru dari template tahap (atau tahap kustom bila melebihi 5). */
export function missionBaru(index: number): LkpdMission {
  const tahap = LKPD_TAHAP[index];
  return {
    id: uid("ms"),
    judul: tahap?.judul || `Mission ${index + 1}`,
    ikon: tahap?.ikon || "✏️",
    deskripsi: tahap?.desc || "",
    blok: [],
  };
}

export function cariProgress(list: LkpdProgress[], siswaId: string | undefined, subtopicId: string): LkpdProgress | null {
  if (!siswaId) return null;
  return list.find((p) => p.siswaId === siswaId && p.subtopicId === subtopicId) || null;
}

export interface RingkasProgres {
  selesai: number;
  total: number;
  persen: number;
  status: "kosong" | "jalan" | "selesai";
}

export function progresSubtopic(sub: LkpdSubtopic | undefined, p: LkpdProgress | null): RingkasProgres {
  const total = sub?.missions.length || 0;
  const selesai = p ? p.missions.filter((id) => sub?.missions.some((m) => m.id === id)).length : 0;
  const persen = total ? Math.round((selesai / total) * 100) : 0;
  const status: RingkasProgres["status"] = total === 0 || selesai === 0 ? "kosong" : selesai >= total ? "selesai" : "jalan";
  return { selesai, total, persen, status };
}

/**
 * Nilai per sub-bab — TIDAK menunggu seluruh materi selesai:
 * nilai tersimpan (`p.nilai`, ikut naik tiap mission ditandai) dan bila belum tersimpan
 * (data lama) dipakai persentase penyelesaian. `null` = belum ada mission dikerjakan.
 */
export function nilaiSubtopic(sub: LkpdSubtopic | undefined, p: LkpdProgress | null): number | null {
  if (!p) return null;
  const r = progresSubtopic(sub, p);
  if (r.selesai === 0) return p.nilai ?? null;
  return p.nilai ?? r.persen;
}

/** Progres satu topik = rata-rata progres seluruh submaterinya. */
export function progresTopik(topik: LkpdTopic, list: LkpdProgress[], siswaId: string | undefined): RingkasProgres {
  const subs = topik.subtopics;
  const total = subs.reduce((n, s) => n + s.missions.length, 0);
  const selesai = subs.reduce((n, s) => n + progresSubtopic(s, cariProgress(list, siswaId, s.id)).selesai, 0);
  const persen = total ? Math.round((selesai / total) * 100) : 0;
  const status: RingkasProgres["status"] = total === 0 || selesai === 0 ? "kosong" : selesai >= total ? "selesai" : "jalan";
  return { selesai, total, persen, status };
}

/** Label tombol kartu: Mulai / Lanjutkan / Lihat. */
export function ctaProgres(status: RingkasProgres["status"]): string {
  if (status === "selesai") return "Lihat";
  if (status === "jalan") return "Lanjutkan";
  return "Mulai";
}

export const LKPD_STATUS_TONE: Record<RingkasProgres["status"], "gray" | "amber" | "green"> = {
  kosong: "gray",
  jalan: "amber",
  selesai: "green",
};

export const LKPD_STATUS_LABEL: Record<RingkasProgres["status"], string> = {
  kosong: "Belum dimulai",
  jalan: "Sedang dipelajari",
  selesai: "Selesai",
};

/** Indikator per mission: ✓ selesai · ◐ sedang berjalan · ○ belum. */
export function indikatorMission(id: string, p: LkpdProgress | null): "selesai" | "jalan" | "belum" {
  if (p?.missions.includes(id)) return "selesai";
  return "belum";
}
