import type { LkpdBlock, LkpdMission, LkpdProgress, LkpdSubtopic, LkpdTopic } from "./types";
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
 * Nilai per sub-bab — TIDAK menunggu seluruh materi selesai dan TIDAK pernah
 * diambil dari persentase penyelesaian. Urutan sumber nilai:
 *  1. nilai buatan guru (`nilaiGuru`) bila ada;
 *  2. hasil hitungan `nilaiKerja()` (benar/salah jawaban terukur);
 *  3. `p.nilai` tersimpan untuk data sangat lama tanpa blok terukur.
 * `null` = belum dinilai / menunggu pemeriksaan guru.
 */
export function nilaiSubtopic(sub: LkpdSubtopic | undefined, p: LkpdProgress | null): number | null {
  if (!p) return null;
  if (p.nilaiGuru != null) return p.nilaiGuru;
  const k = nilaiKerja(sub, p);
  if (k.nilai != null) return k.nilai;
  return p.nilai ?? null;
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

/* ————————————————————————————————————————————————
   PENILAIAN LKPD — satu-satunya sumber benar/salah.
   Sebelumnya nilai = persentase mission ditandai selesai, sehingga jawaban
   salah pun bisa menghasilkan nilai 100. Kini nilai dihitung dari benar/salah
   jawaban yang benar-benar bisa dinilai sistem; jawaban terbuka (essay/refleksi)
   tidak pernah dianggap benar — statusnya "menunggu pemeriksaan guru".
   ———————————————————————————————————————————————— */

/** Perbandingan isi sel terhadap kunci (ketat: tanpa kunci tidak bisa "benar"). */
export function selSama(v: string | undefined, kunci: string | undefined): boolean {
  const nilai = (v || "").trim();
  const acuan = (kunci || "").trim();
  if (!acuan) return false; // tanpa kunci → sistem tidak boleh menyatakan benar
  if (!nilai) return false;
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ");
  if (norm(nilai) === norm(acuan)) return true;
  // Hanya bandingkan sebagai angka bila keduanya benar-benar berupa angka
  // ("10.000" ≈ "10000" ok; "10 ribu" ≠ "10").
  const angka = (s: string) => (/^[\d.,%-]+$/.test(s) ? Number(s.replace(/[^\d]/g, "")) : NaN);
  const a = angka(nilai);
  const b = angka(acuan);
  return !Number.isNaN(a) && !Number.isNaN(b) && a === b;
}

type StateAktivitas = {
  diArea?: string[];
  pasang?: Record<string, string>;
  val?: Record<string, string>;
  dicek?: boolean;
};

function parseAktivitas(teks?: string): StateAktivitas | null {
  if (!teks) return null;
  try {
    const o: unknown = JSON.parse(teks);
    return o && typeof o === "object" ? (o as StateAktivitas) : null;
  } catch {
    return null;
  }
}

/**
 * Benar/salah satu blok. `null` = bukan wewenang sistem
 * (aktivitas seret-slot tidak punya data benar/salah, jadi tidak dinilai otomatis).
 */
export function nilaiBlok(blok: LkpdBlock, jawaban?: string): boolean | null {
  if (blok.tipe === "pertanyaan") {
    const q = blok.pertanyaan;
    if (!q || q.opsi.length === 0) return null;
    const n = Number(jawaban);
    if (jawaban == null || jawaban === "" || !Number.isInteger(n) || n < 0 || n >= q.opsi.length) return false;
    return Boolean(q.opsi[n]?.benar);
  }
  if (blok.tipe !== "aktivitas" || !blok.aktivitas) return null;
  const a = blok.aktivitas;
  const st = parseAktivitas(jawaban);
  if (a.tipe === "isi-tabel") {
    const kunciSel = (a.baris || []).flatMap((r) => r.sel).filter((s) => (s.kunci || "").trim() !== "");
    if (!kunciSel.length) return null;
    const val = st?.val || {};
    // Semua sel berkunci harus terisi dan sesuai kunci.
    const isi = (a.baris || []).flatMap((r, ri) => r.sel.map((s, ci) => ({ s, v: val[`${ri}-${ci}`] }))).filter((x) => (x.s.kunci || "").trim() !== "");
    if (isi.some((x) => !(x.v || "").trim())) return false;
    return isi.every((x) => selSama(x.v, x.s.kunci));
  }
  if (a.tipe === "cocokkan") {
    const kiri = a.kiri || [];
    const pasangan = a.pasangan || {};
    if (!kiri.length) return null;
    const pasang = st?.pasang || {};
    if (kiri.some((k) => !pasang[k.id])) return false; // belum semua terpasang
    return kiri.every((k) => pasang[k.id] === pasangan[k.id]);
  }
  return null; // seret-slot: proses menemukan pola, bukan jawaban benar/salah
}

/** Blok terbuka (essay/refleksi) — jawabannya tidak bisa dinilai otomatis dengan aman. */
export function blokTerbuka(blok: LkpdBlock): boolean {
  return blok.tipe === "essay" || blok.tipe === "refleksi";
}

/**
 * Nilai kerja satu sub-bab dari mission yang sudah ditandai selesai.
 * `nilai` null = tidak ada blok terukur sama sekali → semuanya menunggu guru.
 */
export function nilaiKerja(
  sub: LkpdSubtopic | undefined,
  p: LkpdProgress | null,
): { nilai: number | null; uji: number; benar: number; terbuka: number; kurang: string[] } {
  let uji = 0;
  let benar = 0;
  let terbuka = 0;
  const kurang: string[] = [];
  if (!sub || !p) return { nilai: null, uji: 0, benar: 0, terbuka: 0, kurang };
  for (const m of sub.missions) {
    if (!p.missions.includes(m.id)) continue;
    for (const b of m.blok) {
      const jwb = p.jawaban[b.id];
      if (blokTerbuka(b)) {
        terbuka += 1;
        if (!(jwb || "").trim()) kurang.push(`${m.judul} · ${b.judul || "jawaban terbuka"}`);
        continue;
      }
      const hasil = nilaiBlok(b, jwb);
      if (hasil === null) continue;
      uji += 1;
      if (hasil) benar += 1;
      else kurang.push(`${m.judul} · ${b.judul || "jawaban"}`);
    }
  }
  return { nilai: uji ? Math.round((benar / uji) * 100) : null, uji, benar, terbuka, kurang };
}

/**
 * Syarat sebuah mission boleh ditandai selesai: seluruh blok yang mengharuskan
 * jawaban sudah diisi. `kurang` berisi daftar judul yang belum terjawab.
 */
export function missionTerjawab(
  mission: LkpdMission | undefined,
  jawaban: Record<string, string>,
): { boleh: boolean; kurang: string[] } {
  const kurang: string[] = [];
  if (!mission) return { boleh: false, kurang: ["Mission tidak ditemukan"] };
  for (const b of mission.blok) {
    const jwb = jawaban[b.id];
    const teks = (jwb || "").trim();
    if (b.tipe === "pertanyaan") {
      const n = Number(jwb);
      if (!teks || !Number.isInteger(n) || !b.pertanyaan?.opsi[n]) kurang.push(b.judul || "Pertanyaan");
      continue;
    }
    if (b.tipe === "essay" || b.tipe === "refleksi") {
      if (!teks) kurang.push(b.judul || (b.tipe === "essay" ? "Essay" : "Refleksi"));
      continue;
    }
    if (b.tipe !== "aktivitas" || !b.aktivitas) continue;
    const a = b.aktivitas;
    const st = parseAktivitas(jwb);
    if (a.tipe === "isi-tabel") {
      const val = st?.val || {};
      const ada = (a.baris || []).some((r, ri) => r.sel.some((s, ci) => (s.kunci || "").trim() !== "" && (val[`${ri}-${ci}`] || "").trim()));
      const lengkap = (a.baris || []).every((r, ri) =>
        r.sel.every((s, ci) => (s.kunci || "").trim() === "" || (val[`${ri}-${ci}`] || "").trim() !== ""),
      );
      if (!ada || !lengkap) kurang.push(b.judul || "Aktivitas tabel");
      continue;
    }
    if (a.tipe === "cocokkan") {
      const kiri = a.kiri || [];
      const pasang = st?.pasang || {};
      if (!kiri.length || kiri.some((k) => !pasang[k.id])) kurang.push(b.judul || "Aktivitas cocokkan");
      continue;
    }
    // seret-slot
    const kartu = a.kartu || [];
    const di = st?.diArea || [];
    if (!kartu.length || kartu.some((k) => !di.includes(k.id))) kurang.push(b.judul || "Aktivitas seret");
  }
  return { boleh: kurang.length === 0, kurang };
}
